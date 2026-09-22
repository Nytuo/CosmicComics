//! Books of a Jellyfin server kept on the device for offline reading.
//!
//! Unlike the reading cache (`jellyfin_cache/books`, a few recently opened
//! books evicted automatically), offline books are kept until the user removes
//! them. Each one lives in `jellyfin/offline/<server>/<item>/` next to its
//! cover and a `book.json` that keeps the item metadata and the reading
//! changes made while the server was unreachable, replayed by [`flush`].

use crate::services::jellyfin_service::{
    detect_format, JellyfinClient, JellyfinError, JellyfinItem, ProgressFn, Result,
    BOOK_FINISHED_FRACTION, KNOWN_BOOK_EXTENSIONS,
};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tracing::{info, warn};

const BOOK_JSON: &str = "book.json";
const COVER_FILE: &str = "cover.img";
const COVER_TYPE_FILE: &str = "cover.type";

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct OfflineContext {
    #[serde(default)]
    pub library_id: String,
    #[serde(default)]
    pub library_name: String,
    #[serde(default)]
    pub series_id: Option<String>,
    #[serde(default)]
    pub series_name: Option<String>,
}

/// A reading change made while the server could not be reached.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum PendingChange {
    Page { page: i64, page_count: i64 },
    Fraction { fraction: f64 },
    Played { played: bool },
    Favorite { favorite: bool },
}

impl PendingChange {
    fn slot(&self) -> u8 {
        match self {
            Self::Page { .. } | Self::Fraction { .. } => 0,
            Self::Played { .. } => 1,
            Self::Favorite { .. } => 2,
        }
    }

    /// Mirrors what the server does with the change, so the offline copy shows
    /// the same state the server will once the change is replayed.
    fn apply(&self, item: &mut JellyfinItem) {
        match *self {
            Self::Page { page, page_count } => {
                if page_count > 0 && page >= page_count - 1 {
                    item.played = true;
                    item.resume_page = 0;
                } else {
                    item.resume_page = page.max(0);
                }
            }
            Self::Fraction { fraction } => {
                if fraction >= BOOK_FINISHED_FRACTION {
                    item.played = true;
                    item.resume_fraction = 0.0;
                } else {
                    item.resume_fraction = fraction.clamp(0.0, 1.0);
                }
            }
            Self::Played { played } => {
                item.played = played;
                item.resume_page = 0;
                item.resume_fraction = 0.0;
            }
            Self::Favorite { favorite } => item.favorite = favorite,
        }
        item.last_played = Some(chrono::Utc::now().to_rfc3339());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Stored {
    item: JellyfinItem,
    #[serde(default)]
    context: OfflineContext,
    file: String,
    format: String,
    #[serde(default)]
    stamp: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    downloaded_at: i64,
    #[serde(default)]
    pending: Vec<PendingChange>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct OfflineBook {
    pub server_id: String,
    pub item: JellyfinItem,
    pub context: OfflineContext,
    pub path: String,
    pub format: String,
    pub size: u64,
    pub downloaded_at: i64,
    pub has_cover: bool,
    pub pending: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct OfflineProgress {
    pub item_id: String,
    pub title: String,
    pub index: usize,
    pub count: usize,
    pub written: u64,
    pub total: Option<u64>,
}

pub type OfflineProgressFn = Arc<dyn Fn(OfflineProgress) + Send + Sync>;

pub fn root(base_path: &str) -> PathBuf {
    PathBuf::from(base_path).join("jellyfin").join("offline")
}

fn safe(id: &str) -> Result<&str> {
    if !id.is_empty()
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        Ok(id)
    } else {
        Err(JellyfinError::Invalid("Invalid id".into()))
    }
}

fn book_dir(base_path: &str, server_id: &str, item_id: &str) -> Result<PathBuf> {
    Ok(root(base_path).join(safe(server_id)?).join(safe(item_id)?))
}

fn read_stored(dir: &Path) -> Option<Stored> {
    serde_json::from_slice(&std::fs::read(dir.join(BOOK_JSON)).ok()?).ok()
}

fn write_stored(dir: &Path, stored: &Stored) -> Result<()> {
    let tmp = dir.join(format!("{BOOK_JSON}.tmp"));
    std::fs::write(
        &tmp,
        serde_json::to_vec_pretty(stored).map_err(|e| JellyfinError::Io(e.to_string()))?,
    )?;
    std::fs::rename(tmp, dir.join(BOOK_JSON))?;
    Ok(())
}

fn to_book(server_id: &str, dir: &Path, stored: Stored) -> Option<OfflineBook> {
    let file = dir.join(&stored.file);
    if !file.is_file() {
        return None;
    }
    Some(OfflineBook {
        server_id: server_id.to_string(),
        path: file.to_string_lossy().to_string(),
        has_cover: dir.join(COVER_FILE).is_file(),
        pending: stored.pending.len(),
        item: stored.item,
        context: stored.context,
        format: stored.format,
        size: stored.size,
        downloaded_at: stored.downloaded_at,
    })
}

pub fn get(base_path: &str, server_id: &str, item_id: &str) -> Option<OfflineBook> {
    let dir = book_dir(base_path, server_id, item_id).ok()?;
    to_book(server_id, &dir, read_stored(&dir)?)
}

pub fn list(base_path: &str) -> Vec<OfflineBook> {
    let mut out = Vec::new();
    let Ok(servers) = std::fs::read_dir(root(base_path)) else {
        return out;
    };
    for server in servers.flatten().filter(|e| e.path().is_dir()) {
        let server_id = server.file_name().to_string_lossy().to_string();
        let Ok(books) = std::fs::read_dir(server.path()) else {
            continue;
        };
        for dir in books.flatten().map(|e| e.path()).filter(|p| p.is_dir()) {
            if let Some(book) = read_stored(&dir).and_then(|s| to_book(&server_id, &dir, s)) {
                out.push(book);
            }
        }
    }
    out.sort_by(|a, b| a.item.name.cmp(&b.item.name));
    out
}

pub fn remove(base_path: &str, server_id: &str, item_id: Option<&str>) -> Result<()> {
    let target = match item_id {
        Some(item) => book_dir(base_path, server_id, item)?,
        None => root(base_path).join(safe(server_id)?),
    };
    if target.exists() {
        std::fs::remove_dir_all(target)?;
    }
    Ok(())
}

/// Cover saved with an offline book, or with any offline book of a series
/// when `item_id` is a series folder.
pub fn cover(base_path: &str, server_id: &str, item_id: &str) -> Option<(Vec<u8>, String)> {
    let read = |dir: &Path| -> Option<(Vec<u8>, String)> {
        let bytes = std::fs::read(dir.join(COVER_FILE)).ok()?;
        let kind = std::fs::read_to_string(dir.join(COVER_TYPE_FILE))
            .unwrap_or_else(|_| "image/jpeg".into());
        (!bytes.is_empty()).then_some((bytes, kind))
    };
    if let Ok(dir) = book_dir(base_path, server_id, item_id) {
        if let Some(found) = read(&dir) {
            return Some(found);
        }
    }
    list(base_path)
        .into_iter()
        .filter(|b| b.server_id == server_id && b.context.series_id.as_deref() == Some(item_id))
        .find_map(|b| read(Path::new(&b.path).parent()?))
}

fn stamp_of(item: &JellyfinItem) -> String {
    format!(
        "{}:{}",
        item.etag.clone().unwrap_or_default(),
        item.size.unwrap_or_default()
    )
}

async fn download_one(
    client: &JellyfinClient,
    base_path: &str,
    server_id: &str,
    item: &JellyfinItem,
    context: &OfflineContext,
    on_progress: &ProgressFn,
) -> Result<OfflineBook> {
    let dir = book_dir(base_path, server_id, &item.id)?;
    let stamp = stamp_of(item);
    if let Some(stored) = read_stored(&dir) {
        if stored.stamp == stamp && dir.join(&stored.file).is_file() {
            let mut stored = stored;
            stored.context = context.clone();
            write_stored(&dir, &stored)?;
            return to_book(server_id, &dir, stored)
                .ok_or_else(|| JellyfinError::Io("offline book vanished".into()));
        }
    }
    if item
        .format
        .as_deref()
        .is_some_and(|f| !KNOWN_BOOK_EXTENSIONS.contains(&f.to_ascii_lowercase().as_str()))
    {
        return Err(JellyfinError::Invalid(format!(
            "'{}' ({}) cannot be read",
            item.name,
            item.format.clone().unwrap_or_default().to_uppercase()
        )));
    }

    std::fs::create_dir_all(&dir)?;
    let part = dir.join("book.part");
    let size = match client.download(&item.id, &part, on_progress).await {
        Ok(size) => size,
        Err(e) => {
            let _ = std::fs::remove_file(&part);
            return Err(match e {
                JellyfinError::NotFound => JellyfinError::Invalid(format!(
                    "The server has no file to download for '{}'",
                    item.name
                )),
                other => other,
            });
        }
    };
    let Some(format) = detect_format(&part, item.format.as_deref()) else {
        let _ = std::fs::remove_dir_all(&dir);
        return Err(JellyfinError::Invalid(format!(
            "'{}' is not a readable book",
            item.name
        )));
    };
    let file = format!("book.{format}");
    std::fs::rename(&part, dir.join(&file))?;

    match client.image(&item.id, item.image_tag.as_deref(), 600).await {
        Ok((bytes, kind)) => {
            let _ = std::fs::write(dir.join(COVER_FILE), bytes);
            let _ = std::fs::write(dir.join(COVER_TYPE_FILE), kind);
        }
        Err(e) => warn!("[jellyfin-offline] no cover for {}: {}", item.id, e),
    }

    let stored = Stored {
        item: item.clone(),
        context: context.clone(),
        file,
        format,
        stamp,
        size,
        downloaded_at: chrono::Utc::now().timestamp(),
        pending: Vec::new(),
    };
    write_stored(&dir, &stored)?;
    info!("[jellyfin-offline] kept {} ({} bytes)", item.name, size);
    to_book(server_id, &dir, stored).ok_or_else(|| JellyfinError::Io("download vanished".into()))
}

/// Downloads a book, or every book below a folder, for offline reading.
/// Books already kept with the same server version are not downloaded again.
pub async fn download(
    client: &JellyfinClient,
    base_path: &str,
    server_id: &str,
    item_id: &str,
    context: OfflineContext,
    on_progress: OfflineProgressFn,
) -> Result<Vec<OfflineBook>> {
    safe(server_id)?;
    let root_item = client.item(safe(item_id)?).await.map_err(|e| match e {
        JellyfinError::NotFound => {
            JellyfinError::Invalid(format!("The server does not know the item {item_id}"))
        }
        other => other,
    })?;
    let context = if root_item.is_book || context.series_id.is_some() {
        context
    } else {
        OfflineContext {
            series_id: Some(root_item.id.clone()),
            series_name: Some(root_item.name.clone()),
            ..context
        }
    };
    let books = client.books_under(&root_item).await.map_err(|e| match e {
        JellyfinError::NotFound => JellyfinError::Invalid(format!(
            "The server could not list the books of '{}'",
            root_item.name
        )),
        other => other,
    })?;
    if books.is_empty() {
        return Err(JellyfinError::Invalid(format!(
            "'{}' has no book to download",
            root_item.name
        )));
    }
    let count = books.len();
    let mut kept = Vec::with_capacity(count);
    let mut skipped: Option<String> = None;
    for (index, book) in books.iter().enumerate() {
        let report = on_progress.clone();
        let (id, title) = (book.id.clone(), book.name.clone());
        let progress: ProgressFn = Arc::new(move |written, total| {
            report(OfflineProgress {
                item_id: id.clone(),
                title: title.clone(),
                index,
                count,
                written,
                total,
            })
        });
        match download_one(client, base_path, server_id, book, &context, &progress).await {
            Ok(done) => kept.push(done),
            Err(JellyfinError::Invalid(reason)) if count > 1 => {
                warn!("[jellyfin-offline] skipped {}: {}", book.name, reason);
                skipped.get_or_insert(reason);
            }
            Err(e) => return Err(e),
        }
    }
    match skipped {
        Some(reason) if kept.is_empty() => Err(JellyfinError::Invalid(reason)),
        _ => Ok(kept),
    }
}

/// Updates the offline copy of an item with fresh server data, keeping the
/// reading state of changes not yet sent to the server.
pub fn refresh(base_path: &str, server_id: &str, fresh: &JellyfinItem) {
    let Ok(dir) = book_dir(base_path, server_id, &fresh.id) else {
        return;
    };
    let Some(mut stored) = read_stored(&dir) else {
        return;
    };
    let mut item = fresh.clone();
    for change in &stored.pending {
        change.apply(&mut item);
    }
    if item != stored.item {
        stored.item = item;
        let _ = write_stored(&dir, &stored);
    }
}

/// Applies a change to the offline copy. With `queue`, the change is also
/// kept to be sent to the server later. Returns false when the item is not
/// kept offline.
pub fn record(
    base_path: &str,
    server_id: &str,
    item_id: &str,
    change: PendingChange,
    queue: bool,
) -> bool {
    let Ok(dir) = book_dir(base_path, server_id, item_id) else {
        return false;
    };
    let Some(mut stored) = read_stored(&dir) else {
        return false;
    };
    change.apply(&mut stored.item);
    if queue {
        let slot = change.slot();
        stored.pending.retain(|c| c.slot() != slot);
        stored.pending.push(change);
    }
    write_stored(&dir, &stored).is_ok()
}

async fn send(client: &JellyfinClient, item_id: &str, change: &PendingChange) -> Result<()> {
    match *change {
        PendingChange::Page { page, page_count } => {
            client.report_progress(item_id, page, page_count).await
        }
        PendingChange::Fraction { fraction } => client.report_fraction(item_id, fraction).await,
        PendingChange::Played { played } => client.set_played(item_id, played).await,
        PendingChange::Favorite { favorite } => client.set_favorite(item_id, favorite).await,
    }
}

/// Sends the reading changes made offline to the server. Returns how many
/// changes were delivered.
pub async fn flush(client: &JellyfinClient, base_path: &str, server_id: &str) -> Result<usize> {
    let mut sent = 0;
    let Ok(entries) = std::fs::read_dir(root(base_path).join(safe(server_id)?)) else {
        return Ok(0);
    };
    for dir in entries.flatten().map(|e| e.path()).filter(|p| p.is_dir()) {
        let Some(mut stored) = read_stored(&dir) else {
            continue;
        };
        if stored.pending.is_empty() {
            continue;
        }
        let item_id = stored.item.id.clone();
        while let Some(change) = stored.pending.first().cloned() {
            match send(client, &item_id, &change).await {
                Ok(()) => {
                    stored.pending.remove(0);
                    sent += 1;
                }
                Err(JellyfinError::NotFound) => {
                    stored.pending.clear();
                }
                Err(e) => {
                    write_stored(&dir, &stored)?;
                    return Err(e);
                }
            }
        }
        write_stored(&dir, &stored)?;
    }
    if sent > 0 {
        info!(
            "[jellyfin-offline] sent {} offline change(s) to {}",
            sent, server_id
        );
    }
    Ok(sent)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn keep(base: &str, server: &str, item: JellyfinItem, series: Option<&str>) {
        let dir = book_dir(base, server, &item.id).unwrap();
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("book.cbz"), b"PK").unwrap();
        std::fs::write(dir.join(COVER_FILE), b"img").unwrap();
        write_stored(
            &dir,
            &Stored {
                item,
                context: OfflineContext {
                    series_id: series.map(str::to_string),
                    ..Default::default()
                },
                file: "book.cbz".into(),
                format: "cbz".into(),
                stamp: String::new(),
                size: 2,
                downloaded_at: 1,
                pending: vec![],
            },
        )
        .unwrap();
    }

    fn book(id: &str) -> JellyfinItem {
        JellyfinItem {
            id: id.into(),
            name: id.into(),
            is_book: true,
            ..Default::default()
        }
    }

    #[test]
    fn changes_are_applied_and_coalesced() {
        let tmp = tempfile::tempdir().unwrap();
        let base = tmp.path().to_str().unwrap();
        keep(base, "srv", book("b1"), Some("s1"));

        assert!(record(
            base,
            "srv",
            "b1",
            PendingChange::Page {
                page: 3,
                page_count: 20
            },
            true
        ));
        assert!(record(
            base,
            "srv",
            "b1",
            PendingChange::Page {
                page: 7,
                page_count: 20
            },
            true
        ));
        assert!(record(
            base,
            "srv",
            "b1",
            PendingChange::Favorite { favorite: true },
            true
        ));
        assert!(!record(
            base,
            "srv",
            "nope",
            PendingChange::Played { played: true },
            true
        ));

        let kept = get(base, "srv", "b1").unwrap();
        assert_eq!(kept.item.resume_page, 7);
        assert!(kept.item.favorite);
        assert_eq!(kept.pending, 2, "the second page change replaces the first");

        let mut fresh = book("b1");
        fresh.name = "Renamed".into();
        refresh(base, "srv", &fresh);
        let kept = get(base, "srv", "b1").unwrap();
        assert_eq!(kept.item.name, "Renamed");
        assert_eq!(
            kept.item.resume_page, 7,
            "pending changes survive a refresh"
        );
    }

    #[test]
    fn series_cover_falls_back_to_a_kept_book() {
        let tmp = tempfile::tempdir().unwrap();
        let base = tmp.path().to_str().unwrap();
        keep(base, "srv", book("b1"), Some("series-1"));
        assert!(cover(base, "srv", "b1").is_some());
        assert!(cover(base, "srv", "series-1").is_some());
        assert!(cover(base, "srv", "other").is_none());

        assert_eq!(list(base).len(), 1);
        remove(base, "srv", None).unwrap();
        assert!(list(base).is_empty());
        assert!(remove(base, "../x", None).is_err());
    }
}

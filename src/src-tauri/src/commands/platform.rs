use crate::commands::state::AppState;
use crate::services::comic_archive::ArchiveKind;
use crate::utils::VALID_BOOK_EXTENSION;
use serde::Serialize;
use std::fs::File;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tauri_plugin_fs::{FilePath, FsExt, OpenOptions};
use tracing::{error, info, warn};

#[derive(Debug, Serialize)]
pub struct PlatformCapabilities {
    pub platform: &'static str,
    pub mobile: bool,
    pub ai: bool,
    pub downloaders: bool,
    pub pdf: bool,
    pub documents: bool,
    pub updater: bool,
    pub local_import: bool,
    pub extensions: Vec<&'static str>,
}

fn platform_name() -> &'static str {
    if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else {
        std::env::consts::OS
    }
}

#[tauri::command]
pub fn get_platform_capabilities() -> PlatformCapabilities {
    PlatformCapabilities {
        platform: platform_name(),
        mobile: cfg!(mobile),
        ai: cfg!(all(feature = "ai", desktop)),
        downloaders: cfg!(desktop),
        pdf: cfg!(desktop),
        documents: true,
        updater: cfg!(desktop),
        local_import: cfg!(mobile),
        extensions: VALID_BOOK_EXTENSION.to_vec(),
    }
}

pub fn library_dir(base_path: &str) -> PathBuf {
    PathBuf::from(base_path).join("Library")
}

#[derive(Debug, Serialize, PartialEq)]
pub struct ImportedBook {
    pub name: String,
    pub series: String,
    pub path: String,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct ImportFailure {
    pub name: String,
    pub error: String,
}

#[derive(Debug, Serialize, Default)]
pub struct ImportResult {
    pub imported: Vec<ImportedBook>,
    pub failed: Vec<ImportFailure>,
    pub library_path: String,
}

fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| {
            !c.is_control() && !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|')
        })
        .collect();
    let cleaned = cleaned.trim().trim_start_matches('.').trim().to_string();
    cleaned.chars().take(150).collect()
}

pub fn derive_series_name(stem: &str) -> String {
    use regex::Regex;
    let brackets = Regex::new(r"[\(\[\{][^\)\]\}]*[\)\]\}]").expect("static regex");
    let issue = Regex::new(
        r"(?i)[\s_\-\.]*(?:#|vol\.?\s*|volume\s*|issue\s*|chapter\s*|ch\.?\s*|tome\s*|t|v)?\d+(?:\.\d+)?\s*$",
    )
    .expect("static regex");
    let spaces = Regex::new(r"\s+").expect("static regex");

    let without_tags = brackets.replace_all(stem, " ").replace('_', " ");
    let without_issue = issue.replace(without_tags.trim(), "").to_string();
    let collapsed = spaces.replace_all(without_issue.trim(), " ").to_string();
    let series = sanitize_file_name(
        collapsed.trim_matches(|c: char| c == '-' || c == '.' || c.is_whitespace()),
    );
    if series.is_empty() {
        sanitize_file_name(stem)
    } else {
        series
    }
}

fn parse_picked(raw: &str) -> FilePath {
    match url::Url::parse(raw) {
        Ok(url) if matches!(url.scheme(), "content" | "file") => FilePath::Url(url),
        _ => FilePath::Path(PathBuf::from(raw)),
    }
}

fn picked_name(picked: &FilePath) -> String {
    let raw = match picked {
        FilePath::Path(p) => p.file_name().map(|n| n.to_string_lossy().to_string()),
        FilePath::Url(u) => u
            .path_segments()
            .and_then(|mut segments| segments.next_back().map(str::to_string))
            .map(|s| urlencoding::decode(&s).map(|c| c.into_owned()).unwrap_or(s)),
    }
    .unwrap_or_default();
    let last = raw.rsplit(['/', ':']).next().unwrap_or(&raw);
    sanitize_file_name(last)
}

fn extension_from_bytes(head: &[u8]) -> Option<&'static str> {
    match ArchiveKind::from_header(head)? {
        ArchiveKind::Zip => Some("cbz"),
        ArchiveKind::Rar => Some("cbr"),
        ArchiveKind::SevenZ => Some("cb7"),
        ArchiveKind::Tar | ArchiveKind::TarGz => Some("cbt"),
    }
}

fn unique_destination(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    let mut candidate = dir.join(format!("{stem}.{ext}"));
    let mut n = 2;
    while candidate.exists() {
        candidate = dir.join(format!("{stem} ({n}).{ext}"));
        n += 1;
    }
    candidate
}

fn import_one(
    mut source: impl Read,
    raw_name: &str,
    series: Option<&str>,
    library: &Path,
    fallback_index: usize,
) -> Result<ImportedBook, String> {
    let mut head = vec![0u8; 512];
    let mut filled = 0;
    while filled < head.len() {
        match source
            .read(&mut head[filled..])
            .map_err(|e| e.to_string())?
        {
            0 => break,
            n => filled += n,
        }
    }
    head.truncate(filled);

    let (stem, declared_ext) = match raw_name.rsplit_once('.') {
        Some((stem, ext)) if VALID_BOOK_EXTENSION.contains(&ext.to_ascii_lowercase().as_str()) => {
            (stem.to_string(), Some(ext.to_ascii_lowercase()))
        }
        _ => (raw_name.to_string(), None),
    };
    let sniffed = extension_from_bytes(&head);
    let ext = match (declared_ext.as_deref(), sniffed) {
        (Some("pdf" | "epub"), _) => declared_ext.clone().unwrap_or_default(),
        (_, Some(kind)) => kind.to_string(),
        (Some(declared), None) => declared.to_string(),
        (None, None) => return Err("Not a supported comic archive".into()),
    };
    if !VALID_BOOK_EXTENSION.contains(&ext.as_str()) {
        return Err(format!("'.{ext}' files are not supported on this device"));
    }

    let stem = if stem.trim().is_empty() {
        format!("Imported {}", fallback_index + 1)
    } else {
        stem
    };
    let series = series
        .map(sanitize_file_name)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| derive_series_name(&stem));
    let dir = library.join(&series);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dest = unique_destination(&dir, &stem, &ext);
    let part = dest.with_extension(format!("{ext}.part"));

    let copied = (|| -> io::Result<()> {
        let mut out = File::create(&part)?;
        io::copy(&mut io::Cursor::new(&head).chain(&mut source), &mut out)?;
        std::fs::rename(&part, &dest)
    })();
    if let Err(e) = copied {
        let _ = std::fs::remove_file(&part);
        return Err(e.to_string());
    }
    Ok(ImportedBook {
        name: dest
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        series,
        path: dest.to_string_lossy().to_string(),
    })
}

async fn ensure_library_scan_path(
    state: &State<'_, AppState>,
    base_path: &str,
    library: &Path,
) -> Result<(), String> {
    let repo = state
        .global_vars
        .lock()
        .await
        .get_surreal_db(base_path)
        .await
        .map_err(|e| format!("Error getting SurrealDB: {}", e))?;
    let library_str = library.to_string_lossy().to_string();
    let existing = repo.get_all_scan_paths().await.map_err(|e| e.to_string())?;
    if existing.iter().any(|sp| sp.path == library_str) {
        return Ok(());
    }
    repo.create_scan_path("On this device", &library_str, true)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_local_files(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<String>,
    series: Option<String>,
) -> Result<ImportResult, String> {
    let base_path = state.config.lock().await.base_path.clone();
    let library = library_dir(&base_path);
    std::fs::create_dir_all(&library).map_err(|e| e.to_string())?;

    let worker_library = library.clone();
    let mut result = tokio::task::spawn_blocking(move || {
        let mut result = ImportResult::default();
        for (index, raw) in paths.iter().enumerate() {
            let picked = parse_picked(raw);
            let name = picked_name(&picked);
            let mut options = OpenOptions::new();
            options.read(true);
            let opened = app.fs().open(picked, options);
            let outcome = match opened {
                Ok(file) => import_one(file, &name, series.as_deref(), &worker_library, index),
                Err(e) => Err(e.to_string()),
            };
            match outcome {
                Ok(book) => {
                    info!("[import] {} -> {}", name, book.path);
                    result.imported.push(book);
                }
                Err(error) => {
                    warn!("[import] {} failed: {}", name, error);
                    result.failed.push(ImportFailure { name, error });
                }
            }
        }
        result
    })
    .await
    .map_err(|e| e.to_string())?;

    result.library_path = library.to_string_lossy().to_string();
    if !result.imported.is_empty() {
        if let Err(e) = ensure_library_scan_path(&state, &base_path, &library).await {
            error!("[import] could not register the library folder: {}", e);
            return Err(e);
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn series_names_drop_issue_numbers_and_tags() {
        assert_eq!(derive_series_name("Batman 012 (2016) (Digital)"), "Batman");
        assert_eq!(derive_series_name("Saga #7"), "Saga");
        assert_eq!(derive_series_name("One_Piece_v105"), "One Piece");
        assert_eq!(derive_series_name("Berserk - Vol.12"), "Berserk");
        assert_eq!(derive_series_name("Watchmen"), "Watchmen");
        assert_eq!(derive_series_name("[Group] Akira T02"), "Akira");
        assert_eq!(derive_series_name("2000"), "2000", "never an empty series");
    }

    #[test]
    fn picked_names_come_from_paths_and_content_uris() {
        assert_eq!(
            picked_name(&parse_picked("/storage/emulated/0/Comics/Batman 01.cbz")),
            "Batman 01.cbz"
        );
        assert_eq!(
            picked_name(&parse_picked(
                "content://com.android.externalstorage.documents/document/primary%3AComics%2FSaga%2001.cbr"
            )),
            "Saga 01.cbr"
        );
        assert_eq!(
            picked_name(&parse_picked("file:///private/var/tmp/My%20Book.cb7")),
            "My Book.cb7"
        );
        assert_eq!(sanitize_file_name("../../etc/passwd"), "etcpasswd");
    }

    fn zip_bytes() -> Vec<u8> {
        let mut buf = Cursor::new(Vec::new());
        let mut zip = zip::ZipWriter::new(&mut buf);
        zip.start_file("1.jpg", zip::write::SimpleFileOptions::default())
            .unwrap();
        io::Write::write_all(&mut zip, b"img").unwrap();
        zip.finish().unwrap();
        buf.into_inner()
    }

    #[test]
    fn import_groups_issues_by_series_and_trusts_the_bytes() {
        let dir = tempfile::tempdir().unwrap();
        let data = zip_bytes();
        let first = import_one(
            Cursor::new(data.clone()),
            "Saga 01.cbr",
            None,
            dir.path(),
            0,
        )
        .unwrap();
        assert_eq!(first.series, "Saga");
        assert!(first.path.ends_with("Saga/Saga 01.cbz"), "{}", first.path);
        assert_eq!(std::fs::read(&first.path).unwrap(), data);

        let second = import_one(
            Cursor::new(data.clone()),
            "Saga 01.cbz",
            None,
            dir.path(),
            1,
        )
        .unwrap();
        assert!(
            second.path.ends_with("Saga/Saga 01 (2).cbz"),
            "{}",
            second.path
        );

        let third = import_one(Cursor::new(data), "", Some("My Series"), dir.path(), 2).unwrap();
        assert_eq!(third.series, "My Series");
        assert!(
            third.path.ends_with("My Series/Imported 3.cbz"),
            "{}",
            third.path
        );
    }

    #[test]
    fn unsupported_files_are_rejected_without_leaving_partials() {
        let dir = tempfile::tempdir().unwrap();
        assert!(import_one(
            Cursor::new(b"hello".to_vec()),
            "notes.txt",
            None,
            dir.path(),
            0
        )
        .is_err());
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 0);
    }
}

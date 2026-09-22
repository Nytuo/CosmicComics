//! Device-to-device sync over the local network.
//!
//! Two devices pair once with a PIN shown on one of them (SPAKE2, so the PIN
//! never travels and cannot be brute-forced offline). The shared key then
//! encrypts everything they exchange (AES-256-GCM): a manifest of the library
//! database, the API secrets and Jellyfin sign-ins, and the book files the user
//! chooses to copy. Settings are not synced.

use crate::models::stats::ReadingSessionRecord;
use crate::models::{BookRecord, BookmarkRecord, SeriesRecord};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::jellyfin_service::{JellyfinServer, JellyfinStore};
use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tracing::{info, warn};

pub const SERVICE_TYPE: &str = "_cosmiccomics._tcp.local.";
pub const API_PREFIX: &str = "/cc-sync/v1";
pub const PAIR_IDENTITY: &[u8] = b"cosmic-comics-sync-v1";
pub const FILE_CHUNK: usize = 1024 * 1024;
const AUTH_WINDOW_SECS: i64 = 300;

pub type Key = [u8; 32];

// ---------------------------------------------------------------------------
// Crypto
// ---------------------------------------------------------------------------

/// Turns the SPAKE2 output into the key both devices keep.
pub fn derive_key(shared: &[u8]) -> Key {
    let mut hasher = Sha256::new();
    hasher.update(b"cosmic-comics-sync-key");
    hasher.update(shared);
    hasher.finalize().into()
}

/// `nonce || ciphertext`, authenticated with `aad` so a message cannot be
/// replayed in another context.
pub fn seal(key: &Key, plaintext: &[u8], aad: &str) -> Vec<u8> {
    let cipher = Aes256Gcm::new(key.into());
    let nonce: [u8; 12] = rand::random();
    let mut out = nonce.to_vec();
    out.extend(
        cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                Payload {
                    msg: plaintext,
                    aad: aad.as_bytes(),
                },
            )
            .expect("AES-GCM encryption cannot fail for in-memory buffers"),
    );
    out
}

pub fn open(key: &Key, sealed: &[u8], aad: &str) -> Result<Vec<u8>, String> {
    if sealed.len() < 12 + 16 {
        return Err("message too short".into());
    }
    let (nonce, ciphertext) = sealed.split_at(12);
    Aes256Gcm::new(key.into())
        .decrypt(
            Nonce::from_slice(nonce),
            Payload {
                msg: ciphertext,
                aad: aad.as_bytes(),
            },
        )
        .map_err(|_| "message could not be decrypted".to_string())
}

pub fn seal_json<T: Serialize>(key: &Key, value: &T, aad: &str) -> Result<Vec<u8>, String> {
    Ok(seal(
        key,
        &serde_json::to_vec(value).map_err(|e| e.to_string())?,
        aad,
    ))
}

pub fn open_json<T: for<'de> Deserialize<'de>>(
    key: &Key,
    sealed: &[u8],
    aad: &str,
) -> Result<T, String> {
    serde_json::from_slice(&open(key, sealed, aad)?).map_err(|e| e.to_string())
}

/// Header value proving the caller holds the pairing key, bound to the path
/// and to the current time.
pub fn auth_token(key: &Key, path: &str) -> String {
    let now = chrono::Utc::now().timestamp().to_string();
    B64.encode(seal(key, now.as_bytes(), &format!("auth:{path}")))
}

pub fn check_auth_token(key: &Key, path: &str, token: &str) -> bool {
    let Ok(sealed) = B64.decode(token) else {
        return false;
    };
    let Ok(plain) = open(key, &sealed, &format!("auth:{path}")) else {
        return false;
    };
    let Some(sent) = std::str::from_utf8(&plain)
        .ok()
        .and_then(|s| s.parse::<i64>().ok())
    else {
        return false;
    };
    (chrono::Utc::now().timestamp() - sent).abs() <= AUTH_WINDOW_SECS
}

/// One frame of an encrypted file stream: `len (u32 BE) || last (u8) || sealed`.
pub fn file_frame(key: &Key, book_id: &str, index: u64, last: bool, chunk: &[u8]) -> Vec<u8> {
    let sealed = seal(key, chunk, &frame_aad(book_id, index, last));
    let mut frame = Vec::with_capacity(sealed.len() + 5);
    frame.extend((sealed.len() as u32).to_be_bytes());
    frame.push(last as u8);
    frame.extend(sealed);
    frame
}

pub fn frame_aad(book_id: &str, index: u64, last: bool) -> String {
    format!("file:{book_id}:{index}:{}", last as u8)
}

/// Incremental decoder of [`file_frame`]s.
pub struct FrameReader {
    key: Key,
    book_id: String,
    buffer: Vec<u8>,
    index: u64,
    pub finished: bool,
}

impl FrameReader {
    pub fn new(key: Key, book_id: &str) -> Self {
        Self {
            key,
            book_id: book_id.to_string(),
            buffer: Vec::new(),
            index: 0,
            finished: false,
        }
    }

    /// Feeds received bytes, returning the plaintext of every complete frame.
    pub fn push(&mut self, bytes: &[u8]) -> Result<Vec<Vec<u8>>, String> {
        self.buffer.extend_from_slice(bytes);
        let mut out = Vec::new();
        loop {
            if self.buffer.len() < 5 {
                return Ok(out);
            }
            let len = u32::from_be_bytes(self.buffer[..4].try_into().unwrap()) as usize;
            if len > FILE_CHUNK + 64 {
                return Err("invalid frame".into());
            }
            if self.buffer.len() < 5 + len {
                return Ok(out);
            }
            if self.finished {
                return Err("data after the last frame".into());
            }
            let last = self.buffer[4] == 1;
            let plain = open(
                &self.key,
                &self.buffer[5..5 + len],
                &frame_aad(&self.book_id, self.index, last),
            )?;
            self.buffer.drain(..5 + len);
            self.index += 1;
            self.finished = last;
            out.push(plain);
        }
    }
}

// ---------------------------------------------------------------------------
// Paired devices
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub platform: String,
    key: String,
    #[serde(default)]
    pub paired_at: i64,
    #[serde(default)]
    pub last_sync: Option<i64>,
    #[serde(default)]
    pub last_address: Option<String>,
}

impl Peer {
    pub fn new(id: &str, name: &str, platform: &str, key: &Key) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            platform: platform.to_string(),
            key: B64.encode(key),
            paired_at: chrono::Utc::now().timestamp(),
            last_sync: None,
            last_address: None,
        }
    }

    pub fn key(&self) -> Option<Key> {
        B64.decode(&self.key).ok()?.try_into().ok()
    }
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct StoreData {
    #[serde(default)]
    device_id: String,
    #[serde(default)]
    device_name: String,
    #[serde(default)]
    peers: Vec<Peer>,
}

static STORE_LOCK: Mutex<()> = Mutex::new(());

pub struct SyncStore {
    file: PathBuf,
}

pub fn default_device_name() -> String {
    let host = gethostname::gethostname().to_string_lossy().to_string();
    let host = host.trim_end_matches(".local").trim();
    if host.is_empty() || host == "localhost" {
        format!("Cosmic Comics ({})", platform_name())
    } else {
        host.to_string()
    }
}

pub fn platform_name() -> &'static str {
    if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else {
        std::env::consts::OS
    }
}

impl SyncStore {
    pub fn new(base_path: &str) -> Self {
        Self {
            file: PathBuf::from(base_path).join("sync").join("sync.json"),
        }
    }

    fn read(&self) -> StoreData {
        std::fs::read_to_string(&self.file)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    fn write(&self, data: &StoreData) -> Result<(), String> {
        if let Some(dir) = self.file.parent() {
            std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        let tmp = self.file.with_extension("json.tmp");
        std::fs::write(
            &tmp,
            serde_json::to_vec_pretty(data).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&tmp, std::fs::Permissions::from_mode(0o600));
        }
        std::fs::rename(&tmp, &self.file).map_err(|e| e.to_string())
    }

    fn update<T>(&self, change: impl FnOnce(&mut StoreData) -> T) -> Result<T, String> {
        let _guard = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut data = self.read();
        if data.device_id.is_empty() {
            data.device_id = format!("{:032x}", rand::random::<u128>());
        }
        if data.device_name.trim().is_empty() {
            data.device_name = default_device_name();
        }
        let out = change(&mut data);
        self.write(&data)?;
        Ok(out)
    }

    /// This device's id and name.
    pub fn identity(&self) -> Result<(String, String), String> {
        self.update(|d| (d.device_id.clone(), d.device_name.clone()))
    }

    pub fn set_device_name(&self, name: &str) -> Result<(), String> {
        let name = name.trim().chars().take(60).collect::<String>();
        self.update(|d| d.device_name = name)
    }

    pub fn peers(&self) -> Vec<Peer> {
        let _guard = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        self.read().peers
    }

    pub fn peer(&self, id: &str) -> Option<Peer> {
        self.peers().into_iter().find(|p| p.id == id)
    }

    pub fn save_peer(&self, peer: Peer) -> Result<(), String> {
        self.update(|d| {
            d.peers.retain(|p| p.id != peer.id);
            d.peers.push(peer);
        })
    }

    pub fn touch_peer(&self, id: &str, address: &str) -> Result<(), String> {
        self.update(|d| {
            if let Some(peer) = d.peers.iter_mut().find(|p| p.id == id) {
                peer.last_sync = Some(chrono::Utc::now().timestamp());
                peer.last_address = Some(address.to_string());
            }
        })
    }

    pub fn remove_peer(&self, id: &str) -> Result<(), String> {
        self.update(|d| d.peers.retain(|p| p.id != id))
    }
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FileInfo {
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Manifest {
    pub device_id: String,
    pub device_name: String,
    #[serde(default)]
    pub books: Vec<Value>,
    #[serde(default)]
    pub series: Vec<Value>,
    #[serde(default)]
    pub bookmarks: Vec<Value>,
    #[serde(default)]
    pub sessions: Vec<ReadingSessionRecord>,
    #[serde(default)]
    pub credentials: HashMap<String, String>,
    #[serde(default)]
    pub jellyfin_servers: Vec<JellyfinServer>,
    /// Book id → file that can be copied from this device.
    #[serde(default)]
    pub files: HashMap<String, FileInfo>,
    /// Ids of books and series whose cover is a file on this device.
    #[serde(default)]
    pub covers: HashSet<String>,
}

fn is_local_file(path: &str) -> bool {
    !path.is_empty() && !path.contains("://") && Path::new(path).is_file()
}

pub async fn build_manifest(
    repo: &SurrealRepo,
    base_path: &str,
    device_id: &str,
    device_name: &str,
) -> anyhow::Result<Manifest> {
    let books = repo.get_all_books().await?;
    let series = repo.get_all_series().await?;
    let mut manifest = Manifest {
        device_id: device_id.to_string(),
        device_name: device_name.to_string(),
        bookmarks: repo
            .get_all_bookmarks()
            .await?
            .iter()
            .filter_map(|b| serde_json::to_value(b).ok())
            .collect(),
        sessions: repo.get_reading_sessions().await.unwrap_or_default(),
        credentials: repo
            .get_all_api_credentials()
            .await?
            .into_iter()
            .filter(|(_, v)| !v.is_empty())
            .collect(),
        jellyfin_servers: JellyfinStore::new(base_path).servers(),
        ..Default::default()
    };
    for book in &books {
        let Some(id) = book.id.as_ref().map(|id| record_key(&id.to_string())) else {
            continue;
        };
        if is_local_file(&book.path) {
            if let Ok(meta) = std::fs::metadata(&book.path) {
                manifest.files.insert(
                    id.clone(),
                    FileInfo {
                        name: Path::new(&book.path)
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_else(|| "book".into()),
                        size: meta.len(),
                    },
                );
            }
        }
        if book.cover_url.as_deref().is_some_and(is_local_file) {
            manifest.covers.insert(format!("book:{id}"));
        }
    }
    for s in &series {
        if let Some(id) = s.id.as_ref().map(|id| record_key(&id.to_string())) {
            if s.cover_url.as_deref().is_some_and(is_local_file) {
                manifest.covers.insert(format!("series:{id}"));
            }
        }
    }
    manifest.books = books
        .iter()
        .filter_map(|b| serde_json::to_value(b).ok())
        .collect();
    manifest.series = series
        .iter()
        .filter_map(|s| serde_json::to_value(s).ok())
        .collect();
    Ok(manifest)
}

/// `book:⟨abc⟩` / `book:abc` / `abc` → `abc`.
pub fn record_key(id: &str) -> String {
    let key = id.split_once(':').map(|(_, k)| k).unwrap_or(id);
    key.trim_start_matches('⟨')
        .trim_end_matches('⟩')
        .trim_matches('`')
        .to_string()
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

const BOOK_USER_FIELDS: &[&str] = &["read", "reading", "unread", "favorite", "last_page", "note"];
const BOOK_META_FIELDS: &[&str] = &[
    "description",
    "issue_number",
    "format",
    "page_count",
    "creators",
    "characters",
];
const SERIES_USER_FIELDS: &[&str] = &["favorite", "note"];
const SERIES_META_FIELDS: &[&str] = &[
    "description",
    "status",
    "start_date",
    "end_date",
    "score",
    "genres",
    "volumes",
    "chapters",
    "characters",
    "staff",
];

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct MergeReport {
    pub books_matched: usize,
    pub books_updated: usize,
    pub series_updated: usize,
    pub bookmarks_added: usize,
    pub sessions_added: usize,
    pub credentials_added: usize,
    pub jellyfin_servers_added: usize,
}

fn norm(s: &str) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

fn str_of<'a>(v: &'a Value, key: &str) -> &'a str {
    v.get(key).and_then(Value::as_str).unwrap_or("")
}

fn is_empty(v: Option<&Value>) -> bool {
    match v {
        None | Some(Value::Null) => true,
        Some(Value::String(s)) => s.trim().is_empty(),
        Some(Value::Array(a)) => a.is_empty(),
        Some(Value::Number(n)) => n.as_f64() == Some(0.0),
        _ => false,
    }
}

/// Seconds since the epoch of a stored `updated_at`, whatever form it has.
fn timestamp(v: &Value) -> i64 {
    let raw = str_of(v, "updated_at")
        .trim_start_matches("d'")
        .trim_start_matches("d\"")
        .trim_end_matches(['\'', '"']);
    chrono::DateTime::parse_from_rfc3339(raw)
        .map(|d| d.timestamp())
        .unwrap_or(0)
}

fn external_key(v: &Value) -> Option<String> {
    let external = str_of(v, "external_id");
    if external.is_empty() || external.starts_with("manual") {
        return None;
    }
    Some(format!(
        "{}:{}",
        v.get("provider_id").and_then(Value::as_u64).unwrap_or(0),
        external
    ))
}

fn book_title_key(v: &Value, series_titles: &HashMap<String, String>) -> Option<String> {
    let title = norm(str_of(v, "title"));
    if title.is_empty() {
        return None;
    }
    let series = series_titles
        .get(&record_key(str_of(v, "series_id")))
        .map(|t| norm(t))
        .unwrap_or_default();
    Some(format!(
        "{series}|{title}|{}",
        norm(str_of(v, "issue_number"))
    ))
}

/// Finds local records for remote ones: same record id first (records copied
/// by a previous sync), then the same provider id, then the same titles.
struct Matcher {
    by_id: HashMap<String, Value>,
    by_external: HashMap<String, String>,
    by_title: HashMap<String, String>,
}

impl Matcher {
    fn new(local: &[Value], title_key: impl Fn(&Value) -> Option<String>) -> Self {
        let mut m = Self {
            by_id: HashMap::new(),
            by_external: HashMap::new(),
            by_title: HashMap::new(),
        };
        for v in local {
            let id = record_key(str_of(v, "id"));
            if id.is_empty() {
                continue;
            }
            if let Some(k) = external_key(v) {
                m.by_external.entry(k).or_insert_with(|| id.clone());
            }
            if let Some(k) = title_key(v) {
                m.by_title.entry(k).or_insert_with(|| id.clone());
            }
            m.by_id.insert(id, v.clone());
        }
        m
    }

    fn find(&self, remote: &Value, title_key: Option<String>) -> Option<&Value> {
        let id = record_key(str_of(remote, "id"));
        self.by_id
            .get(&id)
            .or_else(|| {
                external_key(remote)
                    .and_then(|k| self.by_external.get(&k))
                    .and_then(|id| self.by_id.get(id))
            })
            .or_else(|| {
                title_key
                    .and_then(|k| self.by_title.get(&k))
                    .and_then(|id| self.by_id.get(id))
            })
    }
}

/// Fields to write on `local` so it takes the remote reading state when the
/// remote record changed last, and the remote metadata it lacks.
fn merged_fields(
    local: &Value,
    remote: &Value,
    user: &[&str],
    meta: &[&str],
) -> Map<String, Value> {
    let mut changes = Map::new();
    if timestamp(remote) > timestamp(local) {
        for field in user {
            if let Some(value) = remote.get(*field) {
                if local.get(*field) != Some(value) {
                    changes.insert(field.to_string(), value.clone());
                }
            }
        }
        if !changes.is_empty() {
            if let Some(at) = remote.get("updated_at") {
                changes.insert("updated_at".into(), at.clone());
            }
        }
    }
    if !local.get("lock").and_then(Value::as_bool).unwrap_or(false) {
        for field in meta {
            if is_empty(local.get(*field)) && !is_empty(remote.get(*field)) {
                changes.insert(field.to_string(), remote[*field].clone());
            }
        }
    }
    changes
}

async fn merge_record(
    repo: &SurrealRepo,
    table: &str,
    key: &str,
    data: Map<String, Value>,
) -> anyhow::Result<()> {
    repo.raw_query_typed::<Value>(
        "UPDATE type::thing($tb, $id) MERGE $data",
        vec![
            ("tb", Value::String(table.into())),
            ("id", Value::String(key.into())),
            ("data", Value::Object(data)),
        ],
    )
    .await?;
    Ok(())
}

pub async fn upsert_record(
    repo: &SurrealRepo,
    table: &str,
    key: &str,
    mut data: Value,
) -> anyhow::Result<()> {
    if let Some(map) = data.as_object_mut() {
        map.remove("id");
    }
    repo.raw_query_typed::<Value>(
        "UPSERT type::thing($tb, $id) CONTENT $data",
        vec![
            ("tb", Value::String(table.into())),
            ("id", Value::String(key.into())),
            ("data", data),
        ],
    )
    .await?;
    Ok(())
}

fn values<T: Serialize>(records: &[T]) -> Vec<Value> {
    records
        .iter()
        .filter_map(|r| serde_json::to_value(r).ok())
        .collect()
}

fn series_titles(series: &[Value]) -> HashMap<String, String> {
    series
        .iter()
        .map(|s| (record_key(str_of(s, "id")), str_of(s, "title").to_string()))
        .collect()
}

/// Remote book or series id → local id, for the records both devices have.
#[derive(Default)]
pub struct Matches {
    pub books: HashMap<String, String>,
    pub series: HashMap<String, String>,
}

pub async fn match_records(repo: &SurrealRepo, remote: &Manifest) -> anyhow::Result<Matches> {
    let local_series = values(&repo.get_all_series().await?);
    let local_books = values(&repo.get_all_books().await?);
    Ok(match_values(&local_series, &local_books, remote))
}

fn match_values(local_series: &[Value], local_books: &[Value], remote: &Manifest) -> Matches {
    let mut matches = Matches::default();
    let series_matcher = Matcher::new(local_series, |v| {
        Some(norm(str_of(v, "title"))).filter(|t| !t.is_empty())
    });
    for s in &remote.series {
        let title = Some(norm(str_of(s, "title"))).filter(|t| !t.is_empty());
        if let Some(local) = series_matcher.find(s, title) {
            matches
                .series
                .insert(record_key(str_of(s, "id")), record_key(str_of(local, "id")));
        }
    }
    let local_titles = series_titles(local_series);
    let remote_titles = series_titles(&remote.series);
    let book_matcher = Matcher::new(local_books, |v| book_title_key(v, &local_titles));
    for b in &remote.books {
        if let Some(local) = book_matcher.find(b, book_title_key(b, &remote_titles)) {
            matches
                .books
                .insert(record_key(str_of(b, "id")), record_key(str_of(local, "id")));
        }
    }
    matches
}

/// Merges what another device sent into this device's library. Only records
/// both devices have are updated; books that exist only on the other device
/// are left for the user to copy with their files.
pub async fn merge(
    repo: &SurrealRepo,
    base_path: &str,
    remote: &Manifest,
) -> anyhow::Result<MergeReport> {
    let mut report = MergeReport::default();
    let local_series = values(&repo.get_all_series().await?);
    let local_books = values(&repo.get_all_books().await?);
    let matches = match_values(&local_series, &local_books, remote);
    let series_by_id: HashMap<String, &Value> = local_series
        .iter()
        .map(|v| (record_key(str_of(v, "id")), v))
        .collect();
    let books_by_id: HashMap<String, &Value> = local_books
        .iter()
        .map(|v| (record_key(str_of(v, "id")), v))
        .collect();

    for s in &remote.series {
        let Some(local) = matches
            .series
            .get(&record_key(str_of(s, "id")))
            .and_then(|id| series_by_id.get(id))
        else {
            continue;
        };
        let changes = merged_fields(local, s, SERIES_USER_FIELDS, SERIES_META_FIELDS);
        if !changes.is_empty() {
            merge_record(repo, "series", &record_key(str_of(local, "id")), changes).await?;
            report.series_updated += 1;
        }
    }

    for b in &remote.books {
        let Some(local) = matches
            .books
            .get(&record_key(str_of(b, "id")))
            .and_then(|id| books_by_id.get(id))
        else {
            continue;
        };
        report.books_matched += 1;
        let changes = merged_fields(local, b, BOOK_USER_FIELDS, BOOK_META_FIELDS);
        if !changes.is_empty() {
            merge_record(repo, "book", &record_key(str_of(local, "id")), changes).await?;
            report.books_updated += 1;
        }
    }

    let existing: HashSet<(String, i64)> = repo
        .get_all_bookmarks()
        .await?
        .into_iter()
        .map(|b| (record_key(&b.book_id), b.page))
        .collect();
    for mark in &remote.bookmarks {
        let Ok(mark) = serde_json::from_value::<BookmarkRecord>(mark.clone()) else {
            continue;
        };
        let Some(local_id) = matches.books.get(&record_key(&mark.book_id)) else {
            continue;
        };
        if existing.contains(&(local_id.clone(), mark.page)) {
            continue;
        }
        let Some(local) = books_by_id.get(local_id) else {
            continue;
        };
        let book_id = if mark.book_id.contains(':') {
            format!("book:{local_id}")
        } else {
            local_id.clone()
        };
        repo.create_bookmark(&book_id, str_of(local, "path"), mark.page)
            .await?;
        report.bookmarks_added += 1;
    }

    let known: HashSet<String> = repo
        .get_reading_sessions()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|s| s.session_id)
        .collect();
    for session in &remote.sessions {
        if known.contains(&session.session_id) {
            continue;
        }
        let mut session = session.clone();
        if let Some(local) = matches.books.get(&record_key(&session.book_ref)) {
            session.book_ref = format!("book:{local}");
        }
        repo.upsert_reading_session(&session).await?;
        report.sessions_added += 1;
    }

    let credentials = repo.get_all_api_credentials().await?;
    for (key, value) in &remote.credentials {
        if value.is_empty() || credentials.get(key).is_some_and(|v| !v.is_empty()) {
            continue;
        }
        repo.upsert_api_credential(key, value).await?;
        report.credentials_added += 1;
    }

    let store = JellyfinStore::new(base_path);
    let servers: HashSet<String> = store.servers().into_iter().map(|s| s.id).collect();
    for server in &remote.jellyfin_servers {
        if !servers.contains(&server.id) {
            store
                .upsert(JellyfinServer {
                    borrowed_from: Some(remote.device_name.clone()),
                    ..server.clone()
                })
                .map_err(|e| anyhow::anyhow!("{e}"))?;
            report.jellyfin_servers_added += 1;
        }
    }

    info!("[sync] merged from '{}': {:?}", remote.device_name, report);
    Ok(report)
}

// ---------------------------------------------------------------------------
// Books to copy
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct RemoteBook {
    pub id: String,
    pub title: String,
    pub issue_number: Option<String>,
    pub series_id: Option<String>,
    pub series_title: Option<String>,
    pub file_name: String,
    pub size: u64,
}

/// Books of the other device this one does not have, with a file to copy.
pub fn missing_books(remote: &Manifest, matches: &Matches) -> Vec<RemoteBook> {
    let titles = series_titles(&remote.series);
    let mut out: Vec<RemoteBook> = remote
        .books
        .iter()
        .filter_map(|b| {
            let id = record_key(str_of(b, "id"));
            if matches.books.contains_key(&id) {
                return None;
            }
            let file = remote.files.get(&id)?;
            let series_id = Some(record_key(str_of(b, "series_id"))).filter(|s| !s.is_empty());
            Some(RemoteBook {
                title: str_of(b, "title").to_string(),
                issue_number: Some(str_of(b, "issue_number").to_string()).filter(|s| !s.is_empty()),
                series_title: series_id.as_ref().and_then(|s| titles.get(s).cloned()),
                series_id,
                file_name: file.name.clone(),
                size: file.size,
                id,
            })
        })
        .collect();
    out.sort_by(|a, b| {
        (a.series_title.as_deref().unwrap_or(""), a.title.as_str())
            .cmp(&(b.series_title.as_deref().unwrap_or(""), b.title.as_str()))
    });
    out
}

pub fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| {
            !c.is_control() && !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|')
        })
        .collect();
    let cleaned = cleaned.trim().trim_matches('.').trim().to_string();
    if cleaned.is_empty() {
        "Untitled".into()
    } else {
        cleaned
    }
}

pub fn unique_destination(dir: &Path, file_name: &str) -> PathBuf {
    let file_name = sanitize_file_name(file_name);
    let (stem, ext) = match file_name.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() => (stem.to_string(), format!(".{ext}")),
        _ => (file_name.clone(), String::new()),
    };
    let mut candidate = dir.join(&file_name);
    let mut n = 2;
    while candidate.exists() {
        candidate = dir.join(format!("{stem} ({n}){ext}"));
        n += 1;
    }
    candidate
}

pub fn image_extension(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(b"\x89PNG") {
        "png"
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        "webp"
    } else if bytes.starts_with(b"GIF8") {
        "gif"
    } else {
        "jpg"
    }
}

/// Where books copied from another device go: the first library folder that
/// exists, or the app's own library folder (added as a library if needed).
pub async fn library_root(repo: &SurrealRepo, base_path: &str) -> anyhow::Result<PathBuf> {
    let scan_paths = repo.get_all_scan_paths().await?;
    if cfg!(desktop) {
        if let Some(sp) = scan_paths.iter().find(|sp| Path::new(&sp.path).is_dir()) {
            return Ok(PathBuf::from(&sp.path));
        }
    }
    let library = crate::commands::platform::library_dir(base_path);
    std::fs::create_dir_all(&library)?;
    let library_str = library.to_string_lossy().to_string();
    if !scan_paths.iter().any(|sp| sp.path == library_str) {
        repo.create_scan_path("On this device", &library_str, true)
            .await?;
    }
    Ok(library)
}

/// Record of a book copied from another device: its metadata, the local file,
/// the local series and the local cover.
pub fn copied_book(
    remote: &Value,
    path: &Path,
    series_key: Option<&str>,
    cover: Option<String>,
) -> Value {
    let mut book = remote.clone();
    if let Some(map) = book.as_object_mut() {
        map.remove("id");
        map.insert(
            "path".into(),
            Value::String(path.to_string_lossy().to_string()),
        );
        match series_key {
            Some(key) => map.insert("series_id".into(), Value::String(format!("series:{key}"))),
            None => map.remove("series_id"),
        };
        let remote_cover = map
            .get("cover_url")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        match cover {
            Some(local) => {
                map.insert("cover_url".into(), Value::String(local));
            }
            None if remote_cover.contains("://") => {}
            None => {
                map.remove("cover_url");
            }
        }
    }
    book
}

pub fn copied_series(remote: &Value, dir: &Path, cover: Option<String>) -> Value {
    let mut series = remote.clone();
    if let Some(map) = series.as_object_mut() {
        map.remove("id");
        map.insert(
            "path".into(),
            Value::String(dir.to_string_lossy().to_string()),
        );
        let remote_cover = map
            .get("cover_url")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        match cover {
            Some(local) => {
                map.insert("cover_url".into(), Value::String(local));
            }
            None if remote_cover.contains("://") => {}
            None => {
                map.remove("cover_url");
            }
        }
        if map
            .get("bg_url")
            .and_then(Value::as_str)
            .is_some_and(|u| !u.contains("://"))
        {
            map.remove("bg_url");
        }
    }
    series
}

/// Local book/series paths and cover files the other device may request.
pub async fn book_file(repo: &SurrealRepo, key: &str) -> Option<PathBuf> {
    let book: BookRecord = repo.get_book_by_id(key).await.ok()??;
    is_local_file(&book.path).then(|| PathBuf::from(book.path))
}

pub async fn cover_file(repo: &SurrealRepo, kind: &str, key: &str) -> Option<PathBuf> {
    let cover = match kind {
        "book" => repo.get_book_by_id(key).await.ok()??.cover_url,
        "series" => {
            let s: SeriesRecord = repo.get_series_by_id(key).await.ok()??;
            s.cover_url
        }
        _ => None,
    }?;
    is_local_file(&cover).then(|| PathBuf::from(cover))
}

pub fn log_warn(what: &str, why: &str) {
    warn!("[sync] {}: {}", what, why);
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn sealed_messages_are_bound_to_their_context() {
        let key = derive_key(b"shared");
        let sealed = seal(&key, b"hello", "manifest");
        assert_eq!(open(&key, &sealed, "manifest").unwrap(), b"hello");
        assert!(open(&key, &sealed, "push").is_err());
        assert!(open(&derive_key(b"other"), &sealed, "manifest").is_err());

        let token = auth_token(&key, "/cc-sync/v1/manifest");
        assert!(check_auth_token(&key, "/cc-sync/v1/manifest", &token));
        assert!(!check_auth_token(&key, "/cc-sync/v1/file/x", &token));
    }

    #[test]
    fn file_frames_roundtrip_and_detect_truncation() {
        let key = derive_key(b"k");
        let mut stream = file_frame(&key, "b1", 0, false, b"abc");
        stream.extend(file_frame(&key, "b1", 1, true, b"def"));
        let mut reader = FrameReader::new(key, "b1");
        let mut out = Vec::new();
        for chunk in stream.chunks(7) {
            for plain in reader.push(chunk).unwrap() {
                out.extend(plain);
            }
        }
        assert_eq!(out, b"abcdef");
        assert!(reader.finished);

        let mut reordered = FrameReader::new(key, "b1");
        assert!(reordered
            .push(&file_frame(&key, "b1", 1, true, b"x"))
            .is_err());
    }

    #[test]
    fn pairing_derives_the_same_key_on_both_sides() {
        use spake2::{Ed25519Group, Identity, Password, Spake2};
        let id = Identity::new(PAIR_IDENTITY);
        let (a, msg_a) = Spake2::<Ed25519Group>::start_symmetric(&Password::new(b"123456"), &id);
        let (b, msg_b) = Spake2::<Ed25519Group>::start_symmetric(&Password::new(b"123456"), &id);
        let (c, _msg_c) = Spake2::<Ed25519Group>::start_symmetric(&Password::new(b"654321"), &id);
        let ka = derive_key(&a.finish(&msg_b).unwrap());
        let kb = derive_key(&b.finish(&msg_a).unwrap());
        assert_eq!(ka, kb);
        let kc = derive_key(&c.finish(&msg_a).unwrap());
        assert_ne!(ka, kc, "a wrong PIN gives another key");
    }

    fn manifest(series: Vec<Value>, books: Vec<Value>) -> Manifest {
        Manifest {
            series,
            books,
            ..Default::default()
        }
    }

    #[test]
    fn books_match_by_id_provider_or_titles() {
        let local_series = vec![json!({"id": "series:s1", "title": "Saga"})];
        let local_books = vec![
            json!({"id": "book:a", "title": "Saga #1", "issue_number": "1", "series_id": "series:s1", "external_id": "manual_1", "provider_id": 0}),
            json!({"id": "book:b", "title": "Watchmen", "external_id": "999", "provider_id": 2}),
        ];
        let remote = manifest(
            vec![json!({"id": "series:r1", "title": "SAGA"})],
            vec![
                json!({"id": "book:x", "title": "saga  #1", "issue_number": "1", "series_id": "series:r1", "external_id": "manual_7", "provider_id": 0}),
                json!({"id": "book:y", "title": "Other title", "external_id": "999", "provider_id": 2}),
                json!({"id": "book:a", "title": "renamed"}),
                json!({"id": "book:z", "title": "Only remote"}),
            ],
        );
        let m = match_values(&local_series, &local_books, &remote);
        assert_eq!(m.series.get("r1").map(String::as_str), Some("s1"));
        assert_eq!(m.books.get("x").map(String::as_str), Some("a"));
        assert_eq!(m.books.get("y").map(String::as_str), Some("b"));
        assert_eq!(m.books.get("a").map(String::as_str), Some("a"));
        assert!(!m.books.contains_key("z"));

        let mut remote = remote;
        remote.files.insert(
            "z".into(),
            FileInfo {
                name: "z.cbz".into(),
                size: 3,
            },
        );
        remote.files.insert(
            "x".into(),
            FileInfo {
                name: "x.cbz".into(),
                size: 3,
            },
        );
        let missing = missing_books(&remote, &m);
        assert_eq!(missing.len(), 1);
        assert_eq!(missing[0].id, "z");
    }

    #[test]
    fn the_last_reading_change_wins_and_blanks_are_filled() {
        let local = json!({"read": false, "last_page": 3, "description": "", "updated_at": "2026-09-01T10:00:00Z"});
        let newer = json!({"read": true, "last_page": 10, "description": "About", "updated_at": "2026-09-02T10:00:00Z"});
        let older = json!({"read": true, "last_page": 10, "updated_at": "2026-08-01T10:00:00Z"});

        let changes = merged_fields(&local, &newer, BOOK_USER_FIELDS, BOOK_META_FIELDS);
        assert_eq!(changes.get("read"), Some(&json!(true)));
        assert_eq!(changes.get("last_page"), Some(&json!(10)));
        assert_eq!(changes.get("description"), Some(&json!("About")));
        assert_eq!(
            changes.get("updated_at"),
            Some(&json!("2026-09-02T10:00:00Z"))
        );

        assert!(merged_fields(&local, &older, BOOK_USER_FIELDS, &[]).is_empty());
        let locked = json!({"lock": true, "description": ""});
        assert!(merged_fields(&locked, &newer, &[], BOOK_META_FIELDS).is_empty());
    }

    #[test]
    fn copied_records_point_at_local_files() {
        let remote = json!({"id": "book:x", "title": "T", "path": "/remote/x.cbz", "series_id": "series:r", "cover_url": "/remote/covers/x.jpg"});
        let book = copied_book(&remote, Path::new("/here/x.cbz"), Some("s1"), None);
        assert_eq!(book["path"], json!("/here/x.cbz"));
        assert_eq!(book["series_id"], json!("series:s1"));
        assert!(book.get("cover_url").is_none());
        assert!(book.get("id").is_none());

        let web = json!({"cover_url": "https://img/x.jpg"});
        let book = copied_book(&web, Path::new("/here/x.cbz"), None, None);
        assert_eq!(book["cover_url"], json!("https://img/x.jpg"));

        assert_eq!(record_key("book:⟨a-b⟩"), "a-b");
        assert_eq!(record_key("abc"), "abc");
        let tmp = tempfile::tempdir().unwrap();
        std::fs::write(tmp.path().join("a.cbz"), b"").unwrap();
        assert_eq!(
            unique_destination(tmp.path(), "a.cbz").file_name().unwrap(),
            "a (2).cbz"
        );
        assert_eq!(sanitize_file_name("../..:x?"), "x");
    }
}

#[cfg(test)]
mod db_tests {
    use super::*;
    use crate::models::BookRecord;

    async fn repo(dir: &tempfile::TempDir) -> SurrealRepo {
        SurrealRepo::open(dir.path().to_str().unwrap())
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn two_libraries_converge_on_the_latest_reading_state() {
        let (dir_a, dir_b) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
        let (a, b) = (repo(&dir_a).await, repo(&dir_b).await);
        let base_a = dir_a.path().to_str().unwrap();
        let base_b = dir_b.path().to_str().unwrap();

        let book = |title: &str| BookRecord {
            title: title.into(),
            issue_number: Some("1".into()),
            external_id: format!("manual_book_{}", rand::random::<u32>()),
            ..Default::default()
        };
        let on_a = a.create_book(book("Saga")).await.unwrap();
        let on_b = b.create_book(book("Saga")).await.unwrap();
        b.create_book(book("Only on B")).await.unwrap();
        a.upsert_api_credential("metron_api_key", "secret")
            .await
            .unwrap();

        let id_b = on_b.id.as_ref().unwrap().to_string();
        b.update_reading_progress(&id_b, 12).await.unwrap();

        let from_b = build_manifest(&b, base_b, "dev-b", "B").await.unwrap();
        let report = merge(&a, base_a, &from_b).await.unwrap();
        assert_eq!(report.books_matched, 1);
        assert_eq!(report.books_updated, 1, "B read the book last");

        let id_a = on_a.id.as_ref().unwrap().to_string();
        let merged = a.get_book_by_id(&id_a).await.unwrap().unwrap();
        assert_eq!(merged.last_page, 12);

        let again = merge(&a, base_a, &from_b).await.unwrap();
        assert_eq!(again.books_updated, 0, "a second sync changes nothing");

        let from_a = build_manifest(&a, base_a, "dev-a", "A").await.unwrap();
        let report = merge(&b, base_b, &from_a).await.unwrap();
        assert_eq!(report.credentials_added, 1);
        assert_eq!(report.books_updated, 0);
        assert_eq!(
            b.get_all_api_credentials()
                .await
                .unwrap()
                .get("metron_api_key"),
            Some(&"secret".to_string())
        );

        let matches = match_records(&a, &from_b).await.unwrap();
        let missing = missing_books(&from_b, &matches);
        assert!(missing.is_empty(), "books without a file cannot be copied");

        let remote = from_b
            .books
            .iter()
            .find(|v| str_of(v, "title") == "Only on B")
            .unwrap();
        let key = record_key(str_of(remote, "id"));
        upsert_record(
            &a,
            "book",
            &key,
            copied_book(remote, Path::new("/x/y.cbz"), None, None),
        )
        .await
        .unwrap();
        let copied = a.get_book_by_id(&key).await.unwrap().unwrap();
        assert_eq!(copied.path, "/x/y.cbz");
        let matches = match_records(&a, &from_b).await.unwrap();
        assert_eq!(
            matches.books.get(&key),
            Some(&key),
            "copied books keep their id"
        );
    }
}

use crate::services::comic_archive::ArchiveKind;
use futures::StreamExt;
use reqwest::{Client, Method, RequestBuilder, Response, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fmt;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tracing::{debug, info, warn};

pub const CLIENT_NAME: &str = "Cosmic Comics";
pub const BOOK_PAGE_TICKS: i64 = 10_000;
pub const BOOK_FRACTION_TICKS: i64 = 10_000_000;
pub const BOOK_FINISHED_FRACTION: f64 = 0.98;
pub const BOOK_CACHE_MAX_BOOKS: usize = 8;
const ITEM_FIELDS: &str =
    "Overview,Path,PrimaryImageAspectRatio,ChildCount,DateCreated,MediaSources";

pub type ProgressFn = Arc<dyn Fn(u64, Option<u64>) + Send + Sync>;

#[derive(Debug)]
pub enum JellyfinError {
    Unauthorized,
    NotFound,
    Status(u16, String),
    Network(String),
    Parse(String),
    Io(String),
    Invalid(String),
}

impl fmt::Display for JellyfinError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Unauthorized => write!(f, "unauthorized"),
            Self::NotFound => write!(f, "not_found"),
            Self::Status(code, body) => write!(f, "Jellyfin returned HTTP {code}: {body}"),
            Self::Network(e) => write!(f, "Could not reach the Jellyfin server: {e}"),
            Self::Parse(e) => write!(f, "Unexpected Jellyfin response: {e}"),
            Self::Io(e) => write!(f, "{e}"),
            Self::Invalid(e) => write!(f, "{e}"),
        }
    }
}

impl std::error::Error for JellyfinError {}

impl From<reqwest::Error> for JellyfinError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_decode() {
            Self::Parse(e.to_string())
        } else {
            Self::Network(e.without_url().to_string())
        }
    }
}

impl From<std::io::Error> for JellyfinError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, JellyfinError>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct JellyfinServer {
    pub id: String,
    pub name: String,
    pub url: String,
    pub user_id: String,
    pub user_name: String,
    pub access_token: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub allow_insecure: bool,
    /// Name of the device this sign-in was copied from by device sync. Its
    /// token belongs to that device until [`rebind`] gets one for this one.
    #[serde(default)]
    pub borrowed_from: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct JellyfinServerInfo {
    pub id: String,
    pub name: String,
    pub url: String,
    pub user_id: String,
    pub user_name: String,
    pub version: String,
    pub allow_insecure: bool,
    pub borrowed_from: Option<String>,
}

impl From<&JellyfinServer> for JellyfinServerInfo {
    fn from(s: &JellyfinServer) -> Self {
        Self {
            id: s.id.clone(),
            name: s.name.clone(),
            url: s.url.clone(),
            user_id: s.user_id.clone(),
            user_name: s.user_name.clone(),
            version: s.version.clone(),
            allow_insecure: s.allow_insecure,
            borrowed_from: s.borrowed_from.clone(),
        }
    }
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct StoreData {
    #[serde(default)]
    device_id: String,
    #[serde(default)]
    servers: Vec<JellyfinServer>,
}

static STORE_LOCK: Mutex<()> = Mutex::new(());

pub struct JellyfinStore {
    file: PathBuf,
}

impl JellyfinStore {
    pub fn new(base_path: &str) -> Self {
        Self {
            file: PathBuf::from(base_path)
                .join("jellyfin")
                .join("servers.json"),
        }
    }

    fn read(&self) -> StoreData {
        std::fs::read_to_string(&self.file)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    fn write(&self, data: &StoreData) -> Result<()> {
        if let Some(dir) = self.file.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let tmp = self.file.with_extension("json.tmp");
        std::fs::write(
            &tmp,
            serde_json::to_vec_pretty(data).map_err(|e| JellyfinError::Io(e.to_string()))?,
        )?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&tmp, std::fs::Permissions::from_mode(0o600));
        }
        std::fs::rename(&tmp, &self.file)?;
        Ok(())
    }

    pub fn device_id(&self) -> Result<String> {
        let _guard = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut data = self.read();
        if data.device_id.is_empty() {
            data.device_id = format!("{:032x}", rand::random::<u128>());
            self.write(&data)?;
        }
        Ok(data.device_id)
    }

    pub fn servers(&self) -> Vec<JellyfinServer> {
        let _guard = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        self.read().servers
    }

    pub fn get(&self, id: &str) -> Option<JellyfinServer> {
        self.servers().into_iter().find(|s| s.id == id)
    }

    pub fn upsert(&self, server: JellyfinServer) -> Result<()> {
        let _guard = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut data = self.read();
        match data.servers.iter_mut().find(|s| s.id == server.id) {
            Some(existing) => *existing = server,
            None => data.servers.push(server),
        }
        self.write(&data)
    }

    pub fn remove(&self, id: &str) -> Result<()> {
        let _guard = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let mut data = self.read();
        data.servers.retain(|s| s.id != id);
        self.write(&data)
    }
}

pub fn normalize_server_url(input: &str) -> Result<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(JellyfinError::Invalid("Enter the server address".into()));
    }
    let with_scheme = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    let mut url = url::Url::parse(&with_scheme)
        .map_err(|_| JellyfinError::Invalid(format!("'{trimmed}' is not a valid address")))?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err(JellyfinError::Invalid(format!(
            "'{trimmed}' is not a valid address"
        )));
    }
    url.set_query(None);
    url.set_fragment(None);
    Ok(url.as_str().trim_end_matches('/').to_string())
}

pub fn candidate_urls(input: &str) -> Result<Vec<String>> {
    let trimmed = input.trim();
    if trimmed.contains("://") {
        return Ok(vec![normalize_server_url(trimmed)?]);
    }
    let https = normalize_server_url(trimmed)?;
    let http = https.replacen("https://", "http://", 1);
    Ok(vec![https, http])
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawPublicInfo {
    id: String,
    server_name: String,
    version: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawAuthUser {
    id: String,
    name: String,
    server_id: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawAuthResult {
    access_token: String,
    server_id: String,
    user: RawAuthUser,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawQuickConnect {
    secret: String,
    code: String,
    authenticated: bool,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawUserData {
    played: bool,
    is_favorite: bool,
    playback_position_ticks: i64,
    play_count: i64,
    played_percentage: Option<f64>,
    last_played_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawMediaSource {
    container: Option<String>,
    size: Option<i64>,
    path: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawPerson {
    name: String,
    #[serde(rename = "Type")]
    kind: Option<String>,
    role: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawItem {
    id: String,
    name: Option<String>,
    #[serde(rename = "Type")]
    kind: String,
    parent_id: Option<String>,
    series_name: Option<String>,
    overview: Option<String>,
    production_year: Option<i32>,
    index_number: Option<i64>,
    is_folder: bool,
    child_count: Option<i64>,
    path: Option<String>,
    container: Option<String>,
    etag: Option<String>,
    date_created: Option<String>,
    collection_type: Option<String>,
    community_rating: Option<f64>,
    genres: Vec<String>,
    image_tags: HashMap<String, String>,
    primary_image_aspect_ratio: Option<f64>,
    user_data: Option<RawUserData>,
    media_sources: Vec<RawMediaSource>,
    people: Vec<RawPerson>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "PascalCase", default)]
struct RawItemsPage {
    items: Vec<RawItem>,
    total_record_count: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct JellyfinPerson {
    pub name: String,
    pub role: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct JellyfinItem {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub is_folder: bool,
    pub is_book: bool,
    pub parent_id: Option<String>,
    pub series_name: Option<String>,
    pub overview: String,
    pub year: Option<i32>,
    pub index_number: Option<i64>,
    pub child_count: Option<i64>,
    pub format: Option<String>,
    pub size: Option<i64>,
    pub path: Option<String>,
    pub image_tag: Option<String>,
    pub aspect_ratio: Option<f64>,
    pub played: bool,
    pub favorite: bool,
    pub resume_page: i64,
    pub resume_fraction: f64,
    pub played_percentage: Option<f64>,
    pub play_count: i64,
    pub last_played: Option<String>,
    pub rating: Option<f64>,
    pub genres: Vec<String>,
    pub people: Vec<JellyfinPerson>,
    pub date_created: Option<String>,
    pub collection_type: Option<String>,
    pub etag: Option<String>,
}

#[derive(Debug, Clone)]
pub struct LibraryBooks {
    pub library_id: String,
    pub library_name: String,
    pub items: Vec<JellyfinItem>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct JellyfinItemsPage {
    pub items: Vec<JellyfinItem>,
    pub total: i64,
    pub start_index: u32,
}

pub(crate) const KNOWN_BOOK_EXTENSIONS: &[&str] = &[
    "cbz", "cbr", "cb7", "cbt", "zip", "rar", "7z", "tar", "pdf", "epub",
];

fn extension_of(path: &str) -> Option<String> {
    let ext = path.rsplit_once('.')?.1.to_ascii_lowercase();
    (!ext.is_empty() && ext.len() <= 5 && ext.chars().all(|c| c.is_ascii_alphanumeric()))
        .then_some(ext)
}

impl RawItem {
    fn book_extension(&self) -> Option<String> {
        self.path
            .as_deref()
            .and_then(extension_of)
            .or_else(|| {
                self.media_sources
                    .first()
                    .and_then(|m| m.path.as_deref())
                    .and_then(extension_of)
            })
            .or_else(|| {
                self.media_sources
                    .first()
                    .and_then(|m| m.container.clone())
                    .map(|c| c.to_ascii_lowercase())
            })
            .or_else(|| self.container.clone().map(|c| c.to_ascii_lowercase()))
    }

    fn into_item(self) -> JellyfinItem {
        let format = self.book_extension();
        let size = self.media_sources.first().and_then(|m| m.size);
        let data = self.user_data.clone().unwrap_or_default();
        let is_book = self.kind == "Book";
        let is_epub = format.as_deref() == Some("epub");
        let (mut resume_page, mut resume_fraction) = if is_epub {
            (
                0,
                (data.playback_position_ticks as f64 / BOOK_FRACTION_TICKS as f64).clamp(0.0, 1.0),
            )
        } else {
            ((data.playback_position_ticks / BOOK_PAGE_TICKS).max(0), 0.0)
        };
        if data.played {
            resume_page = 0;
            resume_fraction = 0.0;
        }
        JellyfinItem {
            image_tag: self.image_tags.get("Primary").cloned(),
            people: self
                .people
                .into_iter()
                .map(|p| JellyfinPerson {
                    role: p
                        .role
                        .filter(|r| !r.is_empty())
                        .or(p.kind)
                        .unwrap_or_default(),
                    name: p.name,
                })
                .collect(),
            id: self.id,
            name: self.name.unwrap_or_default(),
            kind: self.kind,
            is_folder: self.is_folder,
            is_book,
            parent_id: self.parent_id,
            series_name: self.series_name,
            overview: self.overview.unwrap_or_default(),
            year: self.production_year,
            index_number: self.index_number,
            child_count: self.child_count,
            format,
            size,
            path: self.path,
            aspect_ratio: self.primary_image_aspect_ratio,
            played: data.played,
            favorite: data.is_favorite,
            resume_page,
            resume_fraction,
            played_percentage: data.played_percentage,
            play_count: data.play_count,
            last_played: data.last_played_date,
            rating: self.community_rating,
            genres: self.genres,
            date_created: self.date_created,
            collection_type: self.collection_type,
            etag: self.etag,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct JellyfinPublicInfo {
    pub url: String,
    pub id: String,
    pub name: String,
    pub version: String,
    pub quick_connect: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct QuickConnectStart {
    pub secret: String,
    pub code: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ItemsQuery {
    pub parent_id: Option<String>,
    pub search_term: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    #[serde(default)]
    pub filters: Vec<String>,
    #[serde(default)]
    pub recursive: bool,
    #[serde(default)]
    pub include_types: Vec<String>,
    #[serde(default)]
    pub start_index: u32,
    pub limit: Option<u32>,
    #[serde(default)]
    pub extra_fields: Option<String>,
}

#[derive(Clone)]
pub struct JellyfinClient {
    http: Client,
    base: String,
    device_id: String,
    token: Option<String>,
    user_id: Option<String>,
}

fn device_name() -> String {
    format!("{} ({})", CLIENT_NAME, std::env::consts::OS)
}

fn build_http(allow_insecure: bool) -> Client {
    Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .danger_accept_invalid_certs(allow_insecure)
        .build()
        .unwrap_or_else(|_| Client::new())
}

impl JellyfinClient {
    pub fn anonymous(base_url: &str, device_id: &str, allow_insecure: bool) -> Self {
        Self {
            http: build_http(allow_insecure),
            base: base_url.trim_end_matches('/').to_string(),
            device_id: device_id.to_string(),
            token: None,
            user_id: None,
        }
    }

    pub fn for_server(server: &JellyfinServer, device_id: &str) -> Self {
        Self {
            token: Some(server.access_token.clone()),
            user_id: Some(server.user_id.clone()),
            ..Self::anonymous(&server.url, device_id, server.allow_insecure)
        }
    }

    fn authorization(&self) -> String {
        let mut header = format!(
            "MediaBrowser Client=\"{}\", Device=\"{}\", DeviceId=\"{}\", Version=\"{}\"",
            CLIENT_NAME,
            device_name(),
            self.device_id,
            env!("CARGO_PKG_VERSION")
        );
        if let Some(token) = &self.token {
            header.push_str(&format!(", Token=\"{token}\""));
        }
        header
    }

    fn request(&self, method: Method, path: &str) -> RequestBuilder {
        self.http
            .request(method, format!("{}{}", self.base, path))
            .header("Authorization", self.authorization())
            .header("Accept", "application/json")
    }

    fn user_id(&self) -> Result<&str> {
        self.user_id.as_deref().ok_or(JellyfinError::Unauthorized)
    }

    async fn check(response: Response) -> Result<Response> {
        let status = response.status();
        if status.is_success() {
            return Ok(response);
        }
        match status {
            StatusCode::UNAUTHORIZED => Err(JellyfinError::Unauthorized),
            StatusCode::NOT_FOUND => Err(JellyfinError::NotFound),
            _ => {
                let body = response.text().await.unwrap_or_default();
                Err(JellyfinError::Status(
                    status.as_u16(),
                    body.chars().take(200).collect(),
                ))
            }
        }
    }

    async fn send(&self, builder: RequestBuilder) -> Result<Response> {
        Self::check(builder.timeout(Duration::from_secs(30)).send().await?).await
    }

    async fn json<T: for<'de> Deserialize<'de>>(&self, builder: RequestBuilder) -> Result<T> {
        self.send(builder)
            .await?
            .json::<T>()
            .await
            .map_err(|e| JellyfinError::Parse(e.to_string()))
    }

    async fn with_fallback(
        &self,
        primary: RequestBuilder,
        legacy: RequestBuilder,
    ) -> Result<Response> {
        match self.send(primary).await {
            Err(JellyfinError::NotFound) => self.send(legacy).await,
            Err(JellyfinError::Status(405, _)) => self.send(legacy).await,
            other => other,
        }
    }

    pub async fn public_info(&self) -> Result<JellyfinPublicInfo> {
        let raw: RawPublicInfo = self
            .json(self.request(Method::GET, "/System/Info/Public"))
            .await?;
        if raw.id.is_empty() && raw.version.is_empty() {
            return Err(JellyfinError::Parse("this is not a Jellyfin server".into()));
        }
        let quick_connect = match self
            .send(self.request(Method::GET, "/QuickConnect/Enabled"))
            .await
        {
            Ok(resp) => resp.json::<bool>().await.unwrap_or(false),
            Err(_) => false,
        };
        Ok(JellyfinPublicInfo {
            url: self.base.clone(),
            id: raw.id,
            name: raw.server_name,
            version: raw.version,
            quick_connect,
        })
    }

    fn build_server(
        &self,
        info: &JellyfinPublicInfo,
        auth: RawAuthResult,
        allow_insecure: bool,
    ) -> Result<JellyfinServer> {
        if auth.access_token.is_empty() || auth.user.id.is_empty() {
            return Err(JellyfinError::Parse(
                "no access token in the response".into(),
            ));
        }
        let server_id = if auth.server_id.is_empty() {
            auth.user.server_id.clone()
        } else {
            auth.server_id.clone()
        };
        let server_id = if server_id.is_empty() {
            info.id.clone()
        } else {
            server_id
        };
        Ok(JellyfinServer {
            id: format!("{}-{}", server_id, auth.user.id),
            name: info.name.clone(),
            url: self.base.clone(),
            user_id: auth.user.id,
            user_name: auth.user.name,
            access_token: auth.access_token,
            version: info.version.clone(),
            allow_insecure,
            borrowed_from: None,
        })
    }

    pub async fn login(
        &self,
        info: &JellyfinPublicInfo,
        username: &str,
        password: &str,
        allow_insecure: bool,
    ) -> Result<JellyfinServer> {
        let auth: RawAuthResult = match self
            .json(
                self.request(Method::POST, "/Users/AuthenticateByName")
                    .json(&json!({ "Username": username, "Pw": password })),
            )
            .await
        {
            Ok(auth) => auth,
            Err(JellyfinError::Unauthorized) => {
                return Err(JellyfinError::Invalid("Wrong username or password".into()))
            }
            Err(e) => return Err(e),
        };
        self.build_server(info, auth, allow_insecure)
    }

    pub async fn quick_connect_start(&self) -> Result<QuickConnectStart> {
        let raw: RawQuickConnect = self
            .json(self.request(Method::POST, "/QuickConnect/Initiate"))
            .await?;
        Ok(QuickConnectStart {
            secret: raw.secret,
            code: raw.code,
        })
    }

    /// Approves a Quick Connect code with this (signed-in) session.
    pub async fn quick_connect_authorize(&self, code: &str) -> Result<()> {
        let user_id = self.user_id()?;
        self.send(
            self.request(Method::POST, "/QuickConnect/Authorize")
                .query(&[("code", code), ("userId", user_id)]),
        )
        .await
        .map(|_| ())
    }

    pub async fn quick_connect_poll(
        &self,
        info: &JellyfinPublicInfo,
        secret: &str,
        allow_insecure: bool,
    ) -> Result<Option<JellyfinServer>> {
        let state: RawQuickConnect = self
            .json(
                self.request(Method::GET, "/QuickConnect/Connect")
                    .query(&[("secret", secret)]),
            )
            .await?;
        if !state.authenticated {
            return Ok(None);
        }
        let auth: RawAuthResult = self
            .json(
                self.request(Method::POST, "/Users/AuthenticateWithQuickConnect")
                    .json(&json!({ "Secret": secret })),
            )
            .await?;
        self.build_server(info, auth, allow_insecure).map(Some)
    }

    pub async fn views(&self) -> Result<Vec<JellyfinItem>> {
        let user_id = self.user_id()?;
        let page: RawItemsPage = self
            .with_fallback(
                self.request(Method::GET, "/UserViews")
                    .query(&[("userId", user_id)]),
                self.request(Method::GET, &format!("/Users/{user_id}/Views")),
            )
            .await?
            .json()
            .await
            .map_err(|e| JellyfinError::Parse(e.to_string()))?;
        Ok(page.items.into_iter().map(RawItem::into_item).collect())
    }

    pub async fn items(&self, query: &ItemsQuery) -> Result<JellyfinItemsPage> {
        let user_id = self.user_id()?;
        let mut params: Vec<(&str, String)> = vec![
            ("userId", user_id.to_string()),
            (
                "fields",
                match query.extra_fields.as_deref() {
                    Some(extra) if !extra.is_empty() => format!("{ITEM_FIELDS},{extra}"),
                    _ => ITEM_FIELDS.to_string(),
                },
            ),
            ("enableUserData", "true".into()),
            ("enableImageTypes", "Primary".into()),
            ("imageTypeLimit", "1".into()),
            ("startIndex", query.start_index.to_string()),
            ("limit", query.limit.unwrap_or(60).min(500).to_string()),
            (
                "sortBy",
                query.sort_by.clone().unwrap_or_else(|| "SortName".into()),
            ),
            (
                "sortOrder",
                query
                    .sort_order
                    .clone()
                    .unwrap_or_else(|| "Ascending".into()),
            ),
            ("recursive", query.recursive.to_string()),
        ];
        if let Some(parent) = &query.parent_id {
            params.push(("parentId", parent.clone()));
        }
        if let Some(term) = query
            .search_term
            .as_deref()
            .filter(|t| !t.trim().is_empty())
        {
            params.push(("searchTerm", term.trim().to_string()));
        }
        if !query.filters.is_empty() {
            params.push(("filters", query.filters.join(",")));
        }
        let types = if query.include_types.is_empty() {
            "Book,Folder,BoxSet".to_string()
        } else {
            query.include_types.join(",")
        };
        params.push(("includeItemTypes", types));

        let page: RawItemsPage = self
            .json(self.request(Method::GET, "/Items").query(&params))
            .await?;
        Ok(JellyfinItemsPage {
            total: page.total_record_count.max(page.items.len() as i64),
            start_index: query.start_index,
            items: page.items.into_iter().map(RawItem::into_item).collect(),
        })
    }

    pub async fn item(&self, item_id: &str) -> Result<JellyfinItem> {
        let user_id = self.user_id()?;
        let fields = format!("{ITEM_FIELDS},People,Genres");
        let raw: RawItem = self
            .with_fallback(
                self.request(Method::GET, &format!("/Items/{item_id}"))
                    .query(&[("userId", user_id), ("fields", fields.as_str())]),
                self.request(Method::GET, &format!("/Users/{user_id}/Items/{item_id}"))
                    .query(&[("fields", fields.as_str())]),
            )
            .await?
            .json()
            .await
            .map_err(|e| JellyfinError::Parse(e.to_string()))?;
        Ok(raw.into_item())
    }

    pub async fn resume(&self, limit: u32) -> Result<Vec<JellyfinItem>> {
        let user_id = self.user_id()?;
        let params = [
            ("userId", user_id.to_string()),
            ("includeItemTypes", "Book".to_string()),
            ("mediaTypes", "Book".to_string()),
            ("enableImageTypes", "Primary".to_string()),
            ("fields", ITEM_FIELDS.to_string()),
            ("limit", limit.to_string()),
        ];
        let legacy_params: Vec<_> = params
            .iter()
            .filter(|(k, _)| *k != "userId")
            .cloned()
            .collect();
        let page: RawItemsPage = self
            .with_fallback(
                self.request(Method::GET, "/UserItems/Resume")
                    .query(&params),
                self.request(Method::GET, &format!("/Users/{user_id}/Items/Resume"))
                    .query(&legacy_params),
            )
            .await?
            .json()
            .await
            .map_err(|e| JellyfinError::Parse(e.to_string()))?;
        Ok(page.items.into_iter().map(RawItem::into_item).collect())
    }

    pub async fn books_by_library(&self, cap_per_library: usize) -> Result<Vec<LibraryBooks>> {
        const PAGE: u32 = 500;
        let mut out = Vec::new();
        for view in self.views().await? {
            let kind = view
                .collection_type
                .clone()
                .unwrap_or_default()
                .to_lowercase();
            if !matches!(kind.as_str(), "books" | "homevideos" | "mixed" | "") {
                continue;
            }
            let mut items: Vec<JellyfinItem> = Vec::new();
            loop {
                let page = self
                    .items(&ItemsQuery {
                        parent_id: Some(view.id.clone()),
                        recursive: true,
                        include_types: vec!["Book".into()],
                        start_index: items.len() as u32,
                        limit: Some(PAGE),
                        extra_fields: Some("People,Genres".into()),
                        ..Default::default()
                    })
                    .await?;
                let received = page.items.len();
                items.extend(page.items);
                if received == 0
                    || items.len() as i64 >= page.total
                    || items.len() >= cap_per_library
                {
                    break;
                }
            }
            out.push(LibraryBooks {
                library_id: view.id,
                library_name: view.name,
                items,
            });
        }
        Ok(out)
    }

    /// First book (by sort name) anywhere below a folder, used as the cover
    /// of folders that have no image of their own.
    pub async fn first_book(&self, parent_id: &str) -> Result<Option<JellyfinItem>> {
        let page = self
            .items(&ItemsQuery {
                parent_id: Some(parent_id.to_string()),
                recursive: true,
                include_types: vec!["Book".into()],
                limit: Some(1),
                ..Default::default()
            })
            .await?;
        Ok(page.items.into_iter().next())
    }

    /// Every book below a folder (or the book itself), in sort-name order.
    pub async fn books_under(&self, item: &JellyfinItem) -> Result<Vec<JellyfinItem>> {
        if item.is_book {
            return Ok(vec![item.clone()]);
        }
        const PAGE: u32 = 500;
        let mut books: Vec<JellyfinItem> = Vec::new();
        loop {
            let page = self
                .items(&ItemsQuery {
                    parent_id: Some(item.id.clone()),
                    recursive: true,
                    include_types: vec!["Book".into()],
                    start_index: books.len() as u32,
                    limit: Some(PAGE),
                    extra_fields: Some("People,Genres".into()),
                    ..Default::default()
                })
                .await?;
            let received = page.items.len();
            books.extend(page.items);
            if received == 0 || books.len() as i64 >= page.total {
                return Ok(books);
            }
        }
    }

    pub async fn report_progress(&self, item_id: &str, page: i64, page_count: i64) -> Result<()> {
        let user_id = self.user_id()?;
        let finished = page_count > 0 && page >= page_count - 1;
        let mut body = json!({
            "PlaybackPositionTicks": if finished { 0 } else { page.max(0) * BOOK_PAGE_TICKS },
            "LastPlayedDate": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        });
        if finished {
            body["Played"] = Value::Bool(true);
        }
        self.with_fallback(
            self.request(Method::POST, &format!("/UserItems/{item_id}/UserData"))
                .query(&[("userId", user_id)])
                .json(&body),
            self.request(
                Method::POST,
                &format!("/Users/{user_id}/Items/{item_id}/UserData"),
            )
            .json(&body),
        )
        .await
        .map(|_| ())
    }

    pub async fn report_fraction(&self, item_id: &str, fraction: f64) -> Result<()> {
        let user_id = self.user_id()?;
        let fraction = fraction.clamp(0.0, 1.0);
        let finished = fraction >= BOOK_FINISHED_FRACTION;
        let mut body = json!({
            "PlaybackPositionTicks": if finished { 0 } else { (fraction * BOOK_FRACTION_TICKS as f64).round() as i64 },
            "LastPlayedDate": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        });
        if finished {
            body["Played"] = Value::Bool(true);
        }
        self.with_fallback(
            self.request(Method::POST, &format!("/UserItems/{item_id}/UserData"))
                .query(&[("userId", user_id)])
                .json(&body),
            self.request(
                Method::POST,
                &format!("/Users/{user_id}/Items/{item_id}/UserData"),
            )
            .json(&body),
        )
        .await
        .map(|_| ())
    }

    pub async fn set_played(&self, item_id: &str, played: bool) -> Result<()> {
        let user_id = self.user_id()?;
        let method = if played { Method::POST } else { Method::DELETE };
        self.with_fallback(
            self.request(method.clone(), &format!("/UserPlayedItems/{item_id}"))
                .query(&[("userId", user_id)]),
            self.request(method, &format!("/Users/{user_id}/PlayedItems/{item_id}")),
        )
        .await
        .map(|_| ())
    }

    pub async fn set_favorite(&self, item_id: &str, favorite: bool) -> Result<()> {
        let user_id = self.user_id()?;
        let method = if favorite {
            Method::POST
        } else {
            Method::DELETE
        };
        self.with_fallback(
            self.request(method.clone(), &format!("/UserFavoriteItems/{item_id}"))
                .query(&[("userId", user_id)]),
            self.request(method, &format!("/Users/{user_id}/FavoriteItems/{item_id}")),
        )
        .await
        .map(|_| ())
    }

    pub async fn image(
        &self,
        item_id: &str,
        tag: Option<&str>,
        max_width: u32,
    ) -> Result<(Vec<u8>, String)> {
        let mut params = vec![
            ("maxWidth", max_width.to_string()),
            ("quality", "90".to_string()),
        ];
        if let Some(tag) = tag {
            params.push(("tag", tag.to_string()));
        }
        let response = self
            .send(
                self.request(Method::GET, &format!("/Items/{item_id}/Images/Primary"))
                    .query(&params),
            )
            .await?;
        let content_type = response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("image/jpeg")
            .to_string();
        Ok((response.bytes().await?.to_vec(), content_type))
    }

    pub async fn download(
        &self,
        item_id: &str,
        dest: &Path,
        on_progress: &ProgressFn,
    ) -> Result<u64> {
        // `/Download` answers 404 on some servers (item hidden from the
        // download view, proxies); `/File` serves the same original file.
        let fetch = |endpoint: &str| {
            self.http
                .get(format!("{}/Items/{item_id}/{endpoint}", self.base))
                .header("Authorization", self.authorization())
                .header("Accept", "*/*")
                .send()
        };
        let response = match Self::check(fetch("Download").await?).await {
            Err(JellyfinError::NotFound) => {
                warn!(
                    "[jellyfin] /Items/{}/Download answered 404, trying /File",
                    item_id
                );
                Self::check(fetch("File").await?).await?
            }
            other => other?,
        };
        let total = response.content_length();
        if let Some(dir) = dest.parent() {
            tokio::fs::create_dir_all(dir).await?;
        }
        let mut file = tokio::fs::File::create(dest).await?;
        let mut stream = response.bytes_stream();
        let mut written = 0u64;
        let mut last_report = 0u64;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk).await?;
            written += chunk.len() as u64;
            if written - last_report >= 256 * 1024 {
                last_report = written;
                on_progress(written, total);
            }
        }
        file.flush().await?;
        on_progress(written, total);
        Ok(written)
    }
}

/// Replaces a server's sign-in with a session of this device, approved by the
/// current one through Quick Connect. Jellyfin binds tokens to the device that
/// signed in, so a token copied from another device can browse but may be
/// refused for downloads.
pub async fn rebind(server: &JellyfinServer, device_id: &str) -> Result<JellyfinServer> {
    let info = discover(&server.url, device_id, server.allow_insecure).await?;
    if !info.quick_connect {
        return Err(JellyfinError::Invalid(
            "Quick Connect is off on this server: sign in again instead".into(),
        ));
    }
    let anonymous = JellyfinClient::anonymous(&info.url, device_id, server.allow_insecure);
    let start = anonymous.quick_connect_start().await?;
    JellyfinClient::for_server(server, device_id)
        .quick_connect_authorize(&start.code)
        .await?;
    for _ in 0..10 {
        if let Some(fresh) = anonymous
            .quick_connect_poll(&info, &start.secret, server.allow_insecure)
            .await?
        {
            info!("[jellyfin] '{}' now has a session of its own", fresh.name);
            return Ok(JellyfinServer {
                borrowed_from: None,
                ..fresh
            });
        }
        tokio::time::sleep(Duration::from_millis(300)).await;
    }
    Err(JellyfinError::Invalid(
        "The server did not confirm the new session".into(),
    ))
}

/// Gives every sign-in copied from another device a session of its own.
/// Failures are kept for later: the copied token still works for browsing.
pub async fn rebind_borrowed(base_path: &str) {
    let store = JellyfinStore::new(base_path);
    let Ok(device_id) = store.device_id() else {
        return;
    };
    for server in store
        .servers()
        .into_iter()
        .filter(|s| s.borrowed_from.is_some())
    {
        match rebind(&server, &device_id).await {
            Ok(fresh) => {
                if fresh.id != server.id {
                    let _ = store.remove(&server.id);
                }
                let _ = store.upsert(fresh);
            }
            Err(e) => warn!("[jellyfin] could not rebind '{}': {}", server.name, e),
        }
    }
}

pub async fn discover(
    input: &str,
    device_id: &str,
    allow_insecure: bool,
) -> Result<JellyfinPublicInfo> {
    let mut last_error = JellyfinError::Invalid("Enter the server address".into());
    for url in candidate_urls(input)? {
        match JellyfinClient::anonymous(&url, device_id, allow_insecure)
            .public_info()
            .await
        {
            Ok(info) => return Ok(info),
            Err(e) => {
                debug!("[jellyfin] {} did not answer: {}", url, e);
                last_error = e;
            }
        }
    }
    Err(last_error)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Manifest {
    stamp: String,
    file: String,
    format: String,
    opened_at: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct PreparedBook {
    pub path: String,
    pub format: String,
    pub resume_page: i64,
    pub resume_fraction: f64,
    pub title: String,
    pub from_cache: bool,
}

fn books_root(cache_root: &Path, server_id: &str) -> PathBuf {
    cache_root.join("books").join(server_id)
}

fn read_manifest(dir: &Path) -> Option<Manifest> {
    serde_json::from_slice(&std::fs::read(dir.join("manifest.json")).ok()?).ok()
}

fn write_manifest(dir: &Path, manifest: &Manifest) -> Result<()> {
    std::fs::write(
        dir.join("manifest.json"),
        serde_json::to_vec(manifest).map_err(|e| JellyfinError::Io(e.to_string()))?,
    )?;
    Ok(())
}

fn unsupported_message(item: &JellyfinItem) -> String {
    format!(
        "'{}' books ({}) cannot be read",
        item.format.clone().unwrap_or_default().to_uppercase(),
        item.name
    )
}

pub(crate) fn detect_format(file: &Path, declared: Option<&str>) -> Option<String> {
    let declared = declared.map(str::to_ascii_lowercase);
    if matches!(declared.as_deref(), Some("pdf") | Some("epub")) {
        return declared;
    }
    let mut head = [0u8; 512];
    let read = std::fs::File::open(file)
        .and_then(|mut f| std::io::Read::read(&mut f, &mut head))
        .unwrap_or(0);
    if head[..read].starts_with(b"%PDF") {
        return Some("pdf".into());
    }
    match ArchiveKind::from_header(&head[..read]) {
        Some(ArchiveKind::Zip) => Some("cbz".into()),
        Some(ArchiveKind::Rar) => Some("cbr".into()),
        Some(ArchiveKind::SevenZ) => Some("cb7".into()),
        Some(ArchiveKind::Tar) | Some(ArchiveKind::TarGz) => Some("cbt".into()),
        None => declared.filter(|ext| KNOWN_BOOK_EXTENSIONS.contains(&ext.as_str())),
    }
}

fn evict_old_books(root: &Path, keep: &str) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    let mut books: Vec<(i64, PathBuf)> = entries
        .flatten()
        .filter(|e| e.path().is_dir() && e.file_name().to_string_lossy() != keep)
        .map(|e| {
            let opened = read_manifest(&e.path()).map(|m| m.opened_at).unwrap_or(0);
            (opened, e.path())
        })
        .collect();
    books.sort_by_key(|book| std::cmp::Reverse(book.0));
    for (_, dir) in books.into_iter().skip(BOOK_CACHE_MAX_BOOKS - 1) {
        if let Err(e) = std::fs::remove_dir_all(&dir) {
            warn!("[jellyfin] could not evict {:?}: {}", dir, e);
        }
    }
}

pub async fn prepare_book(
    client: &JellyfinClient,
    server_id: &str,
    item_id: &str,
    cache_root: &Path,
    on_progress: &ProgressFn,
) -> Result<PreparedBook> {
    if item_id.is_empty()
        || item_id.contains(['/', '\\', '.'])
        || server_id.contains(['/', '\\', '.'])
    {
        return Err(JellyfinError::Invalid("Invalid item id".into()));
    }
    let item = client.item(item_id).await?;
    if !item.is_book {
        return Err(JellyfinError::Invalid("This item is not a book".into()));
    }
    if item
        .format
        .as_deref()
        .is_some_and(|f| !KNOWN_BOOK_EXTENSIONS.contains(&f.to_ascii_lowercase().as_str()))
    {
        return Err(JellyfinError::Invalid(unsupported_message(&item)));
    }
    let stamp = format!(
        "{}:{}",
        item.etag.clone().unwrap_or_default(),
        item.size.unwrap_or_default()
    );
    let root = books_root(cache_root, server_id);
    let dir = root.join(item_id);
    let now = chrono::Utc::now().timestamp();

    if let Some(manifest) = read_manifest(&dir) {
        let file = dir.join(&manifest.file);
        if manifest.stamp == stamp && file.is_file() {
            write_manifest(
                &dir,
                &Manifest {
                    opened_at: now,
                    ..manifest.clone()
                },
            )?;
            info!("[jellyfin] reusing cached book {}", item_id);
            return Ok(PreparedBook {
                path: file.to_string_lossy().to_string(),
                format: manifest.format,
                resume_page: item.resume_page,
                resume_fraction: item.resume_fraction,
                title: item.name,
                from_cache: true,
            });
        }
    }

    if dir.exists() {
        let _ = std::fs::remove_dir_all(&dir);
    }
    std::fs::create_dir_all(&dir)?;
    let part = dir.join("book.part");
    if let Err(e) = client.download(item_id, &part, on_progress).await {
        let _ = std::fs::remove_dir_all(&dir);
        return Err(e);
    }
    let Some(format) = detect_format(&part, item.format.as_deref()) else {
        let _ = std::fs::remove_dir_all(&dir);
        return Err(JellyfinError::Invalid(unsupported_message(&item)));
    };
    let file_name = format!("book.{format}");
    std::fs::rename(&part, dir.join(&file_name))?;
    write_manifest(
        &dir,
        &Manifest {
            stamp,
            file: file_name.clone(),
            format: format.clone(),
            opened_at: now,
        },
    )?;
    evict_old_books(&root, item_id);
    Ok(PreparedBook {
        path: dir.join(file_name).to_string_lossy().to_string(),
        format,
        resume_page: item.resume_page,
        resume_fraction: item.resume_fraction,
        title: item.name,
        from_cache: false,
    })
}

pub async fn cached_image(
    client: &JellyfinClient,
    server_id: &str,
    item_id: &str,
    tag: Option<&str>,
    max_width: u32,
    cache_root: &Path,
) -> Result<(Vec<u8>, String)> {
    let safe = |s: &str| {
        s.chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
            .collect::<String>()
    };
    let name = format!(
        "{}_{}_{}_{}",
        safe(server_id),
        safe(item_id),
        safe(tag.unwrap_or("notag")),
        max_width
    );
    let dir = cache_root.join("images");
    let data_path = dir.join(format!("{name}.bin"));
    let type_path = dir.join(format!("{name}.type"));
    if let (Ok(bytes), Ok(kind)) = (
        std::fs::read(&data_path),
        std::fs::read_to_string(&type_path),
    ) {
        if !bytes.is_empty() {
            return Ok((bytes, kind));
        }
    }
    let (bytes, kind) = client.image(item_id, tag, max_width).await?;
    if std::fs::create_dir_all(&dir).is_ok() {
        let _ = std::fs::write(&data_path, &bytes);
        let _ = std::fs::write(&type_path, &kind);
    }
    Ok((bytes, kind))
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{body_json, header_exists, method, path, query_param};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn signed_in(server: &MockServer) -> JellyfinClient {
        JellyfinClient::for_server(
            &JellyfinServer {
                id: "srv-usr".into(),
                name: "Home".into(),
                url: server.uri(),
                user_id: "usr".into(),
                user_name: "me".into(),
                access_token: "tok".into(),
                version: "10.10.0".into(),
                allow_insecure: false,
                borrowed_from: None,
            },
            "device1",
        )
    }

    fn noop() -> ProgressFn {
        Arc::new(|_, _| {})
    }

    #[test]
    fn url_normalisation() {
        assert_eq!(
            normalize_server_url(" jelly.example.com/ ").unwrap(),
            "https://jelly.example.com"
        );
        assert_eq!(
            normalize_server_url("http://10.0.0.5:8096/").unwrap(),
            "http://10.0.0.5:8096"
        );
        assert_eq!(
            normalize_server_url("https://host/jellyfin/?x=1#y").unwrap(),
            "https://host/jellyfin"
        );
        assert!(normalize_server_url("").is_err());
        assert!(normalize_server_url("ftp://host").is_err());
        assert_eq!(
            candidate_urls("10.0.0.5:8096").unwrap(),
            vec!["https://10.0.0.5:8096", "http://10.0.0.5:8096"]
        );
        assert_eq!(candidate_urls("http://a.b").unwrap(), vec!["http://a.b"]);
    }

    #[tokio::test]
    async fn login_sends_credentials_and_builds_server_record() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/System/Info/Public"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "ServerName": "Home", "Version": "10.10.3", "Id": "srvid"
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/QuickConnect/Enabled"))
            .respond_with(ResponseTemplate::new(200).set_body_json(true))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/Users/AuthenticateByName"))
            .and(body_json(json!({ "Username": "me", "Pw": "secret" })))
            .and(header_exists("Authorization"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "AccessToken": "tok123",
                "ServerId": "srvid",
                "User": { "Id": "u1", "Name": "me", "ServerId": "srvid" }
            })))
            .mount(&server)
            .await;

        let info = discover(&server.uri(), "dev", false).await.unwrap();
        assert_eq!(info.name, "Home");
        assert!(info.quick_connect);
        let client = JellyfinClient::anonymous(&info.url, "dev", false);
        let saved = client.login(&info, "me", "secret", false).await.unwrap();
        assert_eq!(saved.id, "srvid-u1");
        assert_eq!(saved.access_token, "tok123");
        assert_eq!(saved.user_name, "me");
        assert_eq!(saved.url, server.uri());
    }

    #[tokio::test]
    async fn wrong_password_is_not_reported_as_an_expired_session() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/Users/AuthenticateByName"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let info = JellyfinPublicInfo {
            url: server.uri(),
            id: "s".into(),
            name: "n".into(),
            version: "v".into(),
            quick_connect: false,
        };
        let err = JellyfinClient::anonymous(&server.uri(), "d", false)
            .login(&info, "me", "bad", false)
            .await
            .unwrap_err();
        assert_eq!(err.to_string(), "Wrong username or password");
    }

    #[tokio::test]
    async fn quick_connect_waits_then_signs_in() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/QuickConnect/Initiate"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Secret": "sec", "Code": "123456", "Authenticated": false
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/QuickConnect/Connect"))
            .and(query_param("secret", "sec"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Secret": "sec", "Authenticated": false
            })))
            .up_to_n_times(1)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/QuickConnect/Connect"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Secret": "sec", "Authenticated": true
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/Users/AuthenticateWithQuickConnect"))
            .and(body_json(json!({ "Secret": "sec" })))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "AccessToken": "qc-token", "ServerId": "s",
                "User": { "Id": "u", "Name": "phone" }
            })))
            .mount(&server)
            .await;

        let client = JellyfinClient::anonymous(&server.uri(), "d", false);
        let info = JellyfinPublicInfo {
            url: server.uri(),
            id: "s".into(),
            name: "n".into(),
            version: "v".into(),
            quick_connect: true,
        };
        let start = client.quick_connect_start().await.unwrap();
        assert_eq!(start.code, "123456");
        assert!(client
            .quick_connect_poll(&info, &start.secret, false)
            .await
            .unwrap()
            .is_none());
        let saved = client
            .quick_connect_poll(&info, &start.secret, false)
            .await
            .unwrap()
            .expect("approved");
        assert_eq!(saved.access_token, "qc-token");
    }

    #[tokio::test]
    async fn a_copied_sign_in_is_swapped_for_a_session_of_this_device() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/System/Info/Public"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "ServerName": "Home", "Version": "10.10.3", "Id": "srv"
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/QuickConnect/Enabled"))
            .respond_with(ResponseTemplate::new(200).set_body_json(true))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/QuickConnect/Initiate"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Secret": "sec", "Code": "654321"
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/QuickConnect/Authorize"))
            .and(query_param("code", "654321"))
            .and(query_param("userId", "usr"))
            .and(header_exists("Authorization"))
            .respond_with(ResponseTemplate::new(200).set_body_json(true))
            .expect(1)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/QuickConnect/Connect"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Secret": "sec", "Authenticated": true
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/Users/AuthenticateWithQuickConnect"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "AccessToken": "phone-token", "ServerId": "srv",
                "User": { "Id": "usr", "Name": "me" }
            })))
            .mount(&server)
            .await;

        let copied = JellyfinServer {
            id: "srv-usr".into(),
            name: "Home".into(),
            url: server.uri(),
            user_id: "usr".into(),
            user_name: "me".into(),
            access_token: "desktop-token".into(),
            version: "10.10.3".into(),
            allow_insecure: false,
            borrowed_from: Some("Desktop".into()),
        };
        let fresh = rebind(&copied, "phone").await.unwrap();
        assert_eq!(fresh.access_token, "phone-token");
        assert_eq!(fresh.id, copied.id, "the server keeps its id");
        assert_eq!(fresh.borrowed_from, None);
    }

    #[tokio::test]
    async fn items_are_mapped_for_the_ui() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items"))
            .and(query_param("userId", "usr"))
            .and(query_param("parentId", "lib1"))
            .and(query_param("includeItemTypes", "Book,Folder,BoxSet"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "TotalRecordCount": 2,
                "Items": [
                    { "Id": "f1", "Name": "Saga", "Type": "Folder", "IsFolder": true, "ChildCount": 5,
                      "ImageTags": { "Primary": "abc" } },
                    { "Id": "b1", "Name": "Saga 01", "Type": "Book", "Path": "/lib/Saga/Saga 01.CBR",
                      "MediaSources": [{ "Size": 1234, "Container": "cbr" }],
                      "UserData": { "PlaybackPositionTicks": 70000, "Played": false, "IsFavorite": true },
                      "People": [{ "Name": "Alan", "Type": "Writer" }] }
                ]
            })))
            .mount(&server)
            .await;
        let page = signed_in(&server)
            .items(&ItemsQuery {
                parent_id: Some("lib1".into()),
                ..Default::default()
            })
            .await
            .unwrap();
        assert_eq!(page.total, 2);
        assert!(page.items[0].is_folder && !page.items[0].is_book);
        assert_eq!(page.items[0].image_tag.as_deref(), Some("abc"));
        let book = &page.items[1];
        assert!(book.is_book);
        assert_eq!(book.format.as_deref(), Some("cbr"));
        assert_eq!(book.size, Some(1234));
        assert_eq!(book.resume_page, 7);
        assert!(book.favorite);
        assert_eq!(book.people[0].role, "Writer");
    }

    #[tokio::test]
    async fn old_servers_fall_back_to_legacy_routes() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/UserViews"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Users/usr/Views"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Items": [{ "Id": "lib", "Name": "Comics", "Type": "CollectionFolder", "CollectionType": "books" }]
            })))
            .mount(&server)
            .await;
        let views = signed_in(&server).views().await.unwrap();
        assert_eq!(views.len(), 1);
        assert_eq!(views[0].collection_type.as_deref(), Some("books"));
    }

    #[tokio::test]
    async fn expired_token_is_reported_as_unauthorized() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/UserViews"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let err = signed_in(&server).views().await.unwrap_err();
        assert!(matches!(err, JellyfinError::Unauthorized));
        assert_eq!(err.to_string(), "unauthorized");
    }

    #[tokio::test]
    async fn progress_is_reported_in_page_ticks_and_finishing_marks_played() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/UserItems/b1/UserData"))
            .and(query_param("userId", "usr"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;
        let client = signed_in(&server);
        client.report_progress("b1", 12, 40).await.unwrap();
        client.report_progress("b1", 39, 40).await.unwrap();

        let requests = server.received_requests().await.unwrap();
        let bodies: Vec<Value> = requests
            .iter()
            .map(|r| serde_json::from_slice(&r.body).unwrap())
            .collect();
        assert_eq!(bodies[0]["PlaybackPositionTicks"], 120_000);
        assert!(bodies[0].get("Played").is_none());
        assert_eq!(bodies[1]["PlaybackPositionTicks"], 0);
        assert_eq!(bodies[1]["Played"], true);
    }

    #[tokio::test]
    async fn played_and_favorite_use_post_and_delete() {
        let server = MockServer::start().await;
        for (verb, route) in [
            ("POST", "/UserPlayedItems/b1"),
            ("DELETE", "/UserPlayedItems/b1"),
            ("POST", "/UserFavoriteItems/b1"),
        ] {
            Mock::given(method(verb))
                .and(path(route))
                .and(query_param("userId", "usr"))
                .respond_with(ResponseTemplate::new(200).set_body_json(json!({})))
                .expect(1)
                .mount(&server)
                .await;
        }
        let client = signed_in(&server);
        client.set_played("b1", true).await.unwrap();
        client.set_played("b1", false).await.unwrap();
        client.set_favorite("b1", true).await.unwrap();
    }

    fn book_json(etag: &str) -> Value {
        json!({
            "Id": "book1", "Name": "Issue 1", "Type": "Book", "Etag": etag,
            "Path": "/lib/issue1.cbr", "MediaSources": [{ "Size": 5, "Container": "cbr" }],
            "UserData": { "PlaybackPositionTicks": 30000 }
        })
    }

    #[tokio::test]
    async fn a_404_on_download_falls_back_to_the_original_file() {
        use crate::services::jellyfin_offline as offline;
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/book1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(book_json("v1")))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1/Download"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1/File"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(b"PK\x03\x04data".to_vec()))
            .expect(1)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/folder1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Id": "folder1", "Name": "Saga", "Type": "Folder", "IsFolder": true
            })))
            .mount(&server)
            .await;
        let mut broken = book_json("v1");
        broken["Id"] = json!("book2");
        let mut other = book_json("v1");
        other["Id"] = json!("book3");
        Mock::given(method("GET"))
            .and(path("/Items"))
            .and(query_param("parentId", "folder1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Items": [broken, other], "TotalRecordCount": 2
            })))
            .mount(&server)
            .await;
        let base = tempfile::tempdir().unwrap();
        let base = base.path().to_str().unwrap();
        let client = signed_in(&server);
        let noop: offline::OfflineProgressFn = Arc::new(|_| {});

        let kept = offline::download(
            &client,
            base,
            "srv-usr",
            "book1",
            Default::default(),
            noop.clone(),
        )
        .await
        .unwrap();
        assert_eq!(std::fs::read(&kept[0].path).unwrap(), b"PK\x03\x04data");

        let err = offline::download(
            &client,
            base,
            "srv-usr",
            "folder1",
            Default::default(),
            noop,
        )
        .await
        .unwrap_err();
        assert!(
            err.to_string().contains("no file"),
            "a folder where nothing downloads fails: {err}"
        );
    }

    #[tokio::test]
    async fn offline_download_keeps_a_book_or_every_book_of_a_folder() {
        use crate::services::jellyfin_offline as offline;
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/book1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(book_json("v1")))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/folder1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Id": "folder1", "Name": "Saga", "Type": "Folder", "IsFolder": true
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items"))
            .and(query_param("parentId", "folder1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Items": [book_json("v1")], "TotalRecordCount": 1
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1/Download"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(b"PK\x03\x04data".to_vec()))
            .expect(1)
            .mount(&server)
            .await;
        let base = tempfile::tempdir().unwrap();
        let base = base.path().to_str().unwrap();
        let client = signed_in(&server);
        let noop: offline::OfflineProgressFn = Arc::new(|_| {});

        let kept = offline::download(
            &client,
            base,
            "srv-usr",
            "book1",
            Default::default(),
            noop.clone(),
        )
        .await
        .unwrap();
        assert_eq!(kept.len(), 1);
        assert_eq!(std::fs::read(&kept[0].path).unwrap(), b"PK\x03\x04data");

        let kept = offline::download(
            &client,
            base,
            "srv-usr",
            "folder1",
            Default::default(),
            noop.clone(),
        )
        .await
        .unwrap();
        assert_eq!(
            kept.len(),
            1,
            "the kept copy is reused, not downloaded again"
        );
        assert_eq!(kept[0].context.series_id.as_deref(), Some("folder1"));

        let missing = offline::download(&client, base, "srv-usr", "gone", Default::default(), noop)
            .await
            .unwrap_err();
        assert!(missing.to_string().contains("does not know"), "{missing}");
    }

    #[tokio::test]
    async fn prepare_book_downloads_once_then_reuses_the_cache() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/book1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(book_json("v1")))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1/Download"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(b"PK\x03\x04data".to_vec()))
            .expect(1)
            .mount(&server)
            .await;
        let cache = tempfile::tempdir().unwrap();
        let client = signed_in(&server);

        let seen = Arc::new(Mutex::new(Vec::<u64>::new()));
        let sink = seen.clone();
        let progress: ProgressFn = Arc::new(move |written, _| sink.lock().unwrap().push(written));
        let first = prepare_book(&client, "srv-usr", "book1", cache.path(), &progress)
            .await
            .unwrap();
        assert!(!first.from_cache);
        assert_eq!(first.format, "cbz");
        assert_eq!(first.resume_page, 3);
        assert!(first.path.ends_with("book.cbz"));
        assert_eq!(std::fs::read(&first.path).unwrap(), b"PK\x03\x04data");
        assert_eq!(seen.lock().unwrap().last(), Some(&8));

        let second = prepare_book(&client, "srv-usr", "book1", cache.path(), &noop())
            .await
            .unwrap();
        assert!(second.from_cache);
        assert_eq!(second.path, first.path);
    }

    #[tokio::test]
    async fn prepare_book_refetches_when_the_server_copy_changed() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/book1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(book_json("v1")))
            .up_to_n_times(1)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(book_json("v2")))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1/Download"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(b"Rar!\x1a\x07\x00xx".to_vec()))
            .expect(2)
            .mount(&server)
            .await;
        let cache = tempfile::tempdir().unwrap();
        let client = signed_in(&server);
        let first = prepare_book(&client, "s", "book1", cache.path(), &noop())
            .await
            .unwrap();
        assert_eq!(first.format, "cbr");
        let second = prepare_book(&client, "s", "book1", cache.path(), &noop())
            .await
            .unwrap();
        assert!(!second.from_cache);
    }

    #[tokio::test]
    async fn a_failed_download_leaves_nothing_behind() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/book1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(book_json("v1")))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/book1/Download"))
            .respond_with(ResponseTemplate::new(500).set_body_string("boom"))
            .mount(&server)
            .await;
        let cache = tempfile::tempdir().unwrap();
        let err = prepare_book(&signed_in(&server), "s", "book1", cache.path(), &noop())
            .await
            .unwrap_err();
        assert!(matches!(err, JellyfinError::Status(500, _)));
        assert!(!cache.path().join("books/s/book1").exists());
    }

    #[tokio::test]
    async fn prepare_book_rejects_traversal_and_non_books() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/folder1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(
                json!({ "Id": "folder1", "Name": "Saga", "Type": "Folder", "IsFolder": true }),
            ))
            .mount(&server)
            .await;
        let cache = tempfile::tempdir().unwrap();
        let client = signed_in(&server);
        assert!(prepare_book(&client, "s", "../etc", cache.path(), &noop())
            .await
            .is_err());
        assert!(prepare_book(&client, "s", "folder1", cache.path(), &noop())
            .await
            .is_err());
    }

    #[test]
    fn old_books_are_evicted_beyond_the_budget() {
        let cache = tempfile::tempdir().unwrap();
        let root = books_root(cache.path(), "s");
        for i in 0..(BOOK_CACHE_MAX_BOOKS + 3) {
            let dir = root.join(format!("book{i}"));
            std::fs::create_dir_all(&dir).unwrap();
            write_manifest(
                &dir,
                &Manifest {
                    stamp: String::new(),
                    file: "book.cbz".into(),
                    format: "cbz".into(),
                    opened_at: i as i64,
                },
            )
            .unwrap();
        }
        evict_old_books(&root, "book0");
        let left: Vec<_> = std::fs::read_dir(&root).unwrap().flatten().collect();
        assert_eq!(left.len(), BOOK_CACHE_MAX_BOOKS);
        assert!(
            root.join("book0").exists(),
            "the book being opened is never evicted"
        );
        assert!(!root.join("book1").exists());
        assert!(root
            .join(format!("book{}", BOOK_CACHE_MAX_BOOKS + 2))
            .exists());
    }

    #[tokio::test]
    async fn covers_are_fetched_once_and_served_from_disk() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/b1/Images/Primary"))
            .and(query_param("tag", "t1"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "image/webp")
                    .set_body_bytes(b"IMG".to_vec()),
            )
            .expect(1)
            .mount(&server)
            .await;
        let cache = tempfile::tempdir().unwrap();
        let client = signed_in(&server);
        for _ in 0..2 {
            let (bytes, kind) = cached_image(&client, "s", "b1", Some("t1"), 400, cache.path())
                .await
                .unwrap();
            assert_eq!(bytes, b"IMG");
            assert_eq!(kind, "image/webp");
        }
    }

    #[test]
    fn store_keeps_a_stable_device_id_and_upserts_servers() {
        let dir = tempfile::tempdir().unwrap();
        let store = JellyfinStore::new(dir.path().to_str().unwrap());
        let id = store.device_id().unwrap();
        assert_eq!(id.len(), 32);
        assert_eq!(store.device_id().unwrap(), id);

        let mut server = JellyfinServer {
            id: "a-b".into(),
            name: "Home".into(),
            url: "http://x".into(),
            user_id: "b".into(),
            user_name: "me".into(),
            access_token: "old".into(),
            version: String::new(),
            allow_insecure: false,
            borrowed_from: None,
        };
        store.upsert(server.clone()).unwrap();
        server.access_token = "new".into();
        store.upsert(server).unwrap();
        assert_eq!(store.servers().len(), 1);
        assert_eq!(store.get("a-b").unwrap().access_token, "new");
        assert_eq!(store.device_id().unwrap(), id, "device id survives writes");
        store.remove("a-b").unwrap();
        assert!(store.servers().is_empty());
    }

    #[tokio::test]
    async fn books_by_library_pages_and_skips_other_libraries() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/UserViews"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Items": [
                    { "Id": "lib1", "Name": "Comics", "Type": "CollectionFolder", "CollectionType": "books" },
                    { "Id": "lib2", "Name": "Movies", "Type": "CollectionFolder", "CollectionType": "movies" }
                ]
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items"))
            .and(query_param("parentId", "lib1"))
            .and(query_param("recursive", "true"))
            .and(query_param("includeItemTypes", "Book"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "TotalRecordCount": 2,
                "Items": [
                    { "Id": "a", "Name": "A", "Type": "Book",
                      "UserData": { "Played": true, "PlayCount": 2, "LastPlayedDate": "2026-09-01T10:00:00.0000000Z" } },
                    { "Id": "b", "Name": "B", "Type": "Book" }
                ]
            })))
            .expect(1)
            .mount(&server)
            .await;

        let libraries = signed_in(&server).books_by_library(100).await.unwrap();
        assert_eq!(libraries.len(), 1, "the movie library is skipped");
        assert_eq!(libraries[0].library_name, "Comics");
        assert_eq!(libraries[0].items.len(), 2);
        assert_eq!(libraries[0].items[0].play_count, 2);
        assert_eq!(
            libraries[0].items[0].last_played.as_deref(),
            Some("2026-09-01T10:00:00.0000000Z")
        );
    }

    #[tokio::test]
    async fn epub_position_is_a_fraction_of_the_book() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/e1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Id": "e1", "Name": "Novel", "Type": "Book", "Path": "/lib/novel.epub",
                "UserData": { "PlaybackPositionTicks": 2_500_000 }
            })))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/UserItems/e1/UserData"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;
        let client = signed_in(&server);
        let epub = client.item("e1").await.unwrap();
        assert_eq!(epub.resume_page, 0);
        assert!((epub.resume_fraction - 0.25).abs() < 1e-9);

        client.report_fraction("e1", 0.5).await.unwrap();
        client.report_fraction("e1", 0.99).await.unwrap();
        let bodies: Vec<Value> = server
            .received_requests()
            .await
            .unwrap()
            .iter()
            .filter(|r| r.method.as_str() == "POST")
            .map(|r| serde_json::from_slice(&r.body).unwrap())
            .collect();
        assert_eq!(bodies[0]["PlaybackPositionTicks"], 5_000_000);
        assert!(bodies[0].get("Played").is_none());
        assert_eq!(bodies[1]["PlaybackPositionTicks"], 0);
        assert_eq!(bodies[1]["Played"], true);
    }

    #[tokio::test]
    async fn unreadable_formats_fail_before_downloading() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/Items/m1"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "Id": "m1", "Name": "Old", "Type": "Book", "Path": "/lib/old.mobi"
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/Items/m1/Download"))
            .respond_with(ResponseTemplate::new(200))
            .expect(0)
            .mount(&server)
            .await;
        let cache = tempfile::tempdir().unwrap();
        let err = prepare_book(&signed_in(&server), "s", "m1", cache.path(), &noop())
            .await
            .unwrap_err();
        assert!(err.to_string().contains("MOBI"), "{err}");
    }

    #[tokio::test]
    async fn pdf_and_epub_are_kept_as_they_are() {
        let server = MockServer::start().await;
        for (id, ext, bytes) in [
            ("p1", "pdf", b"%PDF-1.7".to_vec()),
            ("e1", "epub", b"PK\x03\x04epub".to_vec()),
        ] {
            Mock::given(method("GET"))
                .and(path(format!("/Items/{id}")))
                .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                    "Id": id, "Name": id, "Type": "Book", "Path": format!("/lib/{id}.{ext}")
                })))
                .mount(&server)
                .await;
            Mock::given(method("GET"))
                .and(path(format!("/Items/{id}/Download")))
                .respond_with(ResponseTemplate::new(200).set_body_bytes(bytes))
                .mount(&server)
                .await;
        }
        let cache = tempfile::tempdir().unwrap();
        let client = signed_in(&server);
        let pdf = prepare_book(&client, "s", "p1", cache.path(), &noop())
            .await
            .unwrap();
        let epub = prepare_book(&client, "s", "e1", cache.path(), &noop())
            .await
            .unwrap();
        assert_eq!((pdf.format.as_str(), epub.format.as_str()), ("pdf", "epub"));
        assert!(
            epub.path.ends_with("book.epub"),
            "an EPUB is a ZIP but must not become a CBZ"
        );
    }
}

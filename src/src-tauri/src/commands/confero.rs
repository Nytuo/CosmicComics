use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use tracing::{error, info, warn};

use crate::commands::state::AppState;
use crate::models::book::BookRecord;
use crate::models::series::SeriesRecord;
use crate::providers::ProviderKind;

fn ts_newer(a: &str, b: &str) -> bool {
    let parse_ms = |s: &str| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|dt| dt.timestamp_millis())
    };
    match (parse_ms(a), parse_ms(b)) {
        (Some(a_ms), Some(b_ms)) => a_ms > b_ms,
        _ => a > b,
    }
}

struct TokenCache {
    token: Option<String>,
    acquired_at: Option<Instant>,
}

impl TokenCache {
    fn new() -> Self {
        Self {
            token: None,
            acquired_at: None,
        }
    }
    fn is_valid(&self) -> bool {
        matches!((&self.token, self.acquired_at), (Some(_), Some(t)) if t.elapsed() < Duration::from_secs(23 * 3600))
    }
}

static TOKEN_CACHE: Lazy<Mutex<TokenCache>> = Lazy::new(|| Mutex::new(TokenCache::new()));

fn build_client(app_secret: &str) -> Result<Client, String> {
    let mut headers = reqwest::header::HeaderMap::new();
    if !app_secret.is_empty() {
        if let Ok(val) = reqwest::header::HeaderValue::from_str(app_secret) {
            headers.insert("x-app-secret", val);
        }
    }
    Client::builder()
        .timeout(Duration::from_secs(30))
        .default_headers(headers)
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))
}

#[derive(Serialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Deserialize)]
struct LoginResponse {
    token: String,
}

async fn get_token(
    client: &Client,
    url: &str,
    email: &str,
    password: &str,
) -> Result<String, String> {
    {
        let cache = TOKEN_CACHE.lock().unwrap();
        if cache.is_valid() {
            info!("Confero: using cached JWT token");
            return Ok(cache.token.clone().unwrap());
        }
    }

    info!(
        "Confero: no valid cached token, attempting login to {}",
        url
    );
    let resp = client
        .post(format!("{}/api/auth/login", url.trim_end_matches('/')))
        .json(&LoginRequest {
            email: email.to_string(),
            password: password.to_string(),
        })
        .send()
        .await
        .map_err(|e| format!("Login request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Confero login failed ({}): {}", status, body));
    }

    let login: LoginResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse login response: {}", e))?;
    let token = login.token.clone();

    let mut cache = TOKEN_CACHE.lock().unwrap();
    cache.token = Some(token.clone());
    cache.acquired_at = Some(Instant::now());

    info!("Confero: authenticated successfully");
    Ok(token)
}

async fn read_creds(state: &AppState) -> Result<(String, String, String, String), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let global = state.global_vars.lock().await;
    let repo = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| e.to_string())?;
    drop(global);

    let all = repo
        .get_all_api_credentials()
        .await
        .map_err(|e| e.to_string())?;

    let url = "https://confero.nytuo.fr";
    let email = all.get("confero_email").cloned().unwrap_or_default();
    let password = all.get("confero_password").cloned().unwrap_or_default();
    let app_secret = all.get("confero_app_secret").cloned().unwrap_or_default();

    if url.is_empty() || email.is_empty() || password.is_empty() {
        warn!(
            "Confero: credentials incomplete (url={}, email={}, password={})",
            if url.is_empty() { "MISSING" } else { "ok" },
            if email.is_empty() { "MISSING" } else { "ok" },
            if password.is_empty() { "MISSING" } else { "ok" }
        );
        return Err("Confero credentials not configured. Please add Server URL, Email and Password in Settings → Confero Sync.".to_string());
    }

    info!("Confero: credentials loaded (url={})", url);
    Ok((url, email, password, app_secret))
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SyncComicBookItem {
    pub source_id: String,
    pub api_id: String,
    pub title: String,
    pub note: Option<i32>,
    pub read: bool,
    pub reading: bool,
    pub unread: bool,
    pub favorite: bool,
    pub last_page: i32,
    pub url_cover: String,
    pub issue_number: String,
    pub description: String,
    pub format: String,
    pub series_source_id: String,

    #[serde(default)]
    pub provider_name: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SyncComicSeriesItem {
    pub source_id: String,
    pub api_id: String,
    pub title: String,
    pub note: Option<i32>,
    pub status: String,
    pub start_date: String,
    pub end_date: String,
    pub description: String,
    pub genres: String,
    pub cover: String,
    pub source_provider: String,
    pub volumes: Option<i32>,
    pub chapters: Option<i32>,
    pub favorite: bool,
    pub updated_at: String,
}

#[derive(Serialize)]
struct SyncBooksPayload {
    books: Vec<SyncComicBookItem>,
}

#[derive(Serialize)]
struct SyncSeriesPayload {
    series: Vec<SyncComicSeriesItem>,
}

#[derive(Serialize)]
struct DeletePayload {
    source_id: String,
}

#[tauri::command]
pub async fn confero_test_connection(state: State<'_, AppState>) -> Result<String, String> {
    let (url, email, password, app_secret) = read_creds(&state).await?;
    let client = build_client(&app_secret)?;
    let token = get_token(&client, &url, &email, &password).await?;

    let resp = client
        .get(format!(
            "{}/api/auth/check-login",
            url.trim_end_matches('/')
        ))
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Connection test failed: {}", e))?;

    if resp.status().is_success() {
        Ok("Connected successfully".to_string())
    } else {
        Err(format!("Server returned {}", resp.status()))
    }
}

#[tauri::command]
pub async fn confero_push_books(
    state: State<'_, AppState>,
    books_json: String,
) -> Result<(), String> {
    let (url, email, password, app_secret) = read_creds(&state).await?;
    let books: Vec<SyncComicBookItem> =
        serde_json::from_str(&books_json).map_err(|e| format!("Invalid books JSON: {}", e))?;

    info!(
        "Confero: confero_push_books called with {} book(s)",
        books.len()
    );
    for b in &books {
        tracing::debug!(source_id = %b.source_id, title = %b.title, updated_at = %b.updated_at, "confero_push_books: queuing book");
    }

    let client = build_client(&app_secret)?;
    let token = get_token(&client, &url, &email, &password).await?;

    let resp = client
        .post(format!(
            "{}/api/sync/cosmiccomics/books",
            url.trim_end_matches('/')
        ))
        .bearer_auth(&token)
        .json(&SyncBooksPayload { books })
        .send()
        .await
        .map_err(|e| format!("push_books failed: {}", e))?;

    info!(
        "Confero: push_books POST {} → {}",
        format!("{}/api/sync/cosmiccomics/books", url.trim_end_matches('/')),
        resp.status()
    );
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        error!("Confero: push_books error ({}): {}", status, body);
        return Err(format!("push_books error ({}): {}", status, body));
    }
    info!("Confero: push_books succeeded");
    Ok(())
}

#[tauri::command]
pub async fn confero_pull_books(
    state: State<'_, AppState>,
    since: Option<String>,
) -> Result<String, String> {
    let (url, email, password, app_secret) = read_creds(&state).await?;
    let client = build_client(&app_secret)?;
    let token = get_token(&client, &url, &email, &password).await?;

    info!("Confero: confero_pull_books called (since={:?})", since);
    let mut req = client.get(format!(
        "{}/api/sync/cosmiccomics/books",
        url.trim_end_matches('/')
    ));
    if let Some(s) = since {
        req = req.query(&[("since", s)]);
    }

    let resp = req
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("pull_books failed: {}", e))?;

    info!("Confero: pull_books response status={}", resp.status());
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        error!("Confero: pull_books error ({}): {}", status, body);
        return Err(format!("pull_books error ({}): {}", status, body));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Parse pull_books: {}", e))?;
    let result = serde_json::to_string(&body["books"]).map_err(|e| e.to_string());
    if let Ok(ref s) = result {
        let count: usize = body["books"].as_array().map(|a| a.len()).unwrap_or(0);
        info!("Confero: pull_books received {} book(s) from server", count);
    }
    result
}

#[tauri::command]
pub async fn confero_push_series(
    state: State<'_, AppState>,
    series_json: String,
) -> Result<(), String> {
    let (url, email, password, app_secret) = read_creds(&state).await?;
    let series: Vec<SyncComicSeriesItem> =
        serde_json::from_str(&series_json).map_err(|e| format!("Invalid series JSON: {}", e))?;

    info!(
        "Confero: confero_push_series called with {} series",
        series.len()
    );
    for s in &series {
        tracing::debug!(source_id = %s.source_id, title = %s.title, updated_at = %s.updated_at, "confero_push_series: queuing series");
    }

    let client = build_client(&app_secret)?;
    let token = get_token(&client, &url, &email, &password).await?;

    let resp = client
        .post(format!(
            "{}/api/sync/cosmiccomics/series",
            url.trim_end_matches('/')
        ))
        .bearer_auth(&token)
        .json(&SyncSeriesPayload { series })
        .send()
        .await
        .map_err(|e| format!("push_series failed: {}", e))?;

    info!(
        "Confero: push_series POST {} → {}",
        format!("{}/api/sync/cosmiccomics/series", url.trim_end_matches('/')),
        resp.status()
    );
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        error!("Confero: push_series error ({}): {}", status, body);
        return Err(format!("push_series error ({}): {}", status, body));
    }
    info!("Confero: push_series succeeded");
    Ok(())
}

#[tauri::command]
pub async fn confero_pull_series(
    state: State<'_, AppState>,
    since: Option<String>,
) -> Result<String, String> {
    let (url, email, password, app_secret) = read_creds(&state).await?;
    let client = build_client(&app_secret)?;
    let token = get_token(&client, &url, &email, &password).await?;

    info!("Confero: confero_pull_series called (since={:?})", since);
    let mut req = client.get(format!(
        "{}/api/sync/cosmiccomics/series",
        url.trim_end_matches('/')
    ));
    if let Some(s) = since {
        req = req.query(&[("since", s)]);
    }

    let resp = req
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("pull_series failed: {}", e))?;

    info!("Confero: pull_series response status={}", resp.status());
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        error!("Confero: pull_series error ({}): {}", status, body);
        return Err(format!("pull_series error ({}): {}", status, body));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Parse pull_series: {}", e))?;
    let result = serde_json::to_string(&body["series"]).map_err(|e| e.to_string());
    if let Ok(ref _s) = result {
        let count: usize = body["series"].as_array().map(|a| a.len()).unwrap_or(0);
        info!("Confero: pull_series received {} series from server", count);
    }
    result
}

fn provider_name_to_kind(name: &str) -> ProviderKind {
    match name.trim() {
        "MangaDex" => ProviderKind::MangaDex,
        "Anilist" => ProviderKind::Anilist,
        "OpenLibrary" => ProviderKind::OpenLibrary,
        "Google Books" => ProviderKind::GoogleBooks,
        "Metron" => ProviderKind::Metron,
        "Marvel" => ProviderKind::Marvel,
        "Marvel Unlimited" => ProviderKind::MarvelUnlimited,
        "GetComics" => ProviderKind::GetComics,
        "DC Comics Infinite" => ProviderKind::DCInfinite,
        "VIZ Media" => ProviderKind::VIZ,
        _ => ProviderKind::Manual,
    }
}

#[tauri::command]
pub async fn confero_full_sync(state: State<'_, AppState>) -> Result<String, String> {
    info!("Confero: confero_full_sync started");
    let (url, email, password, app_secret) = read_creds(&state).await?;
    let client = build_client(&app_secret)?;
    let token = get_token(&client, &url, &email, &password).await?;
    let base = url.trim_end_matches('/').to_string();

    info!("Confero: full_sync using server={}", base);

    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let global = state.global_vars.lock().await;
    let repo = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| e.to_string())?;
    drop(global);

    let raw_books: Vec<BookRecord> = repo.get_all_books().await.unwrap_or_default();
    let raw_series: Vec<SeriesRecord> = repo.get_all_series().await.unwrap_or_default();

    info!(
        "Confero: full_sync local data: {} books, {} series",
        raw_books.len(),
        raw_series.len()
    );

    let books_by_ext: HashMap<String, String> = raw_books
        .iter()
        .filter_map(|b| {
            let id = b.id.as_ref()?.to_string().trim_matches('"').to_string();
            Some((b.external_id.clone(), id))
        })
        .collect();

    let books_updated_at: HashMap<String, Option<String>> = raw_books
        .iter()
        .filter_map(|b| {
            let id = b.id.as_ref()?.to_string().trim_matches('"').to_string();
            Some((id, b.updated_at.clone()))
        })
        .collect();

    let series_by_ext: HashMap<String, String> = raw_series
        .iter()
        .filter_map(|s| {
            let id = s.id.as_ref()?.to_string().trim_matches('"').to_string();
            Some((s.external_id.clone(), id))
        })
        .collect();
    let series_updated_at: HashMap<String, Option<String>> = raw_series
        .iter()
        .filter_map(|s| {
            let id = s.id.as_ref()?.to_string().trim_matches('"').to_string();
            Some((id, s.updated_at.clone()))
        })
        .collect();

    const EPOCH: &str = "1970-01-01T00:00:00Z";

    let local_books: Vec<SyncComicBookItem> = raw_books
        .into_iter()
        .filter_map(|b| {
            let source_id =
                b.id.as_ref()
                    .map(|v| v.to_string())?
                    .trim_matches('"')
                    .to_string();
            Some(SyncComicBookItem {
                source_id,
                api_id: b.external_id.clone(),
                title: b.title.clone(),
                note: b.note.map(|n| n as i32),
                read: b.read,
                reading: b.reading,
                unread: b.unread,
                favorite: b.favorite,
                last_page: b.last_page as i32,
                url_cover: b.cover_url.unwrap_or_default(),
                issue_number: b.issue_number.unwrap_or_default(),
                description: b.description.unwrap_or_default(),
                format: b.format.unwrap_or_default(),
                series_source_id: b.series_id.unwrap_or_default(),
                provider_name: b.provider_name.clone(),
                updated_at: b.updated_at.unwrap_or_else(|| EPOCH.to_string()),
            })
        })
        .collect();

    let local_series: Vec<SyncComicSeriesItem> = raw_series
        .into_iter()
        .filter_map(|s| {
            let source_id =
                s.id.as_ref()
                    .map(|v| v.to_string())?
                    .trim_matches('"')
                    .to_string();
            Some(SyncComicSeriesItem {
                source_id,
                api_id: s.external_id.clone(),
                title: s.title.clone(),
                note: s.note.map(|n| n as i32),
                status: s.status.unwrap_or_default(),
                start_date: s.start_date.unwrap_or_default(),
                end_date: s.end_date.unwrap_or_default(),
                description: s.description.unwrap_or_default(),
                genres: s.genres.join(", "),
                cover: s.cover_url.unwrap_or_default(),
                source_provider: s.provider_name.clone(),
                volumes: s.volumes.map(|v| v as i32),
                chapters: s.chapters.map(|c| c as i32),
                favorite: s.favorite,
                updated_at: s.updated_at.unwrap_or_else(|| EPOCH.to_string()),
            })
        })
        .collect();

    let pushed_books = local_books.len();
    let pushed_series = local_series.len();
    info!(
        "Confero: full_sync will push {} books and {} series",
        pushed_books, pushed_series
    );

    if !local_books.is_empty() {
        info!(
            "Confero: full_sync pushing {} books to server",
            pushed_books
        );
        let resp = client
            .post(format!("{}/api/sync/cosmiccomics/books", base))
            .bearer_auth(&token)
            .json(&SyncBooksPayload { books: local_books })
            .send()
            .await
            .map_err(|e| format!("push_books: {}", e))?;

        info!("Confero: full_sync push_books response: {}", resp.status());
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            error!("push_books status: {} — body: {}", status, body);
        }
    } else {
        info!("Confero: full_sync no local books to push");
    }

    if !local_series.is_empty() {
        info!(
            "Confero: full_sync pushing {} series to server",
            pushed_series
        );
        let resp = client
            .post(format!("{}/api/sync/cosmiccomics/series", base))
            .bearer_auth(&token)
            .json(&SyncSeriesPayload {
                series: local_series,
            })
            .send()
            .await
            .map_err(|e| format!("push_series: {}", e))?;

        info!("Confero: full_sync push_series response: {}", resp.status());
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            error!("push_series status: {} — body: {}", status, body);
        }
    } else {
        info!("Confero: full_sync no local series to push");
    }

    info!("Confero: full_sync pulling series from server");
    let pulled_series_resp = client
        .get(format!("{}/api/sync/cosmiccomics/series", base))
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("pull_series: {}", e))?;

    info!(
        "Confero: full_sync pull_series response: {}",
        pulled_series_resp.status()
    );

    let mut applied_series: usize = 0;
    let mut inserted_series: usize = 0;

    let mut remote_source_to_local_series: HashMap<String, String> = HashMap::new();

    let pulled_series: usize = if pulled_series_resp.status().is_success() {
        let body: serde_json::Value = pulled_series_resp.json().await.unwrap_or_default();
        let remote_series: Vec<SyncComicSeriesItem> =
            match serde_json::from_value(body["series"].clone()) {
                Ok(v) => v,
                Err(e) => {
                    error!(
                        "Confero: full_sync failed to parse pulled series JSON: {} — raw: {}",
                        e, body["series"]
                    );
                    vec![]
                }
            };
        let count = remote_series.len();
        info!("Confero: full_sync received {} series from server", count);

        for rs in &remote_series {
            if let Some(local_id) = series_by_ext.get(&rs.api_id) {
                remote_source_to_local_series.insert(rs.source_id.clone(), local_id.clone());

                let local_ts = series_updated_at.get(local_id).and_then(|v| v.as_deref());
                if let Some(local_ts) = local_ts {
                    if !ts_newer(&rs.updated_at, local_ts) {
                        info!(
                            api_id = %rs.api_id, title = %rs.title,
                            local_ts = %local_ts, remote_ts = %rs.updated_at,
                            "full_sync pull_series: LWW skip — local is same age or newer"
                        );
                        continue;
                    }
                }

                let mut fields: HashMap<String, Value> = HashMap::new();
                fields.insert("favorite".to_string(), Value::Bool(rs.favorite));
                if let Some(note) = rs.note {
                    fields.insert("note".to_string(), serde_json::json!(note));
                }
                if !rs.cover.is_empty() {
                    fields.insert("cover_url".to_string(), Value::String(rs.cover.clone()));
                }
                if !rs.description.is_empty() {
                    fields.insert(
                        "description".to_string(),
                        Value::String(rs.description.clone()),
                    );
                }
                if !rs.status.is_empty() {
                    fields.insert("status".to_string(), Value::String(rs.status.clone()));
                }
                if !rs.start_date.is_empty() {
                    fields.insert(
                        "start_date".to_string(),
                        Value::String(rs.start_date.clone()),
                    );
                }
                if !rs.end_date.is_empty() {
                    fields.insert("end_date".to_string(), Value::String(rs.end_date.clone()));
                }
                if !rs.genres.is_empty() {
                    let genre_list: Vec<Value> = rs
                        .genres
                        .split(", ")
                        .filter(|s| !s.is_empty())
                        .map(|s| Value::String(s.to_string()))
                        .collect();
                    fields.insert("genres".to_string(), Value::Array(genre_list));
                }
                if let Some(v) = rs.volumes {
                    fields.insert("volumes".to_string(), serde_json::json!(v));
                }
                if let Some(c) = rs.chapters {
                    fields.insert("chapters".to_string(), serde_json::json!(c));
                }

                fields.insert(
                    "updated_at".to_string(),
                    Value::String(rs.updated_at.clone()),
                );
                match repo.update_series_fields(local_id, fields).await {
                    Ok(()) => {
                        info!(api_id = %rs.api_id, title = %rs.title, local_id = %local_id, "full_sync pull_series: applied remote changes");
                        applied_series += 1;
                    }
                    Err(e) => warn!("Failed to apply pulled series {}: {}", rs.api_id, e),
                }
            } else {
                info!(api_id = %rs.api_id, title = %rs.title, "full_sync pull_series: inserting new series from remote");
                let genre_list: Vec<String> = rs
                    .genres
                    .split(", ")
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect();
                let new_series = SeriesRecord {
                    external_id: rs.api_id.clone(),
                    provider_id: provider_name_to_kind(&rs.source_provider).id(),
                    provider_name: provider_name_to_kind(&rs.source_provider)
                        .name()
                        .to_string(),
                    title: rs.title.clone(),
                    cover_url: if rs.cover.is_empty() {
                        None
                    } else {
                        Some(rs.cover.clone())
                    },
                    description: if rs.description.is_empty() {
                        None
                    } else {
                        Some(rs.description.clone())
                    },
                    status: if rs.status.is_empty() {
                        None
                    } else {
                        Some(rs.status.clone())
                    },
                    start_date: if rs.start_date.is_empty() {
                        None
                    } else {
                        Some(rs.start_date.clone())
                    },
                    end_date: if rs.end_date.is_empty() {
                        None
                    } else {
                        Some(rs.end_date.clone())
                    },
                    genres: genre_list,
                    volumes: rs.volumes.map(|v| v as i64),
                    chapters: rs.chapters.map(|c| c as i64),
                    note: rs.note.map(|n| n as i64),
                    favorite: rs.favorite,
                    updated_at: Some(rs.updated_at.clone()),
                    ..Default::default()
                };
                match repo.upsert_series(new_series).await {
                    Ok(upserted) => {
                        let new_id = upserted
                            .id
                            .as_ref()
                            .map(|v| v.to_string().trim_matches('"').to_string())
                            .unwrap_or_default();
                        info!(api_id = %rs.api_id, title = %rs.title, local_id = %new_id, "full_sync pull_series: inserted");
                        remote_source_to_local_series.insert(rs.source_id.clone(), new_id);
                        inserted_series += 1;
                    }
                    Err(e) => warn!("Failed to insert pulled series {}: {}", rs.api_id, e),
                }
            }
        }

        count
    } else {
        warn!(
            "Confero: full_sync pull_series response was not successful: {}",
            pulled_series_resp.status()
        );
        0
    };

    info!("Confero: full_sync pulling books from server");
    let pulled_books_resp = client
        .get(format!("{}/api/sync/cosmiccomics/books", base))
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("pull_books: {}", e))?;

    info!(
        "Confero: full_sync pull_books response: {}",
        pulled_books_resp.status()
    );

    let mut applied_books: usize = 0;
    let mut inserted_books: usize = 0;
    let pulled_books: usize = if pulled_books_resp.status().is_success() {
        let body: serde_json::Value = pulled_books_resp.json().await.unwrap_or_default();
        let remote_books: Vec<SyncComicBookItem> =
            match serde_json::from_value(body["books"].clone()) {
                Ok(v) => v,
                Err(e) => {
                    error!(
                        "Confero: full_sync failed to parse pulled books JSON: {} — raw: {}",
                        e, body["books"]
                    );
                    vec![]
                }
            };
        let count = remote_books.len();
        info!("Confero: full_sync received {} books from server", count);

        for rb in &remote_books {
            if let Some(local_id) = books_by_ext.get(&rb.api_id) {
                let local_ts = books_updated_at.get(local_id).and_then(|v| v.as_deref());
                if let Some(local_ts) = local_ts {
                    if !ts_newer(&rb.updated_at, local_ts) {
                        info!(
                            api_id = %rb.api_id, title = %rb.title,
                            local_ts = %local_ts, remote_ts = %rb.updated_at,
                            "full_sync pull_books: LWW skip — local is same age or newer"
                        );
                        continue;
                    }
                }

                let mut fields: HashMap<String, Value> = HashMap::new();
                fields.insert("read".to_string(), Value::Bool(rb.read));
                fields.insert("reading".to_string(), Value::Bool(rb.reading));
                fields.insert("unread".to_string(), Value::Bool(rb.unread));
                fields.insert("favorite".to_string(), Value::Bool(rb.favorite));
                fields.insert("last_page".to_string(), serde_json::json!(rb.last_page));
                if let Some(note) = rb.note {
                    fields.insert("note".to_string(), serde_json::json!(note));
                }
                if !rb.url_cover.is_empty() {
                    fields.insert("cover_url".to_string(), Value::String(rb.url_cover.clone()));
                }
                if !rb.description.is_empty() {
                    fields.insert(
                        "description".to_string(),
                        Value::String(rb.description.clone()),
                    );
                }
                if !rb.issue_number.is_empty() {
                    fields.insert(
                        "issue_number".to_string(),
                        Value::String(rb.issue_number.clone()),
                    );
                }
                if !rb.format.is_empty() {
                    fields.insert("format".to_string(), Value::String(rb.format.clone()));
                }

                fields.insert(
                    "updated_at".to_string(),
                    Value::String(rb.updated_at.clone()),
                );
                match repo.update_book_fields(local_id, fields).await {
                    Ok(()) => {
                        info!(api_id = %rb.api_id, title = %rb.title, local_id = %local_id, "full_sync pull_books: applied remote changes");
                        applied_books += 1;
                    }
                    Err(e) => warn!("Failed to apply pulled book {}: {}", rb.api_id, e),
                }
            } else {
                let resolved_series_id = if rb.series_source_id.is_empty() {
                    None
                } else {
                    remote_source_to_local_series
                        .get(&rb.series_source_id)
                        .cloned()
                };
                info!(
                    api_id = %rb.api_id, title = %rb.title,
                    series_source_id = %rb.series_source_id,
                    resolved_series_id = ?resolved_series_id,
                    "full_sync pull_books: inserting new book from remote"
                );
                let new_book = BookRecord {
                    external_id: rb.api_id.clone(),
                    provider_id: provider_name_to_kind(&rb.provider_name).id(),
                    provider_name: provider_name_to_kind(&rb.provider_name).name().to_string(),
                    title: rb.title.clone(),
                    cover_url: if rb.url_cover.is_empty() {
                        None
                    } else {
                        Some(rb.url_cover.clone())
                    },
                    description: if rb.description.is_empty() {
                        None
                    } else {
                        Some(rb.description.clone())
                    },
                    issue_number: if rb.issue_number.is_empty() {
                        None
                    } else {
                        Some(rb.issue_number.clone())
                    },
                    format: if rb.format.is_empty() {
                        None
                    } else {
                        Some(rb.format.clone())
                    },
                    read: rb.read,
                    reading: rb.reading,
                    unread: rb.unread,
                    favorite: rb.favorite,
                    last_page: rb.last_page as i64,
                    note: rb.note.map(|n| n as i64),
                    series_id: resolved_series_id,
                    updated_at: Some(rb.updated_at.clone()),
                    ..Default::default()
                };
                match repo.upsert_book(new_book).await {
                    Ok(upserted) => {
                        let new_id = upserted
                            .id
                            .as_ref()
                            .map(|v| v.to_string().trim_matches('"').to_string())
                            .unwrap_or_default();
                        info!(api_id = %rb.api_id, title = %rb.title, local_id = %new_id, "full_sync pull_books: inserted");
                        inserted_books += 1;
                    }
                    Err(e) => warn!("Failed to insert pulled book {}: {}", rb.api_id, e),
                }
            }
        }

        count
    } else {
        warn!(
            "Confero: full_sync pull_books response was not successful: {}",
            pulled_books_resp.status()
        );
        0
    };

    info!(
        "Confero full sync complete: pushed {}/{} books/series, \
         pulled {}/{} books/series, applied {}/{} updated + {}/{} inserted locally",
        pushed_books,
        pushed_series,
        pulled_books,
        pulled_series,
        applied_books,
        applied_series,
        inserted_books,
        inserted_series,
    );

    Ok(serde_json::json!({
        "pushed_books":    pushed_books,
        "pushed_series":   pushed_series,
        "pulled_books":    pulled_books,
        "pulled_series":   pulled_series,
        "applied_books":   applied_books,
        "applied_series":  applied_series,
        "inserted_books":  inserted_books,
        "inserted_series": inserted_series,
    })
    .to_string())
}

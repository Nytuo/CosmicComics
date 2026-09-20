use crate::commands::state::AppState;
use crate::services::jellyfin_service::{
    self as jf, ItemsQuery, JellyfinClient, JellyfinError, JellyfinItem, JellyfinItemsPage,
    JellyfinPublicInfo, JellyfinServer, JellyfinServerInfo, JellyfinStore, PreparedBook,
    QuickConnectStart,
};
use serde::Serialize;
use std::borrow::Cow;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::http::{header, Response, StatusCode, Uri};
use tauri::{AppHandle, Emitter, Manager, State};
use tracing::{error, info};

fn err(e: JellyfinError) -> String {
    if !matches!(e, JellyfinError::Unauthorized | JellyfinError::NotFound) {
        error!("[jellyfin] {}", e);
    }
    e.to_string()
}

async fn base_path(state: &State<'_, AppState>) -> String {
    state.config.lock().await.base_path.clone()
}

fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn cache_root(base_path: &str) -> PathBuf {
    PathBuf::from(base_path).join("jellyfin_cache")
}

fn session(base_path: &str, server_id: &str) -> Result<(JellyfinServer, JellyfinClient), String> {
    let store = JellyfinStore::new(base_path);
    let server = store
        .get(server_id)
        .ok_or_else(|| "unauthorized".to_string())?;
    let device_id = store.device_id().map_err(err)?;
    let client = JellyfinClient::for_server(&server, &device_id);
    Ok((server, client))
}

#[tauri::command]
pub async fn jellyfin_discover_server(
    state: State<'_, AppState>,
    url: String,
    allow_insecure: Option<bool>,
) -> Result<JellyfinPublicInfo, String> {
    let base = base_path(&state).await;
    let device_id = JellyfinStore::new(&base).device_id().map_err(err)?;
    jf::discover(&url, &device_id, allow_insecure.unwrap_or(false))
        .await
        .map_err(err)
}

#[tauri::command]
pub async fn jellyfin_login(
    state: State<'_, AppState>,
    url: String,
    username: String,
    password: String,
    allow_insecure: Option<bool>,
) -> Result<JellyfinServerInfo, String> {
    let allow_insecure = allow_insecure.unwrap_or(false);
    let base = base_path(&state).await;
    let store = JellyfinStore::new(&base);
    let device_id = store.device_id().map_err(err)?;
    let info = jf::discover(&url, &device_id, allow_insecure)
        .await
        .map_err(err)?;
    let server = JellyfinClient::anonymous(&info.url, &device_id, allow_insecure)
        .login(&info, username.trim(), &password, allow_insecure)
        .await
        .map_err(err)?;
    store.upsert(server.clone()).map_err(err)?;
    info!(
        "[jellyfin] signed in to '{}' as '{}'",
        server.name, server.user_name
    );
    Ok(JellyfinServerInfo::from(&server))
}

#[tauri::command]
pub async fn jellyfin_quick_connect_start(
    state: State<'_, AppState>,
    url: String,
    allow_insecure: Option<bool>,
) -> Result<QuickConnectStart, String> {
    let allow_insecure = allow_insecure.unwrap_or(false);
    let base = base_path(&state).await;
    let device_id = JellyfinStore::new(&base).device_id().map_err(err)?;
    let info = jf::discover(&url, &device_id, allow_insecure)
        .await
        .map_err(err)?;
    if !info.quick_connect {
        return Err("Quick Connect is not enabled on this server".into());
    }
    JellyfinClient::anonymous(&info.url, &device_id, allow_insecure)
        .quick_connect_start()
        .await
        .map_err(err)
}

#[tauri::command]
pub async fn jellyfin_quick_connect_poll(
    state: State<'_, AppState>,
    url: String,
    secret: String,
    allow_insecure: Option<bool>,
) -> Result<Option<JellyfinServerInfo>, String> {
    let allow_insecure = allow_insecure.unwrap_or(false);
    let base = base_path(&state).await;
    let store = JellyfinStore::new(&base);
    let device_id = store.device_id().map_err(err)?;
    let info = jf::discover(&url, &device_id, allow_insecure)
        .await
        .map_err(err)?;
    let signed_in = JellyfinClient::anonymous(&info.url, &device_id, allow_insecure)
        .quick_connect_poll(&info, &secret, allow_insecure)
        .await
        .map_err(err)?;
    match signed_in {
        Some(server) => {
            store.upsert(server.clone()).map_err(err)?;
            Ok(Some(JellyfinServerInfo::from(&server)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn jellyfin_list_servers(
    state: State<'_, AppState>,
) -> Result<Vec<JellyfinServerInfo>, String> {
    let base = base_path(&state).await;
    Ok(JellyfinStore::new(&base)
        .servers()
        .iter()
        .map(JellyfinServerInfo::from)
        .collect())
}

#[tauri::command]
pub async fn jellyfin_remove_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<(), String> {
    if !is_safe_id(&server_id) {
        return Err("Invalid server id".into());
    }
    let base = base_path(&state).await;
    JellyfinStore::new(&base).remove(&server_id).map_err(err)?;
    let _ = std::fs::remove_dir_all(cache_root(&base).join("books").join(&server_id));
    Ok(())
}

#[tauri::command]
pub async fn jellyfin_get_views(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<Vec<JellyfinItem>, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client.views().await.map_err(err)
}

#[tauri::command]
pub async fn jellyfin_get_items(
    state: State<'_, AppState>,
    server_id: String,
    query: ItemsQuery,
) -> Result<JellyfinItemsPage, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client.items(&query).await.map_err(err)
}

#[tauri::command]
pub async fn jellyfin_get_item(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
) -> Result<JellyfinItem, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client.item(&item_id).await.map_err(err)
}

#[tauri::command]
pub async fn jellyfin_get_resume(
    state: State<'_, AppState>,
    server_id: String,
    limit: Option<u32>,
) -> Result<Vec<JellyfinItem>, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client.resume(limit.unwrap_or(20)).await.map_err(err)
}

#[tauri::command]
pub async fn jellyfin_set_played(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    played: bool,
) -> Result<(), String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client.set_played(&item_id, played).await.map_err(err)
}

#[tauri::command]
pub async fn jellyfin_set_favorite(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    favorite: bool,
) -> Result<(), String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client.set_favorite(&item_id, favorite).await.map_err(err)
}

#[tauri::command]
pub async fn jellyfin_report_progress(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    page: i64,
    page_count: i64,
) -> Result<(), String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client
        .report_progress(&item_id, page, page_count)
        .await
        .map_err(err)
}

#[tauri::command]
pub async fn jellyfin_report_fraction(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    fraction: f64,
) -> Result<(), String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    client
        .report_fraction(&item_id, fraction)
        .await
        .map_err(err)
}

#[derive(Serialize, Clone)]
struct DownloadProgress {
    item_id: String,
    written: u64,
    total: Option<u64>,
}

#[tauri::command]
pub async fn jellyfin_prepare_book(
    state: State<'_, AppState>,
    app: AppHandle,
    server_id: String,
    item_id: String,
) -> Result<PreparedBook, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    let emit_id = item_id.clone();
    let progress: jf::ProgressFn = Arc::new(move |written, total| {
        let _ = app.emit(
            "jellyfin-download-progress",
            DownloadProgress {
                item_id: emit_id.clone(),
                written,
                total,
            },
        );
    });
    jf::prepare_book(&client, &server_id, &item_id, &cache_root(&base), &progress)
        .await
        .map_err(err)
}

#[tauri::command]
pub async fn jellyfin_clear_cache(
    state: State<'_, AppState>,
    server_id: Option<String>,
) -> Result<(), String> {
    let base = base_path(&state).await;
    let books = cache_root(&base).join("books");
    let target = match server_id {
        Some(id) if is_safe_id(&id) => books.join(id),
        Some(_) => return Err("Invalid server id".into()),
        None => books,
    };
    if target.exists() {
        std::fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn plain(status: StatusCode, message: &str) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "text/plain")
        .body(Cow::Owned(message.as_bytes().to_vec()))
        .expect("static response")
}

fn query_value(uri: &Uri, key: &str) -> Option<String> {
    uri.query()?.split('&').find_map(|pair| {
        let (k, v) = pair.split_once('=')?;
        (k == key).then(|| urlencoding::decode(v).map(|c| c.into_owned()).ok())?
    })
}

pub async fn serve_cover(app: &AppHandle, uri: &Uri) -> Response<Cow<'static, [u8]>> {
    let decoded = urlencoding::decode(uri.path())
        .map(|c| c.into_owned())
        .unwrap_or_default();
    let Some((server_id, item_id)) = decoded.trim_start_matches('/').split_once('/') else {
        return plain(StatusCode::BAD_REQUEST, "expected /<server>/<item>");
    };
    let state = app.state::<AppState>();
    let base = state.config.lock().await.base_path.clone();
    let Ok((_, client)) = session(&base, server_id) else {
        return plain(StatusCode::UNAUTHORIZED, "unknown server");
    };
    let width = query_value(uri, "w")
        .and_then(|w| w.parse::<u32>().ok())
        .unwrap_or(400)
        .clamp(50, 1600);
    let tag = query_value(uri, "tag");
    match jf::cached_image(
        &client,
        server_id,
        item_id,
        tag.as_deref(),
        width,
        &cache_root(&base),
    )
    .await
    {
        Ok((bytes, content_type)) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, content_type)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(header::CACHE_CONTROL, "public, max-age=86400")
            .body(Cow::Owned(bytes))
            .expect("image response"),
        Err(JellyfinError::NotFound) => plain(StatusCode::NOT_FOUND, "no image"),
        Err(JellyfinError::Unauthorized) => plain(StatusCode::UNAUTHORIZED, "unauthorized"),
        Err(e) => plain(StatusCode::BAD_GATEWAY, &e.to_string()),
    }
}

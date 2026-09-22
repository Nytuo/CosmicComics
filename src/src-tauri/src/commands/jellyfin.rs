use crate::commands::state::AppState;
use crate::services::jellyfin_offline::{
    self as offline, OfflineBook, OfflineContext, PendingChange,
};
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
    let _ = offline::remove(&base, &server_id, None);
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
    match client.item(&item_id).await {
        Ok(item) => {
            offline::refresh(&base, &server_id, &item);
            Ok(item)
        }
        Err(JellyfinError::Network(e)) => offline::get(&base, &server_id, &item_id)
            .map(|kept| kept.item)
            .ok_or_else(|| err(JellyfinError::Network(e))),
        Err(e) => Err(err(e)),
    }
}

/// Runs a reading change against the server and mirrors it on the offline
/// copy. When the server cannot be reached, an offline book keeps the change
/// to send it later instead of failing.
async fn user_change(
    state: &State<'_, AppState>,
    server_id: &str,
    item_id: &str,
    change: PendingChange,
) -> Result<(), String> {
    let base = base_path(state).await;
    let (_, client) = session(&base, server_id)?;
    let result = match change {
        PendingChange::Page { page, page_count } => {
            client.report_progress(item_id, page, page_count).await
        }
        PendingChange::Fraction { fraction } => client.report_fraction(item_id, fraction).await,
        PendingChange::Played { played } => client.set_played(item_id, played).await,
        PendingChange::Favorite { favorite } => client.set_favorite(item_id, favorite).await,
    };
    match result {
        Ok(()) => {
            offline::record(&base, server_id, item_id, change, false);
            Ok(())
        }
        Err(JellyfinError::Network(e)) => {
            if offline::record(&base, server_id, item_id, change, true) {
                Ok(())
            } else {
                Err(err(JellyfinError::Network(e)))
            }
        }
        Err(e) => Err(err(e)),
    }
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
    user_change(
        &state,
        &server_id,
        &item_id,
        PendingChange::Played { played },
    )
    .await
}

#[tauri::command]
pub async fn jellyfin_set_favorite(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    favorite: bool,
) -> Result<(), String> {
    user_change(
        &state,
        &server_id,
        &item_id,
        PendingChange::Favorite { favorite },
    )
    .await
}

#[tauri::command]
pub async fn jellyfin_report_progress(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    page: i64,
    page_count: i64,
) -> Result<(), String> {
    user_change(
        &state,
        &server_id,
        &item_id,
        PendingChange::Page { page, page_count },
    )
    .await
}

#[tauri::command]
pub async fn jellyfin_report_fraction(
    state: State<'_, AppState>,
    server_id: String,
    item_id: String,
    fraction: f64,
) -> Result<(), String> {
    user_change(
        &state,
        &server_id,
        &item_id,
        PendingChange::Fraction { fraction },
    )
    .await
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
    if let Some(kept) = offline::get(&base, &server_id, &item_id) {
        let item = match client.item(&item_id).await {
            Ok(fresh) => {
                offline::refresh(&base, &server_id, &fresh);
                offline::get(&base, &server_id, &item_id)
                    .map(|k| k.item)
                    .unwrap_or(fresh)
            }
            Err(JellyfinError::Network(_)) => kept.item.clone(),
            Err(e) => return Err(err(e)),
        };
        info!("[jellyfin] opening offline copy of {}", item_id);
        return Ok(PreparedBook {
            path: kept.path,
            format: kept.format,
            resume_page: item.resume_page,
            resume_fraction: item.resume_fraction,
            title: item.name,
            from_cache: true,
        });
    }
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

#[derive(Serialize, Clone)]
struct OfflineDownloadEvent {
    root_id: String,
    item_id: String,
    title: String,
    index: usize,
    count: usize,
    written: u64,
    total: Option<u64>,
}

#[tauri::command]
pub async fn jellyfin_offline_download(
    state: State<'_, AppState>,
    app: AppHandle,
    server_id: String,
    item_id: String,
    context: Option<OfflineContext>,
) -> Result<Vec<OfflineBook>, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    let root_id = item_id.clone();
    let progress: offline::OfflineProgressFn = Arc::new(move |p| {
        let _ = app.emit(
            "jellyfin-offline-progress",
            OfflineDownloadEvent {
                root_id: root_id.clone(),
                item_id: p.item_id,
                title: p.title,
                index: p.index,
                count: p.count,
                written: p.written,
                total: p.total,
            },
        );
    });
    offline::download(
        &client,
        &base,
        &server_id,
        &item_id,
        context.unwrap_or_default(),
        progress,
    )
    .await
    .map_err(err)
}

#[tauri::command]
pub async fn jellyfin_offline_list(state: State<'_, AppState>) -> Result<Vec<OfflineBook>, String> {
    Ok(offline::list(&base_path(&state).await))
}

#[tauri::command]
pub async fn jellyfin_offline_remove(
    state: State<'_, AppState>,
    server_id: String,
    item_ids: Option<Vec<String>>,
) -> Result<(), String> {
    let base = base_path(&state).await;
    match item_ids {
        Some(ids) => {
            for id in ids {
                offline::remove(&base, &server_id, Some(&id)).map_err(err)?;
            }
            Ok(())
        }
        None => offline::remove(&base, &server_id, None).map_err(err),
    }
}

#[tauri::command]
pub async fn jellyfin_offline_flush(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<usize, String> {
    let base = base_path(&state).await;
    let (_, client) = session(&base, &server_id)?;
    offline::flush(&client, &base, &server_id)
        .await
        .map_err(err)
}

#[derive(Serialize)]
pub struct RefreshResult {
    /// The sign-in was replaced by a session of this device.
    rebound: bool,
    /// Why it could not be (Quick Connect off, refused…).
    rebind_error: Option<String>,
    /// The session works after the refresh.
    session_ok: bool,
}

/// Forgets what was cached for a server (covers, books opened for reading),
/// gets this device its own session through Quick Connect and checks it.
#[tauri::command]
pub async fn jellyfin_refresh_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<RefreshResult, String> {
    if !is_safe_id(&server_id) {
        return Err("Invalid server id".into());
    }
    let base = base_path(&state).await;
    let cache = cache_root(&base);
    let _ = std::fs::remove_dir_all(cache.join("books").join(&server_id));
    let prefix: String = server_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-')
        .collect::<String>()
        + "_";
    if let Ok(images) = std::fs::read_dir(cache.join("images")) {
        for image in images.flatten() {
            if image.file_name().to_string_lossy().starts_with(&prefix) {
                let _ = std::fs::remove_file(image.path());
            }
        }
    }

    let store = JellyfinStore::new(&base);
    let server = store.get(&server_id).ok_or("unauthorized")?;
    let device_id = store.device_id().map_err(err)?;
    let (rebound, rebind_error) = match jf::rebind(&server, &device_id).await {
        Ok(fresh) => {
            if fresh.id != server.id {
                let _ = store.remove(&server.id);
            }
            store.upsert(fresh).map_err(err)?;
            (true, None)
        }
        Err(e) => (false, Some(e.to_string())),
    };
    let session_ok = match store.get(&server_id) {
        Some(current) => JellyfinClient::for_server(&current, &device_id)
            .views()
            .await
            .is_ok(),
        None => false,
    };
    Ok(RefreshResult {
        rebound,
        rebind_error,
        session_ok,
    })
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
    let child_fallback = query_value(uri, "child").as_deref() == Some("1");
    let cache = cache_root(&base);
    let mut result = if tag.is_none() && child_fallback {
        Err(JellyfinError::NotFound)
    } else {
        jf::cached_image(&client, server_id, item_id, tag.as_deref(), width, &cache).await
    };
    if child_fallback && matches!(result, Err(JellyfinError::NotFound)) {
        result = match client.first_book(item_id).await {
            Ok(Some(book)) if book.image_tag.is_some() => {
                jf::cached_image(
                    &client,
                    server_id,
                    &book.id,
                    book.image_tag.as_deref(),
                    width,
                    &cache,
                )
                .await
            }
            Ok(_) => Err(JellyfinError::NotFound),
            Err(e) => Err(e),
        };
    }
    if matches!(
        result,
        Err(JellyfinError::Network(_)) | Err(JellyfinError::NotFound)
    ) {
        if let Some(kept) = offline::cover(&base, server_id, item_id) {
            result = Ok(kept);
        }
    }
    match result {
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

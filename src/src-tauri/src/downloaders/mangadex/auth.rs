use crate::AppState;
use once_cell::sync::Lazy;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use tokio::sync::Mutex;

use super::models::MangaDexAuth;
use super::{build_client, MANGADEX_AUTH};

pub(super) static MANGADEX_TOKENS: Lazy<Mutex<Option<MangaDexAuth>>> =
    Lazy::new(|| Mutex::new(None));

pub(super) fn get_tokens_file_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("mangadex_tokens.json"))
}

pub(super) fn save_tokens_to_disk(auth: &MangaDexAuth, base_path: String) -> Result<(), String> {
    let path = get_tokens_file_path(base_path)?;
    let json = serde_json::to_string_pretty(auth)
        .map_err(|e| format!("Failed to serialize tokens: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write tokens: {}", e))?;
    tracing::info!("Saved MangaDex tokens to {:?}", path);
    Ok(())
}

pub(super) fn load_tokens_from_disk(base_path: String) -> Result<MangaDexAuth, String> {
    let path = get_tokens_file_path(base_path)?;
    if !path.exists() {
        return Err("No saved tokens found".to_string());
    }
    let json =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read tokens file: {}", e))?;
    let auth: MangaDexAuth =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse tokens: {}", e))?;
    tracing::info!("Loaded MangaDex tokens from {:?}", path);
    Ok(auth)
}

/// Authenticate with MangaDex using personal client credentials.
#[tauri::command]
pub async fn mangadex_authenticate(
    _app: tauri::AppHandle,
    username: String,
    password: String,
    client_id: String,
    client_secret: String,
    state: State<'_, AppState>,
) -> Result<MangaDexAuth, String> {
    tracing::info!("Authenticating with MangaDex as {}", username);

    let client = build_client()?;

    let params = [
        ("grant_type", "password"),
        ("username", &username),
        ("password", &password),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
    ];

    let resp = client
        .post(MANGADEX_AUTH)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Auth request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Auth failed ({}): {}", status, body));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse auth response: {}", e))?;

    let access_token = body["access_token"]
        .as_str()
        .ok_or("Missing access_token")?
        .to_string();
    let refresh_token = body["refresh_token"]
        .as_str()
        .ok_or("Missing refresh_token")?
        .to_string();

    let auth = MangaDexAuth {
        access_token,
        refresh_token,
        authenticated: true,
    };

    save_tokens_to_disk(&auth, state.config.lock().await.base_path.clone())?;
    let mut guard = MANGADEX_TOKENS.lock().await;
    *guard = Some(auth.clone());

    tracing::info!("MangaDex authentication successful");
    Ok(auth)
}

/// Refresh the MangaDex access token.
#[tauri::command]
pub async fn mangadex_refresh_token(
    _app: tauri::AppHandle,
    client_id: String,
    client_secret: String,
    state: State<'_, AppState>,
) -> Result<MangaDexAuth, String> {
    tracing::info!("Refreshing MangaDex token");

    let guard = MANGADEX_TOKENS.lock().await;
    let current = guard
        .as_ref()
        .ok_or("No tokens to refresh — please authenticate first")?
        .clone();
    drop(guard);

    let client = build_client()?;

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", &current.refresh_token),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
    ];

    let resp = client
        .post(MANGADEX_AUTH)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Token refresh failed ({}): {}", status, body));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    let access_token = body["access_token"]
        .as_str()
        .ok_or("Missing access_token")?
        .to_string();
    let refresh_token = body
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .unwrap_or(&current.refresh_token)
        .to_string();

    let auth = MangaDexAuth {
        access_token,
        refresh_token,
        authenticated: true,
    };

    save_tokens_to_disk(&auth, state.config.lock().await.base_path.clone())?;
    let mut guard = MANGADEX_TOKENS.lock().await;
    *guard = Some(auth.clone());

    Ok(auth)
}

/// Load saved MangaDex tokens from disk.
#[tauri::command]
pub async fn load_saved_mangadex_tokens(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<MangaDexAuth, String> {
    tracing::info!("Loading saved MangaDex tokens");
    let auth = load_tokens_from_disk(state.config.lock().await.base_path.clone())?;
    let mut guard = MANGADEX_TOKENS.lock().await;
    *guard = Some(auth.clone());
    Ok(auth)
}

/// Clear saved MangaDex tokens from disk and memory.
#[tauri::command]
pub async fn clear_saved_mangadex_tokens(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Clearing saved MangaDex tokens");
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_tokens_file_path(base_path)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete tokens file: {}", e))?;
    }
    let mut guard = MANGADEX_TOKENS.lock().await;
    *guard = None;
    Ok(())
}

/// Check if saved MangaDex tokens exist on disk.
#[tauri::command]
pub async fn has_saved_mangadex_tokens(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_tokens_file_path(base_path)?;
    Ok(path.exists())
}

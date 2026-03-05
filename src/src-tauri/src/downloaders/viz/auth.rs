use super::models::VizCookies;
use crate::AppState;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use tauri::{Manager, Window};

pub(super) fn get_viz_cookies_file_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("viz_cookies.json"))
}

pub(super) fn save_viz_cookies_to_disk(
    _app: &tauri::AppHandle,
    cookies: &HashMap<String, String>,
    base_path: String,
) -> Result<(), String> {
    let path = get_viz_cookies_file_path(base_path)?;
    let data = VizCookies {
        cookies: cookies.clone(),
        authenticated: true,
    };
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize VIZ cookies: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write VIZ cookies to disk: {}", e))?;
    tracing::info!("Saved {} VIZ cookies to {:?}", cookies.len(), path);
    Ok(())
}

pub(super) fn load_viz_cookies_from_disk(
    base_path: String,
) -> Result<HashMap<String, String>, String> {
    let path = get_viz_cookies_file_path(base_path)?;
    if !path.exists() {
        return Err("No saved VIZ cookies found".to_string());
    }
    let json =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read VIZ cookies file: {}", e))?;
    let data: VizCookies =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse VIZ cookies: {}", e))?;
    tracing::info!("Loaded {} VIZ cookies from {:?}", data.cookies.len(), path);
    Ok(data.cookies)
}

/// Open a browser window for VIZ Media authentication
#[tauri::command]
pub async fn open_viz_auth(window: Window) -> Result<String, String> {
    tracing::info!("Opening VIZ Media authentication window");

    let webview_window = tauri::WebviewWindowBuilder::new(
        window.app_handle(),
        "viz-auth",
        tauri::WebviewUrl::External("https://www.viz.com/account/sign-in".parse().unwrap()),
    )
    .title("VIZ Media - Sign In")
    .inner_size(1024.0, 768.0)
    .center()
    .build()
    .map_err(|e| format!("Failed to create VIZ auth window: {}", e))?;

    Ok(webview_window.label().to_string())
}

/// Get cookies from VIZ authentication window
#[tauri::command]
pub async fn get_viz_cookies(
    app: tauri::AppHandle,
    window_label: String,
    state: State<'_, AppState>,
) -> Result<VizCookies, String> {
    tracing::info!("Getting VIZ cookies from window: {}", window_label);

    let webview_window = app
        .get_webview_window(&window_label)
        .ok_or_else(|| "VIZ auth window not found".to_string())?;

    let viz_cookies = webview_window
        .cookies()
        .map_err(|e| format!("Failed to get VIZ cookies: {}", e))?;

    let mut cookies = HashMap::new();
    for cookie in viz_cookies {
        cookies.insert(cookie.name().to_string(), cookie.value().to_string());
    }

    tracing::info!("Extracted {} VIZ cookies", cookies.len());

    let authenticated = cookies.contains_key("_vizcom_session")
        || cookies.contains_key("remember_user_token")
        || cookies.contains_key("_viz_session")
        || cookies.contains_key("session_id")
        || (!cookies.is_empty() && cookies.len() > 3);

    tracing::info!(
        "VIZ auth status: {} ({} cookies)",
        if authenticated {
            "authenticated"
        } else {
            "not authenticated"
        },
        cookies.len()
    );

    if authenticated {
        let config = state.config.lock().await;
        let base_path = config.base_path.clone();
        drop(config);
        if let Err(e) = save_viz_cookies_to_disk(&app, &cookies, base_path) {
            tracing::warn!("Failed to save VIZ cookies: {}", e);
        }
    }

    Ok(VizCookies {
        cookies,
        authenticated,
    })
}

/// Close the VIZ authentication window
#[tauri::command]
pub async fn close_viz_auth(app: tauri::AppHandle, window_label: String) -> Result<(), String> {
    tracing::info!("Closing VIZ auth window: {}", window_label);
    if let Some(window) = app.get_webview_window(&window_label) {
        window
            .close()
            .map_err(|e| format!("Failed to close VIZ auth window: {}", e))?;
    }
    Ok(())
}

/// Load saved VIZ cookies from disk
#[tauri::command]
pub async fn load_saved_viz_cookies(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<VizCookies, String> {
    tracing::info!("Loading saved VIZ cookies");
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let cookies = load_viz_cookies_from_disk(base_path)?;
    let authenticated = cookies.contains_key("_vizcom_session")
        || cookies.contains_key("remember_user_token")
        || cookies.contains_key("_viz_session")
        || cookies.contains_key("session_id")
        || (!cookies.is_empty() && cookies.len() > 3);
    Ok(VizCookies {
        cookies,
        authenticated,
    })
}

/// Clear saved VIZ cookies
#[tauri::command]
pub async fn clear_saved_viz_cookies(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Clearing saved VIZ cookies");
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_viz_cookies_file_path(base_path)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete VIZ cookies file: {}", e))?;
    }
    Ok(())
}

/// Check if saved VIZ cookies exist
#[tauri::command]
pub async fn has_saved_viz_cookies(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_viz_cookies_file_path(base_path)?;
    Ok(path.exists())
}

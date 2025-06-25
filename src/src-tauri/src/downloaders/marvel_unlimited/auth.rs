use super::models::MarvelUnlimitedCookies;
use crate::AppState;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use tauri::{Manager, Window};

/// Get the path to the cookies file.
pub(super) fn get_cookies_file_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("marvel_unlimited_cookies.json"))
}

/// Save cookies to disk.
pub(super) fn save_cookies_to_disk(
    base_path: String,
    cookies: &HashMap<String, String>,
) -> Result<(), String> {
    let cookies_path = get_cookies_file_path(base_path)?;

    let cookies_data = MarvelUnlimitedCookies {
        cookies: cookies.clone(),
        authenticated: true,
    };

    let json = serde_json::to_string_pretty(&cookies_data)
        .map_err(|e| format!("Failed to serialize cookies: {}", e))?;

    fs::write(&cookies_path, json)
        .map_err(|e| format!("Failed to write cookies to disk: {}", e))?;

    tracing::info!("Saved {} cookies to {:?}", cookies.len(), cookies_path);
    Ok(())
}

/// Load cookies from disk.
pub(super) fn load_cookies_from_disk(base_path: String) -> Result<HashMap<String, String>, String> {
    let cookies_path = get_cookies_file_path(base_path)?;

    if !cookies_path.exists() {
        return Err("No saved cookies found".to_string());
    }

    let json = fs::read_to_string(&cookies_path)
        .map_err(|e| format!("Failed to read cookies file: {}", e))?;

    let cookies_data: MarvelUnlimitedCookies =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse cookies: {}", e))?;

    tracing::info!(
        "Loaded {} cookies from {:?}",
        cookies_data.cookies.len(),
        cookies_path
    );
    Ok(cookies_data.cookies)
}

/// Open a browser window for Marvel Unlimited authentication.
#[tauri::command]
pub async fn open_marvel_unlimited_auth(window: Window) -> Result<String, String> {
    tracing::info!("Opening Marvel Unlimited authentication window");

    let webview_window = tauri::WebviewWindowBuilder::new(
        window.app_handle(),
        "marvel-unlimited-auth",
        tauri::WebviewUrl::External(
            "https://www.marvel.com/comics/unlimited/home"
                .parse()
                .unwrap(),
        ),
    )
    .title("Marvel Unlimited - Sign In")
    .inner_size(1024.0, 768.0)
    .center()
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    Ok(webview_window.label().to_string())
}

/// Get cookies from Marvel Unlimited authentication window.
#[tauri::command]
pub async fn get_marvel_unlimited_cookies(
    app: tauri::AppHandle,
    window_label: String,
    state: State<'_, AppState>,
) -> Result<MarvelUnlimitedCookies, String> {
    tracing::info!(
        "Getting Marvel Unlimited cookies from window: {}",
        window_label
    );

    let webview_window = app
        .get_webview_window(&window_label)
        .ok_or_else(|| "Window not found".to_string())?;

    let marvel_cookies = webview_window
        .cookies()
        .map_err(|e| format!("Failed to get cookies: {}", e))?;

    let mut cookies = HashMap::new();
    for cookie in marvel_cookies {
        cookies.insert(cookie.name().to_string(), cookie.value().to_string());
        tracing::debug!("Cookie: {} = {}", cookie.name(), cookie.value());
    }

    tracing::info!("Successfully extracted {} cookies", cookies.len());

    let authenticated = cookies.contains_key("mdx_session")
        || cookies.contains_key("session")
        || cookies.contains_key("auth_token")
        || cookies.contains_key("PHPSESSID")
        || (!cookies.is_empty() && cookies.len() > 2);

    tracing::info!(
        "Authentication status: {} ({} cookies)",
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
        if let Err(e) = save_cookies_to_disk(base_path, &cookies) {
            tracing::warn!("Failed to save cookies to disk: {}", e);
        }
    }

    Ok(MarvelUnlimitedCookies {
        cookies,
        authenticated,
    })
}

/// Close the Marvel Unlimited authentication window.
#[tauri::command]
pub async fn close_marvel_unlimited_auth(
    app: tauri::AppHandle,
    window_label: String,
) -> Result<(), String> {
    tracing::info!(
        "Closing Marvel Unlimited authentication window: {}",
        window_label
    );

    if let Some(window) = app.get_webview_window(&window_label) {
        window
            .close()
            .map_err(|e| format!("Failed to close window: {}", e))?;
    }

    Ok(())
}

/// Load saved Marvel Unlimited cookies from disk.
#[tauri::command]
pub async fn load_saved_marvel_unlimited_cookies(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<MarvelUnlimitedCookies, String> {
    tracing::info!("Loading saved Marvel Unlimited cookies");

    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let cookies = load_cookies_from_disk(base_path)?;
    let authenticated = cookies.contains_key("mdx_session")
        || cookies.contains_key("session")
        || cookies.contains_key("auth_token")
        || cookies.contains_key("PHPSESSID")
        || (!cookies.is_empty() && cookies.len() > 2);

    Ok(MarvelUnlimitedCookies {
        cookies,
        authenticated,
    })
}

/// Clear saved Marvel Unlimited cookies.
#[tauri::command]
pub async fn clear_saved_marvel_unlimited_cookies(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Clearing saved Marvel Unlimited cookies");

    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let cookies_path = get_cookies_file_path(base_path)?;

    if cookies_path.exists() {
        fs::remove_file(&cookies_path)
            .map_err(|e| format!("Failed to delete cookies file: {}", e))?;
        tracing::info!("Deleted cookies file: {:?}", cookies_path);
    } else {
        tracing::info!("No cookies file to delete");
    }

    Ok(())
}

/// Check if saved cookies exist.
#[tauri::command]
pub async fn has_saved_marvel_unlimited_cookies(
    _app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let cookies_path = get_cookies_file_path(base_path)?;
    Ok(cookies_path.exists())
}

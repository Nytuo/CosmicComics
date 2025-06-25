use crate::AppState;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

use super::models::GetComicsPost;

#[derive(Debug, Serialize, Deserialize)]
struct LatestCache {
    timestamp: i64,
    posts: Vec<GetComicsPost>,
}

fn get_latest_cache_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("getcomics_latest_cache.json"))
}

/// Save the latest comics list to disk cache.
#[tauri::command]
pub async fn save_getcomics_latest_cache(
    _app: tauri::AppHandle,
    posts: Vec<GetComicsPost>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let cache_path = get_latest_cache_path(base_path)?;
    let cache = LatestCache {
        timestamp: chrono::Utc::now().timestamp(),
        posts,
    };
    let json = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;
    fs::write(&cache_path, json).map_err(|e| format!("Failed to write cache: {}", e))?;
    tracing::info!("Saved GetComics latest cache to {:?}", cache_path);
    Ok(())
}

/// Load latest comics cache from disk. Returns None if file doesn't exist or is stale.
#[tauri::command]
pub async fn load_getcomics_latest_cache(
    _app: tauri::AppHandle,
    max_age_secs: i64,
    state: State<'_, AppState>,
) -> Result<Option<Vec<GetComicsPost>>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let cache_path = get_latest_cache_path(base_path)?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let json =
        fs::read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?;
    let cache: LatestCache =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse cache: {}", e))?;

    let now = chrono::Utc::now().timestamp();
    if now - cache.timestamp > max_age_secs {
        tracing::info!("GetComics latest cache is stale, ignoring");
        return Ok(None);
    }

    tracing::info!("Loaded {} cached GetComics posts", cache.posts.len());
    Ok(Some(cache.posts))
}

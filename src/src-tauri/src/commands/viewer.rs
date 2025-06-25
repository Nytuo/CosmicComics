use crate::commands::state::AppState;
use crate::services::archive_service::unzip_and_process;
use crate::utils::{
    get_list_of_images, replace_html_address_path, VALID_BOOK_EXTENSION, VALID_IMAGE_EXTENSION,
};
use std::path::PathBuf;
use tauri::{Emitter, State};
use tracing::{error, info};

async fn get_repo(
    state: &State<'_, AppState>,
) -> Result<crate::repositories::surreal_repo::SurrealRepo, String> {
    let t = std::time::Instant::now();
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    info!("[get_repo] config lock+clone in {:.2?}", t.elapsed());

    let t2 = std::time::Instant::now();
    let global = state.global_vars.lock().await;
    info!("[get_repo] global_vars lock in {:.2?}", t2.elapsed());

    let t3 = std::time::Instant::now();
    let result = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("Error getting SurrealDB: {}", e));
    info!("[get_repo] get_surreal_db in {:.2?}", t3.elapsed());
    result
}

#[tauri::command]
pub async fn update_reading_progress(
    state: State<'_, AppState>,
    book_id: String,
    page_number: i64,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    repo.update_reading_progress(&book_id, page_number)
        .await
        .map_err(|e| {
            error!("Error updating reading progress: {}", e);
            format!("Error updating reading progress: {}", e)
        })
}

#[tauri::command]
pub async fn unzip_book(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    path: String,
) -> Result<String, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let current_path = replace_html_address_path(&path);

    let output_dir = format!("{}/current_book", base_path);
    let ext = std::path::Path::new(&current_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default();

    if !VALID_BOOK_EXTENSION.contains(&ext) {
        return Err("This extension is not (yet) supported".to_string());
    }

    let state_globals = crate::commands::state::AppGlobalVariables::new();

    let _ = app.emit(
        "unzip-progress",
        serde_json::json!({
            "status": "starting",
            "percentage": "0",
            "current_file": current_path,
        }),
    );

    unzip_and_process(
        &current_path,
        &output_dir,
        ext,
        &std::sync::Arc::new(tokio::sync::Mutex::new(state_globals)),
    )
    .await
    .map_err(|e| {
        error!("Error unzipping file: {}", e);
        format!("Failed to unzip file: {}", e)
    })?;

    let _ = app.emit(
        "unzip-progress",
        serde_json::json!({
            "status": "finish",
            "percentage": "100",
            "current_file": "",
        }),
    );

    info!("Unzipped {} to {}", current_path, output_dir);
    Ok(output_dir)
}

#[tauri::command]
pub async fn list_extracted_images(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let current_book_path = format!("{}/current_book", base_path);
    let mut images = get_list_of_images(current_book_path.as_ref(), VALID_IMAGE_EXTENSION);
    images.sort();
    Ok(images)
}

#[tauri::command]
pub async fn list_images_in_directory(path: String) -> Result<Vec<String>, String> {
    let sanitized = replace_html_address_path(&path);
    let mut images = get_list_of_images(sanitized.as_ref(), VALID_IMAGE_EXTENSION);
    images.sort();
    Ok(images)
}

#[tauri::command]
pub async fn is_directory(path: String) -> Result<bool, String> {
    Ok(tokio::fs::metadata(&path)
        .await
        .map(|m| m.is_dir())
        .unwrap_or(false))
}

#[tauri::command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    let sanitized = replace_html_address_path(&path);
    Ok(tokio::fs::metadata(&sanitized).await.is_ok())
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    let sanitized = replace_html_address_path(&path);
    tokio::fs::read_to_string(&sanitized)
        .await
        .map(|s| s.trim_end().to_string())
        .map_err(|e| format!("Failed to read file: {}", e))
}

fn resolve_page_path(
    page: &str,
    method: &str,
    base_path: &str,
    book_path: Option<&str>,
) -> Result<PathBuf, String> {
    match method {
        "DL" => {
            let bp = book_path.ok_or("Missing book_path for DL method")?;
            Ok(PathBuf::from(format!("{}/{}", bp, page)))
        }
        _ => Ok(PathBuf::from(format!(
            "{}/current_book/{}",
            base_path, page
        ))),
    }
}

#[tauri::command]
pub async fn detect_panels(
    state: State<'_, AppState>,
    page: String,
    method: String,
    book_path: Option<String>,
    manga_mode: bool,
) -> Result<Vec<crate::services::panel_detection_service::PanelRect>, String> {
    use crate::services::panel_detection_service::{self, ReadingDirection};

    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let file_path = resolve_page_path(&page, &method, &base_path, book_path.as_deref())?;
    let cache_key = file_path.to_string_lossy().to_string();

    if let Some(cached) = panel_detection_service::get_cached(&cache_key) {
        info!("Panel cache hit for page {}", page);
        return Ok(cached);
    }

    let image_bytes = tokio::fs::read(&file_path).await.map_err(|e| {
        error!(
            "Failed to read image for panel detection {}: {}",
            file_path.display(),
            e
        );
        format!("Failed to read image: {}", e)
    })?;

    let direction = if manga_mode {
        ReadingDirection::RTL
    } else {
        ReadingDirection::LTR
    };

    let key = cache_key.clone();

    let panels = tokio::task::spawn_blocking(move || {
        let result = panel_detection_service::detect_panels(&image_bytes, direction);
        if let Ok(ref p) = result {
            panel_detection_service::set_cached(&key, p);
        }
        result
    })
    .await
    .map_err(|e| format!("Panel detection task failed: {}", e))?
    .map_err(|e| format!("Panel detection error: {}", e))?;

    info!("Detected {} panels for page {}", panels.len(), page);
    Ok(panels)
}

#[tauri::command]
pub async fn detect_panels_batch(
    state: State<'_, AppState>,
    pages: Vec<String>,
    method: String,
    book_path: Option<String>,
    manga_mode: bool,
) -> Result<(), String> {
    use crate::services::panel_detection_service::{self, ReadingDirection};

    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let direction = if manga_mode {
        ReadingDirection::RTL
    } else {
        ReadingDirection::LTR
    };

    for page in pages {
        let file_path = resolve_page_path(&page, &method, &base_path, book_path.as_deref())?;
        let cache_key = file_path.to_string_lossy().to_string();

        if panel_detection_service::get_cached(&cache_key).is_some() {
            continue;
        }

        let image_bytes = match tokio::fs::read(&file_path).await {
            Ok(bytes) => bytes,
            Err(_) => continue,
        };

        let key = cache_key.clone();

        let _ = tokio::task::spawn_blocking(move || {
            if let Ok(panels) = panel_detection_service::detect_panels(&image_bytes, direction) {
                panel_detection_service::set_cached(&key, &panels);
            }
        })
        .await;
    }

    Ok(())
}

#[tauri::command]
pub async fn clear_panel_cache() -> Result<(), String> {
    crate::services::panel_detection_service::clear_cache();
    Ok(())
}

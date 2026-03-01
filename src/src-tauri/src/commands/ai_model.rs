use crate::commands::state::AppState;
use crate::services::panel_detection_service;
use futures::StreamExt;
use std::path::PathBuf;
use tauri::{Emitter, State};

#[tauri::command]
pub async fn check_ai_model(state: State<'_, AppState>) -> Result<bool, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let model_path = PathBuf::from(&base_path).join("model.onnx");
    Ok(model_path.exists())
}

#[tauri::command]
pub async fn download_ai_model(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    url: String,
) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let model_path = PathBuf::from(&base_path).join("model.onnx");

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Server returned error status: {}",
            response.status()
        ));
    }

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file_bytes: Vec<u8> = if total > 0 {
        Vec::with_capacity(total as usize)
    } else {
        Vec::new()
    };

    let _ = app.emit(
        "model-download-progress",
        serde_json::json!({ "downloaded": 0, "total": total, "percentage": 0 }),
    );

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {e}"))?;
        downloaded += chunk.len() as u64;
        file_bytes.extend_from_slice(&chunk);

        let percentage = if total > 0 {
            (downloaded * 100 / total) as u32
        } else {
            0
        };
        let _ = app.emit(
            "model-download-progress",
            serde_json::json!({
                "downloaded": downloaded,
                "total": total,
                "percentage": percentage,
            }),
        );
    }

    std::fs::write(&model_path, file_bytes)
        .map_err(|e| format!("Failed to save model to disk: {e}"))?;

    let model_path_str = model_path
        .to_str()
        .ok_or("Model path contains invalid UTF-8")?
        .to_string();

    if let Err(e) = panel_detection_service::init_model(&model_path_str) {
        return Err(format!("Failed to initialise AI model: {e}"));
    }

    tracing::info!(
        "AI model downloaded and initialised from: {}",
        model_path_str
    );
    Ok(())
}

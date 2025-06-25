use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

fn build_updater(app: &AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    let mut builder = app.updater_builder();

    if let Ok(endpoint) = std::env::var("UPDATER_ENDPOINT") {
        let url =
            url::Url::parse(&endpoint).map_err(|e| format!("Invalid UPDATER_ENDPOINT URL: {e}"))?;
        builder = builder
            .endpoints(vec![url])
            .map_err(|e| format!("Failed to set endpoint: {e}"))?;
        tracing::info!("[updater] Using dev endpoint: {}", endpoint);
    }

    if let Ok(pubkey) = std::env::var("UPDATER_PUBKEY") {
        builder = builder.pubkey(pubkey.clone());
        tracing::info!("[updater] Using dev pubkey override");
    }

    builder
        .build()
        .map_err(|e| format!("Updater build failed: {e}"))
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = build_updater(&app)?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {e}"))?;

    match update {
        Some(u) => {
            let info = UpdateInfo {
                version: u.version.clone(),
                current_version: u.current_version.clone(),
                body: u.body.clone(),
                date: u.date.map(|d| d.to_string()),
            };
            Ok(Some(info))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = build_updater(&app)?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {e}"))?
        .ok_or_else(|| "No update available".to_string())?;

    let app_clone = app.clone();
    let mut total_downloaded: u64 = 0;

    let _ = app.emit(
        "updater-progress",
        serde_json::json!({
            "stage": "downloading",
            "downloaded": 0u64,
            "total": 0u64,
            "percentage": 0u8,
        }),
    );

    update
        .download_and_install(
            move |chunk, content_length| {
                total_downloaded += chunk as u64;
                let total = content_length.unwrap_or(0);
                let percentage = if total > 0 {
                    ((total_downloaded * 100) / total) as u8
                } else {
                    0u8
                };
                let _ = app_clone.emit(
                    "updater-progress",
                    serde_json::json!({
                        "stage": "downloading",
                        "downloaded": total_downloaded,
                        "total": total,
                        "percentage": percentage,
                    }),
                );
            },
            {
                let app2 = app.clone();
                move || {
                    let _ = app2.emit(
                        "updater-progress",
                        serde_json::json!({
                            "stage": "installing",
                            "downloaded": 0u64,
                            "total": 0u64,
                            "percentage": 99u8,
                        }),
                    );
                }
            },
        )
        .await
        .map_err(|e| format!("Update install failed: {e}"))?;

    let _ = app.emit(
        "updater-progress",
        serde_json::json!({
            "stage": "done",
            "downloaded": 0u64,
            "total": 0u64,
            "percentage": 100u8,
        }),
    );

    Ok(())
}

#[tauri::command]
pub async fn open_releases_page(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(
            "https://github.com/Nytuo/CosmicComics/releases",
            None::<&str>,
        )
        .map_err(|e| format!("Failed to open browser: {e}"))
}

#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}

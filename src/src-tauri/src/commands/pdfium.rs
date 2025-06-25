use crate::commands::state::AppState;
use crate::services::pdfium_service;
use flate2::read::GzDecoder;
use futures::StreamExt;
use std::path::PathBuf;
use tar::Archive as TarArchive;
use tauri::{Emitter, State};

fn pdfium_os() -> Result<&'static str, String> {
    match std::env::consts::OS {
        "linux" => Ok("linux"),
        "macos" => Ok("mac"),
        "windows" => Ok("win"),
        other => Err(format!(
            "pdfium-binaries has no pre-built release for OS: {other}"
        )),
    }
}

fn pdfium_arch() -> Result<&'static str, String> {
    match std::env::consts::ARCH {
        "x86_64" => Ok("x64"),
        "aarch64" => Ok("arm64"),
        "x86" => Ok("x86"),
        "arm" => Ok("arm"),
        other => Err(format!(
            "pdfium-binaries has no pre-built release for arch: {other}"
        )),
    }
}

fn archive_lib_entry() -> &'static str {
    if cfg!(target_os = "windows") {
        "lib/pdfium.dll"
    } else if cfg!(target_os = "macos") {
        "lib/libpdfium.dylib"
    } else {
        "lib/libpdfium.so"
    }
}

#[tauri::command]
pub async fn check_pdfium(state: State<'_, AppState>) -> Result<bool, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    Ok(pdfium_service::exists_in(&base_path))
}

#[tauri::command]
pub async fn get_pdfium_platform_info() -> Result<serde_json::Value, String> {
    let os = pdfium_os()?;
    let arch = pdfium_arch()?;
    let archive_name = format!("pdfium-{os}-{arch}.tgz");
    let url = format!(
        "https://github.com/bblanchon/pdfium-binaries/releases/latest/download/{archive_name}"
    );
    Ok(serde_json::json!({
        "os": os,
        "arch": arch,
        "archive": archive_name,
        "lib_file": pdfium_service::lib_filename(),
        "url": url,
    }))
}

#[tauri::command]
pub async fn download_pdfium(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let os = pdfium_os()?;
    let arch = pdfium_arch()?;
    let archive_name = format!("pdfium-{os}-{arch}.tgz");
    let url = format!(
        "https://github.com/bblanchon/pdfium-binaries/releases/latest/download/{archive_name}"
    );
    tracing::info!("Downloading pdfium from: {url}");

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
    let mut tgz_bytes: Vec<u8> = if total > 0 {
        Vec::with_capacity(total as usize)
    } else {
        Vec::new()
    };

    let _ = app.emit(
        "pdfium-download-progress",
        serde_json::json!({
            "stage": "downloading",
            "downloaded": 0u64,
            "total": total,
            "percentage": 0u8,
        }),
    );

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {e}"))?;
        downloaded += chunk.len() as u64;
        tgz_bytes.extend_from_slice(&chunk);

        let percentage = if total > 0 {
            ((downloaded * 90) / total) as u8
        } else {
            0u8
        };
        let _ = app.emit(
            "pdfium-download-progress",
            serde_json::json!({
                "stage": "downloading",
                "downloaded": downloaded,
                "total": total,
                "percentage": percentage,
            }),
        );
    }

    let _ = app.emit(
        "pdfium-download-progress",
        serde_json::json!({
            "stage": "extracting",
            "downloaded": downloaded,
            "total": total,
            "percentage": 92u8,
        }),
    );

    let target_entry = archive_lib_entry();
    let output_lib_path = pdfium_service::lib_path_in(&base_path);

    let tgz_bytes_clone = tgz_bytes;
    let output_lib_path_clone = output_lib_path.clone();
    let target_entry_str = target_entry.to_string();

    tokio::task::spawn_blocking(move || -> Result<(), String> {
        let cursor = std::io::Cursor::new(tgz_bytes_clone);
        let gz = GzDecoder::new(cursor);
        let mut archive = TarArchive::new(gz);

        for entry in archive
            .entries()
            .map_err(|e| format!("Failed to read tar: {e}"))?
        {
            let mut entry = entry.map_err(|e| format!("Tar entry error: {e}"))?;
            let entry_path = entry
                .path()
                .map_err(|e| format!("Invalid tar path: {e}"))?
                .to_string_lossy()
                .replace('\\', "/");

            let matches = entry_path == target_entry_str
                || entry_path.ends_with(&format!(
                    "/{}",
                    PathBuf::from(&target_entry_str)
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                ));

            if matches {
                entry
                    .unpack(&output_lib_path_clone)
                    .map_err(|e| format!("Failed to extract library: {e}"))?;
                tracing::info!("pdfium library extracted to {:?}", output_lib_path_clone);
                return Ok(());
            }
        }

        Err(format!(
            "Entry '{target_entry_str}' not found inside the downloaded archive. \
             The release structure may have changed."
        ))
    })
    .await
    .map_err(|e| format!("Blocking task panicked: {e}"))??;

    let _ = app.emit(
        "pdfium-download-progress",
        serde_json::json!({
            "stage": "extracting",
            "downloaded": downloaded,
            "total": total,
            "percentage": 98u8,
        }),
    );

    pdfium_service::init(&base_path)?;

    let _ = app.emit(
        "pdfium-download-progress",
        serde_json::json!({
            "stage": "done",
            "downloaded": downloaded,
            "total": total,
            "percentage": 100u8,
        }),
    );

    tracing::info!(
        "pdfium downloaded and initialised: {:?}",
        pdfium_service::lib_path_in(&base_path)
    );
    Ok(())
}

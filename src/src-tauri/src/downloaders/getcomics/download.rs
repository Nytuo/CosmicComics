use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Emitter;

use super::build_client;
use super::models::{GetComicsDownloadProgress, GetComicsDownloadRequest};

/// Follow a GetComics /dlds/ redirect to get the final download URL.
async fn resolve_getcomics_redirect(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to resolve redirect: {}", e))?;
    Ok(resp.url().to_string())
}

/// Download a comic from GetComics using a direct download link.
#[tauri::command]
pub async fn download_getcomics(
    app: tauri::AppHandle,
    request: GetComicsDownloadRequest,
) -> Result<String, String> {
    tracing::info!(
        "Downloading GetComics post {} ({})",
        request.post_id,
        request.post_title
    );

    let client = build_client()?;

    let _ = app.emit(
        "getcomics-download-progress",
        GetComicsDownloadProgress {
            post_id: request.post_id.clone(),
            post_title: request.post_title.clone(),
            current_bytes: 0,
            total_bytes: 0,
            status: "downloading".to_string(),
            error: None,
            message: Some("Resolving download link…".to_string()),
        },
    );

    let download_url = if request.download_url.contains("getcomics.org/dlds/") {
        resolve_getcomics_redirect(&client, &request.download_url).await?
    } else {
        request.download_url.clone()
    };

    tracing::info!("Resolved download URL: {}", download_url);

    let _ = app.emit(
        "getcomics-download-progress",
        GetComicsDownloadProgress {
            post_id: request.post_id.clone(),
            post_title: request.post_title.clone(),
            current_bytes: 0,
            total_bytes: 0,
            status: "downloading".to_string(),
            error: None,
            message: Some("Starting download…".to_string()),
        },
    );

    let resp = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        return Err(format!("Download failed with status {}", status));
    }

    let content_length = resp.content_length().unwrap_or(0);

    let filename = resp
        .headers()
        .get("content-disposition")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            v.split("filename=")
                .nth(1)
                .map(|f| f.trim_matches('"').trim_matches('\'').to_string())
        })
        .unwrap_or_else(|| {
            let safe_title = request
                .post_title
                .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
            let ext = download_url
                .rsplit('/')
                .next()
                .and_then(|segment| {
                    let segment = segment.split('?').next().unwrap_or(segment);
                    segment.rsplit('.').next().map(|e| e.to_lowercase())
                })
                .filter(|ext| {
                    matches!(
                        ext.as_str(),
                        "cbz" | "cbr" | "zip" | "rar" | "7z" | "pdf" | "epub"
                    )
                })
                .unwrap_or_else(|| "cbz".to_string());
            format!("{}.{}", safe_title, ext)
        });

    let save_dir = request
        .save_path
        .as_deref()
        .unwrap_or("downloads/getcomics");
    let output_dir = PathBuf::from(save_dir);
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    let output_path = output_dir.join(&filename);

    let mut file = fs::File::create(&output_path)
        .map_err(|e| format!("Failed to create output file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();
    use futures::StreamExt;

    while let Some(chunk_result) = stream.next().await {
        let chunk: bytes::Bytes =
            chunk_result.map_err(|e| format!("Failed to read download chunk: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;
        downloaded += chunk.len() as u64;

        if downloaded % (100 * 1024) < chunk.len() as u64 {
            let _ = app.emit(
                "getcomics-download-progress",
                GetComicsDownloadProgress {
                    post_id: request.post_id.clone(),
                    post_title: request.post_title.clone(),
                    current_bytes: downloaded,
                    total_bytes: content_length,
                    status: "downloading".to_string(),
                    error: None,
                    message: None,
                },
            );
        }
    }

    let output_path_str = output_path.to_string_lossy().to_string();

    let _ = app.emit(
        "getcomics-download-progress",
        GetComicsDownloadProgress {
            post_id: request.post_id.clone(),
            post_title: request.post_title.clone(),
            current_bytes: downloaded,
            total_bytes: content_length,
            status: "completed".to_string(),
            error: None,
            message: None,
        },
    );

    tracing::info!(
        "Downloaded '{}' to {:?} ({} bytes)",
        request.post_title,
        output_path_str,
        downloaded
    );
    Ok(output_path_str)
}

use aes::cipher::{block_padding::NoPadding, BlockDecryptMut, KeyIvInit};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;
use tauri::Manager;

use super::models::{DCDownloadProgress, DCDownloadRequest};

type Aes256CbcDec = cbc::Decryptor<aes::Aes256>;

#[derive(Debug, Deserialize)]
struct DCDownloadManifest {
    job_id: String,
    uuid: String,
    #[allow(dead_code)]
    page: u32,
    #[allow(dead_code)]
    page_size: u32,
    format: String,
    num_pages: u32,
    images: Vec<DCDownloadImage>,
}

#[derive(Debug, Deserialize)]
struct DCDownloadImage {
    page_number: u32,
    signed_url: String,
    #[allow(dead_code)]
    thumbnail_url: Option<String>,
    #[allow(dead_code)]
    height: Option<u32>,
    #[allow(dead_code)]
    width: Option<u32>,
}

/// Decrypt a DC Universe Infinite .enc page file.
///
/// File layout:
///   [0..4]   original_size (u32 little-endian)
///   [4..8]   padding / unused
///   [8..24]  AES IV (16 bytes)
///   [24..]   AES-256-CBC ciphertext (NoPadding)
///
/// Key = SHA-256( uuid + pageNumber + jobId + formatId ) — all concatenated as strings.
fn dc_decrypt_page(
    encrypted: &[u8],
    uuid: &str,
    page_number: u32,
    job_id: &str,
    format_id: &str,
) -> Result<Vec<u8>, String> {
    if encrypted.len() < 25 {
        return Err("Encrypted data too short".to_string());
    }

    let original_size = u32::from_le_bytes(
        encrypted[0..4]
            .try_into()
            .map_err(|_| "Failed to read original size")?,
    ) as usize;

    let iv: [u8; 16] = encrypted[8..24]
        .try_into()
        .map_err(|_| "Failed to read IV")?;

    let key_input = format!("{}{}{}{}", uuid, page_number, job_id, format_id);
    let key: [u8; 32] = Sha256::digest(key_input.as_bytes()).into();

    let ciphertext = &encrypted[24..];
    let mut buf = ciphertext.to_vec();

    let padded_len = (buf.len() / 16) * 16;
    buf.truncate(padded_len);

    let decryptor = Aes256CbcDec::new(&key.into(), &iv.into());
    decryptor
        .decrypt_padded_mut::<NoPadding>(&mut buf)
        .map_err(|e| format!("AES decryption failed: {}", e))?;

    if original_size > 0 && original_size <= buf.len() {
        buf.truncate(original_size);
    }

    Ok(buf)
}

/// Build an HTTP cookie header string from a cookies HashMap.
/// Filters to only essential cookies to avoid HTTP 431 "Request Header Fields Too Large".
fn build_dc_cookie_header(cookies: &HashMap<String, String>) -> String {
    let essential_prefixes = [
        "auth", "session", "token", "access", "refresh", "user", "identity", "_wbd", "dcui",
        "optanon",
    ];

    cookies
        .iter()
        .filter(|(name, _)| {
            let lower = name.to_lowercase();
            essential_prefixes
                .iter()
                .any(|prefix| lower.contains(prefix))
                || lower.len() < 20
        })
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("; ")
}

/// Download a comic from DC Universe Infinite via direct API + AES decryption.
///
/// Flow:
/// 1. GET /api/5/1/rights/comic/{uuid} → JWT token
/// 2. GET /api/comics/1/book/download/?page=1&quality=SD (with X-Auth-JWT)
///    → download manifest with signed URLs and page ordering
/// 3. Download each .enc file from signed_url
/// 4. Decrypt AES-256-CBC → PNG
/// 5. Save ordered by page_number
#[tauri::command]
pub async fn download_dc_infinite_comic(
    app: tauri::AppHandle,
    request: DCDownloadRequest,
) -> Result<String, String> {
    tracing::info!(
        "Downloading DC Infinite comic: {} ({})",
        request.comic_title,
        request.comic_id
    );

    let state = app.state::<crate::commands::AppState>();
    let base_path = state.config.lock().await.base_path.clone();

    let save_dir = if let Some(path) = request.save_path {
        PathBuf::from(path)
    } else {
        PathBuf::from(&base_path)
            .join("downloads")
            .join("dc_infinite")
    };

    fs::create_dir_all(&save_dir)
        .map_err(|e| format!("Failed to create download directory: {}", e))?;

    let comic_dir = save_dir.join(format!(
        "{}_{}",
        request.comic_title.replace(' ', "_").replace('/', "-"),
        &request.comic_id[..8.min(request.comic_id.len())]
    ));
    fs::create_dir_all(&comic_dir)
        .map_err(|e| format!("Failed to create comic directory: {}", e))?;

    if request.cookies.is_empty() {
        return Err(
            "No authentication cookies provided. Please log in to DC Universe Infinite first."
                .to_string(),
        );
    }

    let cookie_header = build_dc_cookie_header(&request.cookies);

    let session_token = request.cookies.get("session").cloned().unwrap_or_default();

    if session_token.is_empty() {
        return Err(
            "No 'session' cookie found. Please log in to DC Universe Infinite and try again."
                .to_string(),
        );
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let _ = app.emit(
        "dc-download-progress",
        DCDownloadProgress {
            comic_id: request.comic_id.clone(),
            comic_title: request.comic_title.clone(),
            current_page: 0,
            total_pages: 0,
            status: "authenticating".to_string(),
            error: None,
            message: Some("Fetching platform config…".to_string()),
        },
    );

    let consumer_resp = client
        .get("https://www.dcuniverseinfinite.com/api/5/consumer/www")
        .header("Cookie", &cookie_header)
        .header("Authorization", format!("Token {}", session_token))
        .header("Accept", "application/json")
        .header("Referer", "https://www.dcuniverseinfinite.com/")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch consumer config: {}", e))?;

    let consumer_key = if consumer_resp.status().is_success() {
        let body: serde_json::Value = consumer_resp.json().await.unwrap_or_default();
        body.get("consumer_secret")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown_consumer_key")
            .to_string()
    } else {
        tracing::error!(
            "Failed to fetch consumer config: {}",
            consumer_resp.status()
        );
        "unknown_consumer_key".to_string()
    };

    tracing::info!("Using consumer key: {}", consumer_key);

    let _ = app.emit(
        "dc-download-progress",
        DCDownloadProgress {
            comic_id: request.comic_id.clone(),
            comic_title: request.comic_title.clone(),
            current_page: 0,
            total_pages: 0,
            status: "authenticating".to_string(),
            error: None,
            message: Some("Acquiring reading rights…".to_string()),
        },
    );

    let rights_url = format!(
        "https://www.dcuniverseinfinite.com/api/5/1/rights/comic/{}",
        request.comic_id
    );
    tracing::info!("Fetching rights JWT from {}", rights_url);

    let rights_resp = client
        .get(&rights_url)
        .header("Cookie", &cookie_header)
        .header("Authorization", format!("Token {}", session_token))
        .header("X-Consumer-Key", &consumer_key)
        .header("Accept", "application/json")
        .header("Referer", "https://www.dcuniverseinfinite.com/")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch rights token: {}", e))?;

    if !rights_resp.status().is_success() {
        let status = rights_resp.status();
        let body = rights_resp.text().await.unwrap_or_default();
        return Err(format!(
            "Rights API returned HTTP {} — you may not have access to this comic. Response: {}",
            status,
            &body[..body.len().min(500)]
        ));
    }

    let jwt_raw = rights_resp
        .text()
        .await
        .map_err(|e| format!("Failed to read rights response: {}", e))?;
    let jwt = jwt_raw.trim().trim_matches('"').to_string();
    tracing::info!("Got JWT token ({} chars)", jwt.len());

    let _ = app.emit(
        "dc-download-progress",
        DCDownloadProgress {
            comic_id: request.comic_id.clone(),
            comic_title: request.comic_title.clone(),
            current_page: 0,
            total_pages: 0,
            status: "fetching_manifest".to_string(),
            error: None,
            message: Some("Fetching page list…".to_string()),
        },
    );

    let mut all_images: Vec<DCDownloadImage> = Vec::new();
    let format_id: String;

    let download_url = "https://www.dcuniverseinfinite.com/api/comics/1/book/download/";

    tracing::info!("Fetching download manifest page 1");
    let manifest_resp = client
        .get(download_url)
        .query(&[("page", "1"), ("quality", "SD")])
        .header("Cookie", &cookie_header)
        .header("X-Auth-JWT", &jwt)
        .header("Authorization", format!("Token {}", &session_token))
        .header("X-Consumer-Key", &consumer_key)
        .header("Accept", "application/json")
        .header(
            "Referer",
            format!(
                "https://www.dcuniverseinfinite.com/comics/book/comic/{}/c/reader",
                request.comic_id
            ),
        )
        .send()
        .await
        .map_err(|e| format!("Failed to fetch download manifest: {}", e))?;

    if !manifest_resp.status().is_success() {
        let status = manifest_resp.status();
        let body = manifest_resp.text().await.unwrap_or_default();
        return Err(format!(
            "Download manifest API returned HTTP {}. Response: {}",
            status,
            &body[..body.len().min(500)]
        ));
    }

    let manifest: DCDownloadManifest = manifest_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse download manifest: {}", e))?;

    let job_id = manifest.job_id.clone();
    format_id = manifest.format.clone();
    let comic_uuid = manifest.uuid.clone();
    let num_api_pages = manifest.num_pages;
    all_images.extend(manifest.images);

    tracing::info!(
        "Manifest page 1: {} images, {} total API pages, job_id={}, format={}",
        all_images.len(),
        num_api_pages,
        job_id,
        format_id
    );

    for api_page in 2..=num_api_pages {
        tracing::info!("Fetching download manifest page {}", api_page);
        let resp = client
            .get(download_url)
            .query(&[("page", &api_page.to_string()), ("quality", &format_id)])
            .header("Cookie", &cookie_header)
            .header("X-Auth-JWT", &jwt)
            .header("Authorization", format!("Token {}", &session_token))
            .header("X-Consumer-Key", &consumer_key)
            .header("Accept", "application/json")
            .header(
                "Referer",
                format!(
                    "https://www.dcuniverseinfinite.com/comics/book/comic/{}/c/reader",
                    request.comic_id
                ),
            )
            .send()
            .await
            .map_err(|e| format!("Failed to fetch manifest page {}: {}", api_page, e))?;

        if resp.status().is_success() {
            let extra: DCDownloadManifest = resp
                .json()
                .await
                .map_err(|e| format!("Failed to parse manifest page {}: {}", api_page, e))?;
            all_images.extend(extra.images);
        } else {
            tracing::warn!(
                "Manifest page {} returned HTTP {}, skipping",
                api_page,
                resp.status()
            );
        }
    }

    all_images.sort_by_key(|img| img.page_number);

    let total_pages = all_images.len() as u32;
    tracing::info!(
        "Total pages to download: {} (pages {}-{})",
        total_pages,
        all_images.first().map(|i| i.page_number).unwrap_or(0),
        all_images.last().map(|i| i.page_number).unwrap_or(0)
    );

    if total_pages == 0 {
        return Err("Download manifest returned 0 pages".to_string());
    }

    let mut saved_count = 0u32;

    for img in &all_images {
        let _ = app.emit(
            "dc-download-progress",
            DCDownloadProgress {
                comic_id: request.comic_id.clone(),
                comic_title: request.comic_title.clone(),
                current_page: img.page_number,
                total_pages,
                status: "downloading".to_string(),
                error: None,
                message: Some(format!(
                    "Downloading page {}/{}",
                    img.page_number, total_pages
                )),
            },
        );

        tracing::info!(
            "Downloading page {}/{}: {}",
            img.page_number,
            total_pages,
            &img.signed_url[..img.signed_url.len().min(80)]
        );

        let enc_resp = match client
            .get(&img.signed_url)
            .header("Accept", "*/*")
            .header("Referer", "https://www.dcuniverseinfinite.com/")
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to download page {}: {}", img.page_number, e);
                continue;
            }
        };

        if !enc_resp.status().is_success() {
            tracing::error!(
                "Page {} download returned HTTP {}",
                img.page_number,
                enc_resp.status()
            );
            continue;
        }

        let enc_bytes = match enc_resp.bytes().await {
            Ok(b) => b.to_vec(),
            Err(e) => {
                tracing::error!("Failed to read page {} body: {}", img.page_number, e);
                continue;
            }
        };

        tracing::info!(
            "Downloaded page {}: {} bytes encrypted",
            img.page_number,
            enc_bytes.len()
        );

        let _ = app.emit(
            "dc-download-progress",
            DCDownloadProgress {
                comic_id: request.comic_id.clone(),
                comic_title: request.comic_title.clone(),
                current_page: img.page_number,
                total_pages,
                status: "decrypting".to_string(),
                error: None,
                message: Some(format!(
                    "Decrypting page {}/{}",
                    img.page_number, total_pages
                )),
            },
        );

        let decrypted = match dc_decrypt_page(
            &enc_bytes,
            &comic_uuid,
            img.page_number,
            &job_id,
            &format_id,
        ) {
            Ok(data) => data,
            Err(e) => {
                tracing::error!("Failed to decrypt page {}: {}", img.page_number, e);
                continue;
            }
        };

        let ext = if decrypted.len() >= 4 && decrypted[..4] == [0x89, 0x50, 0x4E, 0x47] {
            "png"
        } else if decrypted.len() >= 2 && decrypted[..2] == [0xFF, 0xD8] {
            "jpg"
        } else if decrypted.len() >= 4 && &decrypted[..4] == b"RIFF" {
            "webp"
        } else {
            "png"
        };

        let file_path = comic_dir.join(format!("page_{:03}.{}", img.page_number, ext));

        match fs::write(&file_path, &decrypted) {
            Ok(_) => {
                saved_count += 1;
                tracing::info!(
                    "Saved page {}/{}: {} ({} bytes)",
                    img.page_number,
                    total_pages,
                    file_path.display(),
                    decrypted.len()
                );
            }
            Err(e) => {
                tracing::error!("Failed to save page {}: {}", img.page_number, e);
            }
        }
    }

    if saved_count == 0 {
        let error_msg =
            "No pages could be decrypted successfully. Check authentication and comic access."
                .to_string();
        let _ = app.emit(
            "dc-download-progress",
            DCDownloadProgress {
                comic_id: request.comic_id.clone(),
                comic_title: request.comic_title.clone(),
                current_page: 0,
                total_pages,
                status: "failed".to_string(),
                error: Some(error_msg.clone()),
                message: None,
            },
        );
        return Err(error_msg);
    }

    let _ = app.emit(
        "dc-download-progress",
        DCDownloadProgress {
            comic_id: request.comic_id.clone(),
            comic_title: request.comic_title.clone(),
            current_page: saved_count,
            total_pages,
            status: "archiving".to_string(),
            error: None,
            message: Some("Files saved, adding to library…".to_string()),
        },
    );

    let metadata = serde_json::json!({
        "id": request.comic_id,
        "title": request.comic_title,
        "download_date": chrono::Utc::now().to_rfc3339(),
        "source": "DC Universe Infinite",
        "pages": saved_count,
        "format": format_id,
    });
    let metadata_path = comic_dir.join("metadata.json");
    fs::write(
        &metadata_path,
        serde_json::to_string_pretty(&metadata).unwrap(),
    )
    .map_err(|e| format!("Failed to write DC metadata: {}", e))?;

    tracing::info!(
        "Download complete: {}/{} pages saved to {}",
        saved_count,
        total_pages,
        comic_dir.display()
    );

    Ok(comic_dir.to_string_lossy().to_string())
}

/// Get download progress for a DC comic (stub — progress is emitted as events).
#[tauri::command]
pub async fn get_dc_infinite_download_progress(
    comic_id: String,
) -> Result<DCDownloadProgress, String> {
    Ok(DCDownloadProgress {
        comic_id,
        comic_title: "".to_string(),
        current_page: 0,
        total_pages: 0,
        status: "completed".to_string(),
        error: None,
        message: None,
    })
}

use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Emitter;

use super::models::{MangaDexDownloadProgress, MangaDexDownloadRequest, MangaDexManga};
use super::search::parse_manga;
use super::{build_client, MANGADEX_API};

/// Download a chapter from MangaDex.
#[tauri::command]
pub async fn download_mangadex_chapter(
    app: tauri::AppHandle,
    request: MangaDexDownloadRequest,
) -> Result<String, String> {
    tracing::info!(
        "Downloading MangaDex chapter {} ({})",
        request.chapter_id,
        request.chapter_title
    );

    let quality = request.data_quality.as_deref().unwrap_or("data");

    let client = build_client()?;

    let at_home_url = format!("{}/at-home/server/{}", MANGADEX_API, request.chapter_id);
    let resp = client
        .get(&at_home_url)
        .send()
        .await
        .map_err(|e| format!("at-home request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("at-home failed ({}): {}", status, body));
    }

    let at_home: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse at-home response: {}", e))?;

    let base_url = at_home
        .get("baseUrl")
        .and_then(|v| v.as_str())
        .ok_or("Missing baseUrl")?
        .to_string();
    let chapter_hash = at_home
        .get("chapter")
        .and_then(|c| c.get("hash"))
        .and_then(|v| v.as_str())
        .ok_or("Missing chapter hash")?
        .to_string();

    let pages: Vec<String> = at_home
        .get("chapter")
        .and_then(|c| c.get(quality))
        .and_then(|v| v.as_array())
        .ok_or(format!("Missing {} data in at-home response", quality))?
        .iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();

    if pages.is_empty() {
        return Err("No pages found for this chapter".to_string());
    }

    let total_pages = pages.len() as u32;

    let safe_title = request
        .manga_title
        .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let safe_chapter = request
        .chapter_title
        .replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let chapter_label = if request.chapter_title.is_empty() {
        format!(
            "Ch.{}",
            request.chapter_id.chars().take(8).collect::<String>()
        )
    } else {
        safe_chapter.clone()
    };

    let save_dir = request.save_path.as_deref().unwrap_or("downloads/mangadex");
    let output_dir = PathBuf::from(save_dir)
        .join(&safe_title)
        .join(&chapter_label);
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    let img_client = reqwest::Client::builder()
        .user_agent("CosmicComics/1.0")
        .build()
        .map_err(|e| format!("Failed to build image client: {}", e))?;

    for (i, page_filename) in pages.iter().enumerate() {
        let page_num = (i + 1) as u32;

        let _ = app.emit(
            "mangadex-download-progress",
            MangaDexDownloadProgress {
                chapter_id: request.chapter_id.clone(),
                chapter_title: request.chapter_title.clone(),
                current_page: page_num,
                total_pages,
                status: "downloading".to_string(),
                error: None,
                message: None,
            },
        );

        let img_url = format!(
            "{}/{}/{}/{}",
            base_url, quality, chapter_hash, page_filename
        );

        let img_resp = img_client
            .get(&img_url)
            .send()
            .await
            .map_err(|e| format!("Failed to download page {}: {}", page_num, e))?;

        if !img_resp.status().is_success() {
            tracing::warn!(
                "Failed to download page {} (status {})",
                page_num,
                img_resp.status()
            );
            continue;
        }

        let bytes = img_resp
            .bytes()
            .await
            .map_err(|e| format!("Failed to read page {} bytes: {}", page_num, e))?;

        let ext = page_filename.rsplit('.').next().unwrap_or("jpg");
        let out_path = output_dir.join(format!("{:04}.{}", page_num, ext));

        fs::write(&out_path, &bytes)
            .map_err(|e| format!("Failed to write page {}: {}", page_num, e))?;
    }

    let _ = app.emit(
        "mangadex-download-progress",
        MangaDexDownloadProgress {
            chapter_id: request.chapter_id.clone(),
            chapter_title: request.chapter_title.clone(),
            current_page: total_pages,
            total_pages,
            status: "archiving".to_string(),
            error: None,
            message: Some("Creating CBZ archive…".to_string()),
        },
    );

    let cbz_name = if request.chapter_title.is_empty() {
        format!(
            "{} - Ch.{}.cbz",
            safe_title,
            request.chapter_id.chars().take(8).collect::<String>()
        )
    } else {
        format!("{} - {}.cbz", safe_title, chapter_label)
    };
    let cbz_path = PathBuf::from(save_dir).join(&safe_title).join(&cbz_name);

    let cbz_file =
        fs::File::create(&cbz_path).map_err(|e| format!("Failed to create CBZ file: {}", e))?;

    let mut zip = zip::ZipWriter::new(cbz_file);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    let mut entries: Vec<_> = fs::read_dir(&output_dir)
        .map_err(|e| format!("Failed to read output directory: {}", e))?
        .filter_map(|e| e.ok())
        .collect();
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let path = entry.path();
        if path.is_file() {
            let name = path.file_name().unwrap().to_string_lossy().to_string();
            let data = fs::read(&path).map_err(|e| format!("Failed to read {}: {}", name, e))?;
            zip.start_file(&name, options)
                .map_err(|e| format!("Failed to start zip entry: {}", e))?;
            zip.write_all(&data)
                .map_err(|e| format!("Failed to write zip entry: {}", e))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize CBZ: {}", e))?;

    let _ = fs::remove_dir_all(&output_dir);

    let cbz_path_str = cbz_path.to_string_lossy().to_string();

    let _ = app.emit(
        "mangadex-download-progress",
        MangaDexDownloadProgress {
            chapter_id: request.chapter_id.clone(),
            chapter_title: request.chapter_title.clone(),
            current_page: total_pages,
            total_pages,
            status: "completed".to_string(),
            error: None,
            message: None,
        },
    );

    tracing::info!("Downloaded chapter to {:?}", cbz_path_str);
    Ok(cbz_path_str)
}

/// Get recently updated manga from MangaDex.
#[tauri::command]
pub async fn get_mangadex_recently_updated() -> Result<Vec<MangaDexManga>, String> {
    tracing::info!("Getting recently updated manga from MangaDex");

    let client = build_client()?;

    let url = format!(
        "{}/manga?limit=20&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&order[latestUploadedChapter]=desc",
        MANGADEX_API
    );

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Recently updated request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Recently updated failed ({}): {}", status, body));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let data = body
        .get("data")
        .and_then(|v| v.as_array())
        .ok_or("No data in response")?;

    let results: Vec<MangaDexManga> = data.iter().filter_map(|item| parse_manga(item)).collect();

    tracing::info!("Found {} recently updated manga", results.len());
    Ok(results)
}

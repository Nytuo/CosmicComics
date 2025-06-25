use super::models::{VizChapter, VizDownloadProgress};
use crate::providers::ProviderKind;
use std::collections::HashMap;
use tauri::{Emitter, Manager};

fn emit_viz_db_stage(
    app: &tauri::AppHandle,
    chapter_id: &str,
    chapter_title: &str,
    msg: &str,
    total_pages: u32,
) {
    let _ = app.emit(
        "viz-download-progress",
        VizDownloadProgress {
            chapter_id: chapter_id.to_string(),
            chapter_title: chapter_title.to_string(),
            current_page: total_pages,
            total_pages,
            status: "db_inserting".to_string(),
            error: None,
            message: Some(msg.to_string()),
        },
    );
}

/// Insert a downloaded VIZ chapter into the database.
#[tauri::command]
pub async fn insert_viz_book_to_db(
    app: tauri::AppHandle,
    chapter: VizChapter,
    saved_path: String,
) -> Result<(), String> {
    use crate::models::{BookRecord, DisplayCreator, SeriesRecord};

    use crate::services::archive_service::download_image_to_disk;

    let total_pages = chapter.page_count.unwrap_or(0);

    emit_viz_db_stage(
        &app,
        &chapter.id,
        &chapter.title,
        "Connecting to library…",
        total_pages,
    );

    let state = app.state::<crate::commands::AppState>();
    let base_path = state.config.lock().await.base_path.clone();
    let global = state.global_vars.lock().await;
    let repo = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("Failed to get SurrealDB: {}", e))?;
    drop(global);

    let series_title = chapter
        .series_title
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or(&chapter.title)
        .to_string();

    let series_path = std::path::Path::new(&saved_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| base_path.clone());

    let viz_book_ext_id = format!("viz_{}", chapter.id);

    emit_viz_db_stage(
        &app,
        &chapter.id,
        &chapter.title,
        "Saving to library (VIZ Media data)…",
        total_pages,
    );
    tracing::info!("[viz_insert] Falling back to VIZ scraped data");

    let series_external_id = chapter
        .series_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            format!(
                "viz_{}",
                series_title.replace(' ', "_").to_ascii_lowercase()
            )
        });

    let series_cover = {
        let url = &chapter.cover_url;
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let fname = format!("10_s_{}", series_external_id.replace(':', "_"));
            match download_image_to_disk(url, &repo.covers_dir, &fname).await {
                Ok(p) => p,
                Err(_) => url.clone(),
            }
        } else {
            url.clone()
        }
    };

    let series_record = SeriesRecord {
        external_id: series_external_id.clone(),
        provider_id: ProviderKind::VIZ.id(),
        provider_name: ProviderKind::VIZ.name().to_string(),
        title: series_title.clone(),
        path: series_path.clone(),
        cover_url: Some(series_cover.clone()),
        bg_url: Some(series_cover),
        ..Default::default()
    };

    let inserted_series = repo
        .upsert_series(series_record)
        .await
        .map_err(|e| format!("Failed to upsert VIZ series: {}", e))?;

    let series_id_str = inserted_series.id.as_ref().map(|v| v.to_string());

    let book_cover = {
        let url = &chapter.cover_url;
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let fname = format!("10_b_{}", chapter.id.replace(':', "_"));
            match download_image_to_disk(url, &repo.covers_dir, &fname).await {
                Ok(p) => p,
                Err(_) => url.clone(),
            }
        } else {
            url.clone()
        }
    };

    let creators: Vec<DisplayCreator> = chapter
        .creators
        .as_deref()
        .unwrap_or_default()
        .iter()
        .map(|name| DisplayCreator {
            name: name.clone(),
            role: None,
            image_url: None,
        })
        .collect();

    let mut extra = HashMap::new();
    if let Some(ref sub) = chapter.subscription {
        extra.insert("subscription".into(), serde_json::json!(sub));
    }
    if let Some(ref date) = chapter.publish_date {
        extra.insert("publish_date".into(), serde_json::json!(date));
    }
    if let Some(free) = chapter.free {
        extra.insert("free".into(), serde_json::json!(free));
    }

    let book_record = BookRecord {
        external_id: viz_book_ext_id,
        provider_id: ProviderKind::VIZ.id(),
        provider_name: ProviderKind::VIZ.name().to_string(),
        title: chapter.title.clone(),
        path: saved_path.clone(),
        cover_url: Some(book_cover),
        description: if chapter.description.is_empty() {
            None
        } else {
            Some(chapter.description.clone())
        },
        issue_number: Some(chapter.chapter_number.clone()),
        format: Some("CBZ".into()),
        page_count: chapter.page_count.map(|p| p as i64).unwrap_or(0),
        series_id: series_id_str,
        creators,
        extra,
        ..Default::default()
    };

    repo.upsert_book(book_record)
        .await
        .map_err(|e| format!("Failed to upsert VIZ book: {}", e))?;

    tracing::info!("[viz_insert] Book inserted via VIZ scraped fallback");
    Ok(())
}

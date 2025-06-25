use super::models::{DCDownloadProgress, DCInfiniteComic};
use crate::providers::ProviderKind;
use std::collections::HashMap;
use tauri::{Emitter, Manager};

fn emit_dc_db_stage(
    app: &tauri::AppHandle,
    comic_id: &str,
    comic_title: &str,
    msg: &str,
    total_pages: u32,
) {
    let _ = app.emit(
        "dc-download-progress",
        DCDownloadProgress {
            comic_id: comic_id.to_string(),
            comic_title: comic_title.to_string(),
            current_page: total_pages,
            total_pages,
            status: "db_inserting".to_string(),
            error: None,
            message: Some(msg.to_string()),
        },
    );
}

/// Insert a downloaded DC Infinite comic into the database.
#[tauri::command]
pub async fn insert_dc_infinite_book_to_db(
    app: tauri::AppHandle,
    comic: DCInfiniteComic,
    saved_path: String,
) -> Result<(), String> {
    use crate::models::{BookRecord, DisplayCreator, SeriesRecord};
    use crate::providers::metron_provider::MetronProvider;
    use crate::providers::provider_trait::{ApiCredentials, Provider};
    use crate::services::archive_service::download_image_to_disk;

    let total_pages = comic.page_count.unwrap_or(0);

    emit_dc_db_stage(
        &app,
        &comic.id,
        &comic.title,
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

    let creds_lock = state.creds.lock().await;
    let creds = ApiCredentials {
        marvel_public_key: creds_lock.marvel_public_key.clone(),
        marvel_private_key: creds_lock.marvel_private_key.clone(),
        google_books_api_key: creds_lock.google_books_api_key.clone(),
        open_library_api_key: creds_lock.open_library_api_key.clone(),
        metron_username: creds_lock.metron_username.clone(),
        metron_password: creds_lock.metron_password.clone(),
    };
    drop(creds_lock);

    let series_title = comic
        .series_title
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or(&comic.title)
        .to_string();

    let series_path = std::path::Path::new(&saved_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| base_path.clone());

    let publish_year: Option<String> = comic
        .publish_date
        .as_deref()
        .and_then(|d| d.get(..4))
        .map(|y| y.to_string());

    let dc_book_ext_id = format!("dc_{}", comic.id);

    let rollback_series = |repo: &crate::repositories::surreal_repo::SurrealRepo,
                           series_id: String| {
        let r = repo.clone();
        async move {
            match r.count_books_with_real_path_in_series(&series_id).await {
                Ok(0) => {
                    let _ = r.delete_series(&series_id).await;
                    tracing::info!("[dc_insert] Rolled back orphaned series ({})", series_id);
                }
                _ => {}
            }
        }
    };

    if !creds.metron_username.is_empty() && !creds.metron_password.is_empty() {
        emit_dc_db_stage(
            &app,
            &comic.id,
            &comic.title,
            "Searching Metron for series…",
            total_pages,
        );
        let metron = MetronProvider;

        match metron
            .insert_series_surreal(&repo, &series_title, &series_path, &creds)
            .await
        {
            Ok(series) if !series.external_id.starts_with("manual_") => {
                let series_id_str = series.id.as_ref().map(|v| v.to_string());
                emit_dc_db_stage(
                    &app,
                    &comic.id,
                    &comic.title,
                    "Searching Metron for issue…",
                    total_pages,
                );
                match metron
                    .build_book_record(&comic.title, &saved_path, publish_year.as_deref(), &creds)
                    .await
                {
                    Ok(mut book) if !book.external_id.starts_with("manual_") => {
                        if let Some(url) = book.cover_url.clone() {
                            if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:")
                            {
                                let fname = format!("6_b_{}", book.external_id);
                                if let Ok(p) =
                                    download_image_to_disk(&url, &repo.covers_dir, &fname).await
                                {
                                    book.cover_url = Some(p);
                                }
                            }
                        }
                        book.series_id = series_id_str;
                        book.path = saved_path.clone();
                        emit_dc_db_stage(
                            &app,
                            &comic.id,
                            &comic.title,
                            "Saving to library via Metron…",
                            total_pages,
                        );
                        if repo.upsert_book(book).await.is_ok() {
                            tracing::info!("[dc_insert] Book inserted via Metron");
                            return Ok(());
                        }
                        if let Some(ref sid) = series.id {
                            rollback_series(&repo, sid.to_string()).await;
                        }
                    }
                    _ => {
                        if let Some(ref sid) = series.id {
                            rollback_series(&repo, sid.to_string()).await;
                        }
                    }
                }
            }
            Ok(series) => {
                if let Some(ref sid) = series.id {
                    rollback_series(&repo, sid.to_string()).await;
                }
            }
            Err(e) => tracing::warn!("[dc_insert] Metron series failed: {}", e),
        }
    }

    emit_dc_db_stage(
        &app,
        &comic.id,
        &comic.title,
        "Saving to library (DC Universe Infinite data)…",
        total_pages,
    );
    tracing::info!("[dc_insert] Falling back to DC scraped data");

    let series_external_id = comic
        .series_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("dc_{}", series_title.replace(' ', "_").to_ascii_lowercase()));

    let series_cover = {
        let url = &comic.cover_url;
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let fname = format!("9_s_{}", series_external_id.replace(':', "_"));
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
        provider_id: ProviderKind::DCInfinite.id(),
        provider_name: ProviderKind::DCInfinite.name().to_string(),
        title: series_title.clone(),
        path: series_path.clone(),
        cover_url: Some(series_cover.clone()),
        bg_url: Some(series_cover),
        ..Default::default()
    };

    let inserted_series = repo
        .upsert_series(series_record)
        .await
        .map_err(|e| format!("Failed to upsert DC series: {}", e))?;

    let series_id_str = inserted_series.id.as_ref().map(|v| v.to_string());

    let book_cover = {
        let url = &comic.cover_url;
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let fname = format!("9_b_{}", comic.id.replace(':', "_"));
            match download_image_to_disk(url, &repo.covers_dir, &fname).await {
                Ok(p) => p,
                Err(_) => url.clone(),
            }
        } else {
            url.clone()
        }
    };

    let creators: Vec<DisplayCreator> = comic
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
    if let Some(ref price) = comic.price {
        extra.insert("price".into(), serde_json::json!(price));
    }
    if let Some(ref rating) = comic.rating {
        extra.insert("rating".into(), serde_json::json!(rating));
    }
    if let Some(ref date) = comic.publish_date {
        extra.insert("publish_date".into(), serde_json::json!(date));
    }

    let book_record = BookRecord {
        external_id: dc_book_ext_id,
        provider_id: ProviderKind::DCInfinite.id(),
        provider_name: ProviderKind::DCInfinite.name().to_string(),
        title: comic.title.clone(),
        path: saved_path.clone(),
        cover_url: Some(book_cover),
        description: if comic.description.is_empty() {
            None
        } else {
            Some(comic.description.clone())
        },
        issue_number: Some(comic.issue_number.clone()),
        format: comic.format.clone().or_else(|| Some("CBZ".into())),
        page_count: comic.page_count.map(|p| p as i64).unwrap_or(0),
        series_id: series_id_str,
        creators,
        extra,
        ..Default::default()
    };

    repo.upsert_book(book_record)
        .await
        .map_err(|e| format!("Failed to upsert DC book: {}", e))?;

    tracing::info!("[dc_insert] Book inserted via DC scraped fallback");
    Ok(())
}

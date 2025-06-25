use super::models::{DownloadProgress, MarvelUnlimitedComic};
use crate::providers::ProviderKind;
use std::collections::HashMap;
use tauri::{Emitter, Manager};

fn emit_db_stage(
    app: &tauri::AppHandle,
    comic_id: &str,
    comic_title: &str,
    msg: &str,
    total_pages: u32,
) {
    let _ = app.emit(
        "marvel-download-progress",
        DownloadProgress {
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

/// After a Marvel Unlimited comic is downloaded, insert both the series and the book
/// into SurrealDB. Tries data sources in this order:
///   1. Marvel API  (requires marvel_public_key + marvel_private_key)
///   2. Metron      (requires metron_username + metron_password)
///   3. Fallback    — MU scraped fields only
///
/// Progress events (`marvel-download-progress` with `status=db_inserting`) are emitted
/// at each stage. On partial failure, orphaned series records are rolled back.
#[tauri::command]
pub async fn insert_marvel_unlimited_book_to_db(
    app: tauri::AppHandle,
    comic: MarvelUnlimitedComic,
    saved_path: String,
) -> Result<(), String> {
    use crate::models::{BookRecord, DisplayCreator, SeriesRecord};
    use crate::providers::marvel_provider::MarvelProvider;
    use crate::providers::metron_provider::MetronProvider;
    use crate::providers::provider_trait::{ApiCredentials, Provider};
    use crate::services::archive_service::download_image_to_disk;

    let total_pages = comic.page_count.unwrap_or(0);

    emit_db_stage(
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

    let mu_book_ext_id = format!("mu_{}", comic.id);
    let cleanup_mu_fallback = |repo: &crate::repositories::surreal_repo::SurrealRepo| {
        let eid = mu_book_ext_id.clone();
        let r = repo.clone();
        async move {
            if let Err(e) = r
                .delete_book_by_external(&eid, ProviderKind::MarvelUnlimited.id())
                .await
            {
                tracing::warn!("[mu_insert] Failed to delete MU fallback book entry: {}", e);
            } else {
                tracing::info!("[mu_insert] Deleted stale MU fallback book entry ({})", eid);
            }
        }
    };

    let rollback_series = |repo: &crate::repositories::surreal_repo::SurrealRepo,
                           series_id: String| {
        let r = repo.clone();
        async move {
            match r.count_books_with_real_path_in_series(&series_id).await {
                Ok(0) => {
                    if let Err(e) = r.delete_series(&series_id).await {
                        tracing::warn!("[mu_insert] Rollback delete_series failed: {}", e);
                    } else {
                        tracing::info!("[mu_insert] Rolled back orphaned series ({})", series_id);
                    }
                }
                Ok(n) => tracing::info!(
                    "[mu_insert] Skipping rollback — series has {} real books",
                    n
                ),
                Err(e) => tracing::warn!("[mu_insert] rollback count check failed: {}", e),
            }
        }
    };

    if !creds.marvel_public_key.is_empty() && !creds.marvel_private_key.is_empty() {
        emit_db_stage(
            &app,
            &comic.id,
            &comic.title,
            "Searching Marvel API for series…",
            total_pages,
        );
        let marvel = MarvelProvider;

        match marvel
            .insert_series_surreal(&repo, &series_title, &series_path, &creds)
            .await
        {
            Ok(series) if !series.external_id.starts_with("manual_") => {
                tracing::info!(
                    "[mu_insert] Marvel API – series '{}' upserted (id={:?})",
                    series.title,
                    series.id
                );
                let series_id_str = series.id.as_ref().map(|v| v.to_string());

                emit_db_stage(
                    &app,
                    &comic.id,
                    &comic.title,
                    "Searching Marvel API for issue…",
                    total_pages,
                );
                match marvel
                    .build_book_record(&comic.title, &saved_path, publish_year.as_deref(), &creds)
                    .await
                {
                    Ok(mut book) if !book.external_id.starts_with("manual_") => {
                        if let Some(url) = book.cover_url.clone() {
                            if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:")
                            {
                                let fname = format!("1_b_{}", book.external_id);
                                if let Ok(p) =
                                    download_image_to_disk(&url, &repo.covers_dir, &fname).await
                                {
                                    book.cover_url = Some(p);
                                }
                            }
                        }
                        book.series_id = series_id_str;
                        book.path = saved_path.clone();
                        emit_db_stage(
                            &app,
                            &comic.id,
                            &comic.title,
                            "Saving to library via Marvel API…",
                            total_pages,
                        );
                        match repo.upsert_book(book).await {
                            Ok(_) => {
                                tracing::info!("[mu_insert] Book inserted via Marvel API");
                                cleanup_mu_fallback(&repo).await;
                                return Ok(());
                            }
                            Err(e) => {
                                tracing::warn!("[mu_insert] Marvel upsert_book failed: {}", e);
                                if let Some(ref sid) = series.id {
                                    rollback_series(&repo, sid.to_string()).await;
                                }
                            }
                        }
                    }
                    Ok(_) => {
                        tracing::info!(
                            "[mu_insert] Marvel API returned no comic result, trying next source"
                        );
                        if let Some(ref sid) = series.id {
                            rollback_series(&repo, sid.to_string()).await;
                        }
                    }
                    Err(e) => {
                        tracing::warn!("[mu_insert] Marvel build_book_record failed: {}", e);
                        if let Some(ref sid) = series.id {
                            rollback_series(&repo, sid.to_string()).await;
                        }
                    }
                }
            }
            Ok(series) => {
                tracing::info!(
                    "[mu_insert] Marvel API returned no matching series result, trying next source"
                );
                if let Some(ref sid) = series.id {
                    rollback_series(&repo, sid.to_string()).await;
                }
            }
            Err(e) => tracing::warn!("[mu_insert] Marvel insert_series_surreal failed: {}", e),
        }
    }

    if !creds.metron_username.is_empty() && !creds.metron_password.is_empty() {
        emit_db_stage(
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
                tracing::info!(
                    "[mu_insert] Metron – series '{}' upserted (id={:?})",
                    series.title,
                    series.id
                );
                let series_id_str = series.id.as_ref().map(|v| v.to_string());

                emit_db_stage(
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
                        emit_db_stage(
                            &app,
                            &comic.id,
                            &comic.title,
                            "Saving to library via Metron…",
                            total_pages,
                        );
                        match repo.upsert_book(book).await {
                            Ok(_) => {
                                tracing::info!("[mu_insert] Book inserted via Metron");
                                cleanup_mu_fallback(&repo).await;
                                return Ok(());
                            }
                            Err(e) => {
                                tracing::warn!("[mu_insert] Metron upsert_book failed: {}", e);
                                if let Some(ref sid) = series.id {
                                    rollback_series(&repo, sid.to_string()).await;
                                }
                            }
                        }
                    }
                    Ok(_) => {
                        tracing::info!("[mu_insert] Metron returned no book result, falling back");
                        if let Some(ref sid) = series.id {
                            rollback_series(&repo, sid.to_string()).await;
                        }
                    }
                    Err(e) => {
                        tracing::warn!("[mu_insert] Metron build_book_record failed: {}", e);
                        if let Some(ref sid) = series.id {
                            rollback_series(&repo, sid.to_string()).await;
                        }
                    }
                }
            }
            Ok(series) => {
                tracing::info!(
                    "[mu_insert] Metron returned no matching series result, falling back to scraped data"
                );
                if let Some(ref sid) = series.id {
                    rollback_series(&repo, sid.to_string()).await;
                }
            }
            Err(e) => tracing::warn!("[mu_insert] Metron insert_series_surreal failed: {}", e),
        }
    }

    emit_db_stage(
        &app,
        &comic.id,
        &comic.title,
        "Saving to library (Marvel Unlimited data)…",
        total_pages,
    );
    tracing::info!("[mu_insert] Falling back to Marvel Unlimited scraped data");

    let series_external_id = comic
        .series_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("mu_{}", series_title.replace(' ', "_").to_ascii_lowercase()));

    let series_cover = {
        let url = &comic.cover_url;
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let fname = format!("5_s_{}", series_external_id.replace(':', "_"));
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
        provider_id: ProviderKind::MarvelUnlimited.id(),
        provider_name: "Marvel Unlimited".into(),
        title: series_title.clone(),
        path: series_path.clone(),
        cover_url: Some(series_cover.clone()),
        bg_url: Some(series_cover),
        ..Default::default()
    };

    let inserted_series = repo
        .upsert_series(series_record)
        .await
        .map_err(|e| format!("Failed to upsert MU series: {}", e))?;

    let series_id_str = inserted_series.id.as_ref().map(|v| v.to_string());

    let book_cover = {
        let url = &comic.cover_url;
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let fname = format!("5_b_{}", comic.id.replace(':', "_"));
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
    if let Some(ref upc) = comic.upc {
        extra.insert("upc".into(), serde_json::json!(upc));
    }
    if let Some(ref price) = comic.price {
        extra.insert("price".into(), serde_json::json!(price));
    }
    if let Some(ref rating) = comic.rating {
        extra.insert("rating".into(), serde_json::json!(rating));
    }
    if let Some(ref foc) = comic.foc_date {
        extra.insert("foc_date".into(), serde_json::json!(foc));
    }
    if let Some(ref date) = comic.publish_date {
        extra.insert("publish_date".into(), serde_json::json!(date));
    }

    let book_record = BookRecord {
        external_id: format!("mu_{}", comic.id),
        provider_id: ProviderKind::MarvelUnlimited.id(),
        provider_name: "Marvel Unlimited".into(),
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
        .map_err(|e| format!("Failed to upsert MU book: {}", e))?;

    tracing::info!("[mu_insert] Book inserted via Marvel Unlimited scraped fallback");
    Ok(())
}

use super::models::{MangaDexChapter, MangaDexDownloadProgress, MangaDexManga};
use crate::providers::ProviderKind;
use std::collections::HashMap;
use tauri::{Emitter, Manager};

fn emit_db_stage(
    app: &tauri::AppHandle,
    chapter_id: &str,
    chapter_title: &str,
    message: &str,
    total_pages: u32,
) {
    let _ = app.emit(
        "mangadex-download-progress",
        MangaDexDownloadProgress {
            chapter_id: chapter_id.to_string(),
            chapter_title: chapter_title.to_string(),
            current_page: total_pages,
            total_pages,
            status: "db_inserting".to_string(),
            error: None,
            message: Some(message.to_string()),
        },
    );
}

/// Insert a downloaded MangaDex chapter into the database.
#[tauri::command]
pub async fn insert_mangadex_book_to_db(
    app: tauri::AppHandle,
    manga: MangaDexManga,
    chapter: MangaDexChapter,
    saved_path: String,
) -> Result<(), String> {
    use crate::models::common::DisplayCreator;
    use crate::models::{BookRecord, SeriesRecord};

    tracing::info!(
        "Inserting MangaDex chapter '{}' of manga '{}' into DB",
        chapter.chapter,
        manga.title
    );

    let state = app.state::<crate::commands::state::AppState>();
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let global = state.global_vars.lock().await;
    let repo = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("DB not ready: {}", e))?;
    drop(global);

    emit_db_stage(
        &app,
        &chapter.id,
        &chapter.title,
        "Checking for existing series…",
        chapter.pages,
    );

    let provider_id: u8 = ProviderKind::MangaDex.id();
    let series_external_id = manga.id.clone();

    let existing_series = repo
        .get_series_by_external_id(&series_external_id, provider_id)
        .await
        .ok()
        .flatten();

    let series_db_id = if let Some(existing) = existing_series {
        let id_str = existing
            .id
            .as_ref()
            .map(|v| v.to_string())
            .unwrap_or_default();
        tracing::info!("Found existing series: {}", id_str);
        id_str
    } else {
        emit_db_stage(
            &app,
            &chapter.id,
            &chapter.title,
            "Creating series record…",
            chapter.pages,
        );

        let mut staff = Vec::new();
        if let Some(authors) = &manga.authors {
            for a in authors {
                staff.push(DisplayCreator {
                    name: a.clone(),
                    role: Some("Writer".into()),
                    image_url: None,
                });
            }
        }
        if let Some(artists) = &manga.artists {
            for a in artists {
                staff.push(DisplayCreator {
                    name: a.clone(),
                    role: Some("Artist".into()),
                    image_url: None,
                });
            }
        }

        let genres: Vec<String> = manga.tags.clone().unwrap_or_default();

        let status_str = match manga.status.as_deref() {
            Some("ongoing") => "RELEASING",
            Some("completed") => "FINISHED",
            Some("hiatus") => "HIATUS",
            Some("cancelled") => "CANCELLED",
            _ => "",
        };

        let mut extra = HashMap::new();
        if let Some(cr) = &manga.content_rating {
            extra.insert(
                "content_rating".into(),
                serde_json::Value::String(cr.clone()),
            );
        }
        if let Some(ol) = &manga.original_language {
            extra.insert(
                "original_language".into(),
                serde_json::Value::String(ol.clone()),
            );
        }
        if let Some(dt) = &manga.demographic_target {
            extra.insert("demographic".into(), serde_json::Value::String(dt.clone()));
        }
        if let Some(at) = &manga.alt_titles {
            extra.insert("alt_titles".into(), serde_json::json!(at));
        }
        if let Some(lc) = &manga.last_chapter {
            extra.insert("last_chapter".into(), serde_json::Value::String(lc.clone()));
        }
        if let Some(lv) = &manga.last_volume {
            extra.insert("last_volume".into(), serde_json::Value::String(lv.clone()));
        }

        let series_record = SeriesRecord {
            external_id: series_external_id,
            provider_id,
            provider_name: ProviderKind::MangaDex.name().to_string(),
            title: manga.title.clone(),
            path: String::new(),
            cover_url: Some(manga.cover_url.clone()),
            bg_url: Some(manga.cover_url.clone()),
            description: Some(manga.description.clone()),
            status: Some(status_str.to_string()),
            start_date: manga.year.map(|y| y.to_string()),
            end_date: None,
            score: 0,
            genres,
            volumes: None,
            chapters: None,
            characters: vec![],
            staff,
            note: None,
            favorite: false,
            lock: false,
            extra,
            ..Default::default()
        };

        let new_series = repo
            .create_series(series_record)
            .await
            .map_err(|e| format!("Failed to create series: {}", e))?;

        let id_str = new_series
            .id
            .as_ref()
            .map(|v| v.to_string())
            .unwrap_or_default();
        tracing::info!("Created new series with ID: {}", id_str);
        id_str
    };

    emit_db_stage(
        &app,
        &chapter.id,
        &chapter.title,
        "Inserting chapter into library…",
        chapter.pages,
    );

    let chapter_title = if chapter.title.is_empty() {
        format!("{} Ch.{}", manga.title, chapter.chapter)
    } else {
        format!("{} - {}", manga.title, chapter.title)
    };

    let mut book_creators = Vec::new();
    if let Some(authors) = &manga.authors {
        for a in authors {
            book_creators.push(DisplayCreator {
                name: a.clone(),
                role: Some("Writer".into()),
                image_url: None,
            });
        }
    }
    if let Some(artists) = &manga.artists {
        for a in artists {
            book_creators.push(DisplayCreator {
                name: a.clone(),
                role: Some("Artist".into()),
                image_url: None,
            });
        }
    }
    if let Some(group) = &chapter.scanlation_group {
        book_creators.push(DisplayCreator {
            name: group.clone(),
            role: Some("Scanlation".into()),
            image_url: None,
        });
    }

    let mut book_extra = HashMap::new();
    book_extra.insert(
        "volume".into(),
        serde_json::Value::String(chapter.volume.clone()),
    );
    book_extra.insert(
        "translated_language".into(),
        serde_json::Value::String(chapter.translated_language.clone()),
    );
    if let Some(sg) = &chapter.scanlation_group {
        book_extra.insert(
            "scanlation_group".into(),
            serde_json::Value::String(sg.clone()),
        );
    }
    if let Some(pa) = &chapter.publish_at {
        book_extra.insert("publish_at".into(), serde_json::Value::String(pa.clone()));
    }
    book_extra.insert(
        "mangadex_manga_id".into(),
        serde_json::Value::String(manga.id.clone()),
    );

    let book_record = BookRecord {
        external_id: chapter.id.clone(),
        provider_id,
        provider_name: ProviderKind::MangaDex.name().to_string(),
        title: chapter_title,
        path: saved_path,
        cover_url: Some(manga.cover_url.clone()),
        description: Some(manga.description.clone()),
        issue_number: Some(chapter.chapter.clone()),
        format: Some("Manga".into()),
        page_count: chapter.pages as i64,
        creators: book_creators,
        characters: vec![],
        series_id: Some(series_db_id),
        extra: book_extra,
        ..Default::default()
    };

    repo.create_book(book_record)
        .await
        .map_err(|e| format!("Failed to insert book: {}", e))?;

    emit_db_stage(&app, &chapter.id, &chapter.title, "Done!", chapter.pages);

    let _ = app.emit(
        "mangadex-download-progress",
        MangaDexDownloadProgress {
            chapter_id: chapter.id.clone(),
            chapter_title: chapter.title.clone(),
            current_page: chapter.pages,
            total_pages: chapter.pages,
            status: "completed".to_string(),
            error: None,
            message: None,
        },
    );

    tracing::info!("Successfully inserted MangaDex chapter into DB");
    Ok(())
}

use super::models::{GetComicsDetail, GetComicsDownloadProgress, GetComicsPost};
use crate::providers::ProviderKind;
use std::collections::HashMap;
use tauri::{Emitter, Manager};

fn emit_db_stage(
    app: &tauri::AppHandle,
    post_id: &str,
    post_title: &str,
    message: &str,
    total_bytes: u64,
) {
    let _ = app.emit(
        "getcomics-download-progress",
        GetComicsDownloadProgress {
            post_id: post_id.to_string(),
            post_title: post_title.to_string(),
            current_bytes: total_bytes,
            total_bytes,
            status: "db_inserting".to_string(),
            error: None,
            message: Some(message.to_string()),
        },
    );
}

/// Insert a downloaded GetComics comic into the database.
#[tauri::command]
pub async fn insert_getcomics_book_to_db(
    app: tauri::AppHandle,
    post: GetComicsPost,
    detail: Option<GetComicsDetail>,
    saved_path: String,
) -> Result<(), String> {
    use crate::models::BookRecord;

    tracing::info!("Inserting GetComics post '{}' into DB", post.title);

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
        &post.id,
        &post.title,
        "Inserting comic into library…",
        0,
    );

    let description = detail
        .as_ref()
        .map(|d| d.description.clone())
        .unwrap_or_else(|| post.description.clone());

    let format = detail.as_ref().and_then(|d| d.format.clone()).or_else(|| {
        let ext = saved_path.rsplit('.').next().unwrap_or("").to_lowercase();
        match ext.as_str() {
            "cbz" | "cbr" => Some("Comic".into()),
            "pdf" => Some("PDF".into()),
            "epub" => Some("EPUB".into()),
            _ => Some("Comic".into()),
        }
    });

    let mut extra = HashMap::new();
    extra.insert(
        "post_url".into(),
        serde_json::Value::String(post.post_url.clone()),
    );
    extra.insert(
        "category".into(),
        serde_json::Value::String(post.category.clone()),
    );
    if let Some(s) = &post.size {
        extra.insert("size".into(), serde_json::Value::String(s.clone()));
    }
    if let Some(d) = &post.date {
        extra.insert("date".into(), serde_json::Value::String(d.clone()));
    }
    if let Some(ref detail) = detail {
        if let Some(lang) = &detail.language {
            extra.insert("language".into(), serde_json::Value::String(lang.clone()));
        }
        if let Some(tags) = &detail.tags {
            extra.insert("tags".into(), serde_json::json!(tags));
        }
    }

    let book_record = BookRecord {
        external_id: post.id.clone(),
        provider_id: ProviderKind::GetComics.id(),
        provider_name: ProviderKind::GetComics.name().to_string(),
        title: post.title.clone(),
        path: saved_path,
        cover_url: Some(post.cover_url.clone()),
        description: Some(description),
        issue_number: None,
        format,
        page_count: 0,
        creators: vec![],
        characters: vec![],
        series_id: None,
        extra,
        ..Default::default()
    };

    repo.create_book(book_record)
        .await
        .map_err(|e| format!("Failed to insert book: {}", e))?;

    emit_db_stage(&app, &post.id, &post.title, "Done!", 0);

    let _ = app.emit(
        "getcomics-download-progress",
        GetComicsDownloadProgress {
            post_id: post.id.clone(),
            post_title: post.title.clone(),
            current_bytes: 0,
            total_bytes: 0,
            status: "completed".to_string(),
            error: None,
            message: None,
        },
    );

    tracing::info!("Successfully inserted GetComics post into DB");
    Ok(())
}

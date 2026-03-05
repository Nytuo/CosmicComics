// Collectionner-related Tauri commands — now using SurrealDB
use crate::commands::state::AppState;
use crate::providers::{ApiCredentials, ProviderKind};
use crate::services::collectionner_service;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::{fs, path::Path};
use tauri::State;
use tracing::{error, info};
async fn get_repo(
    state: &State<'_, AppState>,
) -> Result<crate::repositories::surreal_repo::SurrealRepo, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let global = state.global_vars.lock().await;
    global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("Error getting SurrealDB: {}", e))
}

async fn get_creds(state: &State<'_, AppState>) -> ApiCredentials {
    let creds_lock = state.creds.lock().await;
    ApiCredentials {
        marvel_public_key: creds_lock.marvel_public_key.clone(),
        marvel_private_key: creds_lock.marvel_private_key.clone(),
        google_books_api_key: creds_lock.google_books_api_key.clone(),
        open_library_api_key: creds_lock.open_library_api_key.clone(),
        metron_username: creds_lock.metron_username.clone(),
        metron_password: creds_lock.metron_password.clone(),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InsertBookPayload {
    pub path: String,
    pub realname: String,
}

#[tauri::command]
pub async fn fill_blank_images(state: State<'_, AppState>) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let covers_dir = repo.covers_dir.clone();
    let books = repo.get_all_books().await.map_err(|e| format!("{}", e))?;

    for book in &books {
        let cover = book.cover_url.as_deref().unwrap_or("");
        if !cover.is_empty() && (cover.starts_with('/') || cover.starts_with("data:")) {
            continue;
        }
        if !cover.is_empty() && (cover.starts_with("http://") || cover.starts_with("https://")) {
            let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();
            let filename = format!("fill_{}", id_str.replace(':', "_"));
            match crate::services::archive_service::download_image_to_disk(
                cover,
                &covers_dir,
                &filename,
            )
            .await
            {
                Ok(path) => {
                    let mut fields = HashMap::new();
                    fields.insert("cover_url".into(), Value::String(path));
                    let _ = repo.update_book_fields(&id_str, fields).await;
                }
                Err(e) => {
                    error!("Failed to download cover for {}: {}", id_str, e);
                }
            }
            continue;
        }
        if !book.path.is_empty() && Path::new(&book.path).exists() {
            let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();
            if let Ok(img_data) =
                crate::services::archive_service::extract_first_image_from_path(&book.path).await
            {
                let filename = format!("fill_{}", id_str.replace(':', "_"));
                if let Ok(path) = crate::services::archive_service::save_image_bytes_to_disk(
                    &img_data,
                    &covers_dir,
                    &filename,
                ) {
                    let mut fields = HashMap::new();
                    fields.insert("cover_url".into(), Value::String(path));
                    let _ = repo.update_book_fields(&id_str, fields).await;
                }
            }
        }
    }

    info!("Fill blank images completed successfully");
    Ok(())
}

#[tauri::command]
pub async fn insert_anilist_book(
    state: State<'_, AppState>,
    payload: InsertBookPayload,
) -> Result<(), String> {
    insert_book_by_provider_impl(&state, &payload.path, ProviderKind::Anilist).await
}

#[tauri::command]
pub async fn insert_marvel_book(state: State<'_, AppState>, comic_id: i64) -> Result<(), String> {
    insert_book_by_provider_impl(&state, &comic_id.to_string(), ProviderKind::Marvel).await
}

#[tauri::command]
pub async fn insert_googlebooks_book(
    state: State<'_, AppState>,
    book_id: String,
) -> Result<(), String> {
    insert_book_by_provider_impl(&state, &book_id, ProviderKind::GoogleBooks).await
}

#[tauri::command]
pub async fn insert_openlibrary_book(
    state: State<'_, AppState>,
    book_id: String,
) -> Result<(), String> {
    insert_book_by_provider_impl(&state, &book_id, ProviderKind::OpenLibrary).await
}

#[tauri::command]
pub async fn insert_book_by_provider(
    state: State<'_, AppState>,
    book_id: String,
    provider_id: u8,
) -> Result<(), String> {
    let kind = ProviderKind::from_id(provider_id)
        .ok_or_else(|| format!("Unknown provider ID: {}", provider_id))?;
    insert_book_by_provider_impl(&state, &book_id, kind).await
}

async fn insert_book_by_provider_impl(
    state: &State<'_, AppState>,
    book_id: &str,
    kind: ProviderKind,
) -> Result<(), String> {
    let repo = get_repo(state).await?;
    let creds = get_creds(state).await;

    let provider = crate::providers::get_provider_or_panic(kind);
    provider
        .insert_book_surreal(&repo, book_id, "", None, &creds)
        .await
        .map_err(|e| {
            error!("Error inserting {} book: {}", kind.name(), e);
            format!("Error inserting {} book: {}", kind.name(), e)
        })?;

    info!("{} book inserted successfully: {}", kind.name(), book_id);
    Ok(())
}

async fn download_cover_to_disk(record: &mut crate::models::book::BookRecord, covers_dir: &str) {
    if let Some(ref url) = record.cover_url {
        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
            let filename = format!("manual_b_{}", record.external_id);
            match crate::services::archive_service::download_image_to_disk(
                url, covers_dir, &filename,
            )
            .await
            {
                Ok(path) => {
                    info!("Downloaded cover to disk: {}", path);
                    record.cover_url = Some(path);
                }
                Err(e) => {
                    error!(
                        "Failed to download cover ({}): {}. Keeping original URL.",
                        url, e
                    );
                }
            }
        }
    }
}

#[tauri::command]
pub async fn refresh_metadata(state: State<'_, AppState>, book_id: String) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let book = repo
        .get_book_by_id(&book_id)
        .await
        .map_err(|e| format!("{}", e))?
        .ok_or("Book not found")?;

    let kind = ProviderKind::from_id(book.provider_id).ok_or("Unknown provider")?;

    let provider = crate::providers::get_provider_or_panic(kind);
    provider
        .refresh_book_meta_surreal(&repo, &book_id, &creds)
        .await
        .map_err(|e| format!("Error refreshing metadata: {}", e))?;

    info!("Refreshing metadata for book {}", book_id);
    Ok(())
}

#[tauri::command]
pub async fn get_folders_list(_state: State<'_, AppState>, path: String) -> Result<Value, String> {
    collectionner_service::get_list_of_folders(path)
        .await
        .map_err(|e| format!("Error getting folders list: {}", e))
}

#[tauri::command]
pub async fn get_files_and_folders_list(
    _state: State<'_, AppState>,
    path: String,
) -> Result<Value, String> {
    collectionner_service::get_list_of_files_and_folders(path)
        .await
        .map_err(|e| format!("Error getting files and folders list: {}", e))
}

#[tauri::command]
pub async fn download_book_from_url(
    state: State<'_, AppState>,
    url: String,
    name: Option<String>,
    vol: Option<String>,
) -> Result<String, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let book_name = name.unwrap_or_else(|| "downloaded_book".to_string());
    let issue_number = vol.unwrap_or_else(|| "1".to_string());

    let output_dir = format!("{}/downloads/{}/{}", base_path, book_name, issue_number);

    let progress_status = state.global_vars.clone();

    crate::services::archive_service::scrape_images_from_webpage(
        &url,
        &output_dir,
        &progress_status,
    )
    .await
    .map_err(|e| {
        error!("Error downloading book: {}", e);
        format!("Error downloading book: {}", e)
    })?;

    info!("Downloaded book from {} to {}", url, output_dir);

    let covers_dir = format!("{}/covers", base_path);
    let cover_path =
        match crate::services::archive_service::extract_first_image_from_path(&output_dir).await {
            Ok(bytes) => {
                let ts = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis();
                let filename = format!("dl_{}_{}", book_name.replace(' ', "_"), ts);
                match crate::services::archive_service::save_image_bytes_to_disk(
                    &bytes,
                    &covers_dir,
                    &filename,
                ) {
                    Ok(path) => {
                        info!("Saved cover to disk: {}", path);
                        Some(path)
                    }
                    Err(e) => {
                        error!("Failed to save cover to disk: {}", e);
                        None
                    }
                }
            }
            Err(e) => {
                error!("Failed to extract cover image: {}", e);
                None
            }
        };

    let page_count = fs::read_dir(&output_dir)
        .map(|entries| {
            entries
                .filter(|e| {
                    if let Ok(entry) = e {
                        let path = entry.path();
                        if let Some(ext) = path.extension() {
                            if let Some(ext_str) = ext.to_str() {
                                return matches!(
                                    ext_str.to_lowercase().as_str(),
                                    "jpg" | "jpeg" | "png" | "webp" | "gif"
                                );
                            }
                        }
                    }
                    false
                })
                .count()
        })
        .unwrap_or(0) as i64;

    let repo = get_repo(&state).await?;
    let title = format!("{} - {}", book_name, issue_number);

    let record = crate::models::book::BookRecord {
        title,
        path: output_dir.clone(),
        cover_url: cover_path,
        description: Some(format!("Downloaded from {}", url)),
        issue_number: Some(issue_number),
        page_count,
        provider_id: ProviderKind::Manual.id(),
        provider_name: ProviderKind::Manual.name().to_string(),
        external_id: format!(
            "dl_{}_{}",
            book_name.replace(' ', "_"),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        ),
        ..Default::default()
    };

    let book = repo
        .upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;
    let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();
    info!("Downloaded book inserted into DB: {}", id_str);

    Ok(output_dir)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DownloadedItem {
    pub book_name: String,
    pub issue_number: String,
    pub path: String,
    pub image_count: usize,
}

#[tauri::command]
pub async fn list_downloaded_items(
    state: State<'_, AppState>,
) -> Result<Vec<DownloadedItem>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let downloads_dir = format!("{}/downloads", base_path);

    if !Path::new(&downloads_dir).exists() {
        return Ok(Vec::new());
    }

    let mut items = Vec::new();

    if let Ok(book_entries) = fs::read_dir(&downloads_dir) {
        for book_entry in book_entries.flatten() {
            if book_entry.path().is_dir() {
                let book_name = book_entry.file_name().to_string_lossy().to_string();

                if let Ok(issue_entries) = fs::read_dir(book_entry.path()) {
                    for issue_entry in issue_entries.flatten() {
                        if issue_entry.path().is_dir() {
                            let issue_number =
                                issue_entry.file_name().to_string_lossy().to_string();
                            let path = issue_entry.path().to_string_lossy().to_string();

                            let image_count = fs::read_dir(&issue_entry.path())
                                .map(|entries| {
                                    entries
                                        .filter(|e| {
                                            if let Ok(entry) = e {
                                                let path = entry.path();
                                                if let Some(ext) = path.extension() {
                                                    if let Some(ext_str) = ext.to_str() {
                                                        return matches!(
                                                            ext_str.to_lowercase().as_str(),
                                                            "jpg" | "jpeg" | "png" | "webp" | "gif"
                                                        );
                                                    }
                                                }
                                            }
                                            false
                                        })
                                        .count()
                                })
                                .unwrap_or(0);

                            items.push(DownloadedItem {
                                book_name: book_name.clone(),
                                issue_number,
                                path,
                                image_count,
                            });
                        }
                    }
                }
            }
        }
    }

    items.sort_by(|a, b| {
        a.book_name.cmp(&b.book_name).then_with(|| {
            let a_num: Result<i32, _> = a.issue_number.parse();
            let b_num: Result<i32, _> = b.issue_number.parse();
            match (a_num, b_num) {
                (Ok(a), Ok(b)) => a.cmp(&b),
                _ => a.issue_number.cmp(&b.issue_number),
            }
        })
    });

    Ok(items)
}

/// Insert a book by searching the Marvel API with name + date + path.
#[tauri::command]
pub async fn insert_marvel_book_by_name(
    state: State<'_, AppState>,
    name: String,
    date: String,
    path: String,
) -> Result<Value, String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let provider = crate::providers::get_provider_or_panic(ProviderKind::Marvel);
    let mut record = provider
        .build_book_record(&name, &path, Some(&date), &creds)
        .await
        .map_err(|e| format!("Marvel build error: {}", e))?;

    download_cover_to_disk(&mut record, &repo.covers_dir).await;

    let book = repo
        .upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;
    let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();

    info!("Marvel book inserted: {} at {}", name, path);
    Ok(serde_json::json!({ "id": id_str }))
}

/// Insert a book by searching the Anilist API with realname + path.
#[tauri::command]
pub async fn insert_anilist_book_by_name(
    state: State<'_, AppState>,
    realname: String,
    path: String,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let provider = crate::providers::get_provider_or_panic(ProviderKind::Anilist);
    let mut record = provider
        .build_book_record(&realname, &path, None, &creds)
        .await
        .map_err(|e| format!("Anilist build error: {}", e))?;

    download_cover_to_disk(&mut record, &repo.covers_dir).await;

    repo.upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;

    info!("Anilist book inserted: {} at {}", realname, path);
    Ok(())
}

/// Insert a book by searching Google Books API with name + path.
#[tauri::command]
pub async fn insert_googlebooks_book_by_name(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Value, String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let provider = crate::providers::get_provider_or_panic(ProviderKind::GoogleBooks);
    let mut record = provider
        .build_book_record(&name, &path, None, &creds)
        .await
        .map_err(|e| format!("Google Books build error: {}", e))?;

    download_cover_to_disk(&mut record, &repo.covers_dir).await;

    let book = repo
        .upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;
    let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();

    info!("Google Books book inserted: {} at {}", name, path);
    Ok(serde_json::json!({ "id": id_str }))
}

/// Insert a book by searching OpenLibrary API with name + path.
#[tauri::command]
pub async fn insert_openlibrary_book_by_name(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Value, String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let provider = crate::providers::get_provider_or_panic(ProviderKind::OpenLibrary);
    let mut record = provider
        .build_book_record(&name, &path, None, &creds)
        .await
        .map_err(|e| format!("OpenLibrary build error: {}", e))?;

    download_cover_to_disk(&mut record, &repo.covers_dir).await;

    let book = repo
        .upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;
    let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();

    info!("OpenLibrary book inserted: {} at {}", name, path);
    Ok(serde_json::json!({ "id": id_str }))
}

/// Insert a book by searching Metron API with name + path.
#[tauri::command]
pub async fn insert_metron_book_by_name(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Value, String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let provider = crate::providers::get_provider_or_panic(ProviderKind::Metron);
    let mut record = provider
        .build_book_record(&name, &path, None, &creds)
        .await
        .map_err(|e| format!("Metron build error: {}", e))?;

    download_cover_to_disk(&mut record, &repo.covers_dir).await;

    let book = repo
        .upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;
    let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();

    info!("Metron book inserted: {} at {}", name, path);

    Ok(serde_json::json!({
        "id": id_str,
        "nom": book.title,
        "cover": book.cover_url.unwrap_or_default(),
        "description": book.description.unwrap_or_default(),
        "format": book.format.unwrap_or_else(|| "Comic".into()),
    }))
}

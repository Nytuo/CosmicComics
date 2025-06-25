// Database-related Tauri commands — now using SurrealDB
use crate::commands::state::AppState;
use crate::models::{build_field_schema, DisplayBook, DisplaySeries, FieldSchema, SeriesRecord};
use crate::providers::provider_trait::Provider;
use crate::providers::registry::get_provider;
use crate::providers::{ProviderKind, SearchCandidate};
use crate::repositories::surreal_repo::SurrealRepo;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use tracing::{debug, error, info};

async fn get_repo(state: &State<'_, AppState>) -> Result<SurrealRepo, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    debug!("[get_repo] base_path={}", base_path);

    let global = state.global_vars.lock().await;
    let result = global.get_surreal_db(&base_path).await.map_err(|e| {
        error!("[get_repo] Error getting SurrealDB: {}", e);
        format!("Error getting SurrealDB: {}", e)
    });
    debug!("[get_repo] get_surreal_db result ok={}", result.is_ok());
    result
}

/// Get all books as display-ready objects.
#[tauri::command]
pub async fn get_all_books(state: State<'_, AppState>) -> Result<Vec<DisplayBook>, String> {
    let repo = get_repo(&state).await?;
    repo.get_all_display_books().await.map_err(|e| {
        error!("Error getting all books: {}", e);
        format!("Error getting all books: {}", e)
    })
}

/// Get a single book by its SurrealDB ID.
#[tauri::command]
pub async fn get_book_by_id(
    state: State<'_, AppState>,
    book_id: String,
) -> Result<DisplayBook, String> {
    let repo = get_repo(&state).await?;
    let book = repo
        .get_book_by_id(&book_id)
        .await
        .map_err(|e| format!("Error getting book: {}", e))?
        .ok_or_else(|| "Book not found".to_string())?;
    Ok(DisplayBook::from(book))
}

/// Search books by title.
#[tauri::command]
pub async fn search_books(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<DisplayBook>, String> {
    let repo = get_repo(&state).await?;
    let books = repo.search_books(&query).await.map_err(|e| {
        error!("Error searching books: {}", e);
        format!("Error searching books: {}", e)
    })?;
    Ok(books.into_iter().map(DisplayBook::from).collect())
}

/// Get books in a series.
#[tauri::command]
pub async fn get_books_by_series(
    state: State<'_, AppState>,
    series_id: String,
) -> Result<Vec<DisplayBook>, String> {
    let repo = get_repo(&state).await?;
    let books = repo.get_books_by_series(&series_id).await.map_err(|e| {
        error!("Error getting books by series: {}", e);
        format!("Error getting books by series: {}", e)
    })?;

    if !books.is_empty() {
        return Ok(books.into_iter().map(DisplayBook::from).collect());
    }

    info!(
        "[get_books_by_series] No books found for series '{}', attempting folder scan",
        series_id
    );

    let series_lock = {
        let mut locks = state.scan_locks.lock().await;
        locks
            .entry(series_id.clone())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    };
    let _series_guard = series_lock.lock().await;

    let books = repo.get_books_by_series(&series_id).await.map_err(|e| {
        error!("Error re-checking books after acquiring scan lock: {}", e);
        format!("Error re-checking books after acquiring scan lock: {}", e)
    })?;

    if !books.is_empty() {
        info!(
            "[get_books_by_series] Books found after waiting for scan lock ({} books) – skipping duplicate scan",
            books.len()
        );
        return Ok(books.into_iter().map(DisplayBook::from).collect());
    }

    if let Ok(Some(series)) = repo.get_series_by_id(&series_id).await {
        if !series.path.is_empty() {
            info!("[get_books_by_series] Scanning folder: {}", series.path);
            scan_books_in_folder(&series.path, &series, &repo).await;

            let books = repo.get_books_by_series(&series_id).await.map_err(|e| {
                error!("Error getting books after scan: {}", e);
                format!("Error getting books after scan: {}", e)
            })?;
            info!(
                "[get_books_by_series] After scan: {} books found",
                books.len()
            );
            return Ok(books.into_iter().map(DisplayBook::from).collect());
        } else {
            info!("[get_books_by_series] Series has no path, cannot scan");
        }
    }

    Ok(Vec::new())
}

/// Get books by path (folder).
#[tauri::command]
pub async fn get_books_by_path(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<DisplayBook>, String> {
    debug!("[get_books_by_path] Querying for path: '{}'", path);
    let repo = get_repo(&state).await?;
    let books = repo.get_books_by_path(&path).await.map_err(|e| {
        error!("Error getting books by path: {}", e);
        format!("Error getting books by path: {}", e)
    })?;
    debug!("[get_books_by_path] Found {} books", books.len());
    Ok(books.into_iter().map(DisplayBook::from).collect())
}

/// Delete a book by ID.
#[tauri::command]
pub async fn delete_book(state: State<'_, AppState>, book_id: String) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    repo.delete_book(&book_id).await.map_err(|e| {
        error!("Error deleting book: {}", e);
        format!("Error deleting book: {}", e)
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateBookStatusPayload {
    pub set_to: String,
    pub title: String,
}

/// Update reading status for all books with a given title.
#[tauri::command]
pub async fn update_book_status_all(
    state: State<'_, AppState>,
    payload: UpdateBookStatusPayload,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let (read, reading, unread) = match payload.set_to.as_str() {
        "read" => (true, false, false),
        "reading" => (false, true, false),
        "unread" => (false, false, true),
        _ => return Err("Invalid status".to_string()),
    };

    let books = repo
        .search_books(&payload.title)
        .await
        .map_err(|e| format!("{}", e))?;
    for book in books {
        if book.title == payload.title {
            let id = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();
            repo.update_reading_status(&id, read, reading, unread)
                .await
                .map_err(|e| format!("{}", e))?;
        }
    }
    Ok(())
}

/// Update reading status for a single book by ID.
#[tauri::command]
pub async fn update_book_status_one(
    state: State<'_, AppState>,
    set_to: String,
    book_id: String,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let (read, reading, unread) = match set_to.as_str() {
        "read" => (true, false, false),
        "reading" => (false, true, false),
        "unread" => (false, false, true),
        _ => return Err("Invalid status".to_string()),
    };
    repo.update_reading_status(&book_id, read, reading, unread)
        .await
        .map_err(|e| format!("{}", e))
}

/// Update specific fields on a book or series.
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFieldsPayload {
    pub item_type: String,
    pub id: String,
    pub fields: HashMap<String, Value>,
}

#[tauri::command]
pub async fn update_fields(
    state: State<'_, AppState>,
    payload: UpdateFieldsPayload,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    match payload.item_type.as_str() {
        "book" => repo
            .update_book_fields(&payload.id, payload.fields)
            .await
            .map_err(|e| format!("{}", e)),
        "series" => repo
            .update_series_fields(&payload.id, payload.fields)
            .await
            .map_err(|e| format!("{}", e)),
        _ => Err("Invalid item_type, must be 'book' or 'series'".into()),
    }
}

/// Toggle favorite status for a book.
#[tauri::command]
pub async fn toggle_favorite(
    state: State<'_, AppState>,
    item_type: String,
    id: String,
) -> Result<bool, String> {
    let repo = get_repo(&state).await?;
    match item_type.as_str() {
        "book" => {
            let book = repo
                .get_book_by_id(&id)
                .await
                .map_err(|e| format!("{}", e))?
                .ok_or("Book not found")?;
            let new_fav = !book.favorite;
            let mut fields = HashMap::new();
            fields.insert("favorite".into(), Value::Bool(new_fav));
            repo.update_book_fields(&id, fields)
                .await
                .map_err(|e| format!("{}", e))?;
            Ok(new_fav)
        }
        "series" => {
            let series = repo
                .get_series_by_id(&id)
                .await
                .map_err(|e| format!("{}", e))?
                .ok_or("Series not found")?;
            let new_fav = !series.favorite;
            let mut fields = HashMap::new();
            fields.insert("favorite".into(), Value::Bool(new_fav));
            repo.update_series_fields(&id, fields)
                .await
                .map_err(|e| format!("{}", e))?;
            Ok(new_fav)
        }
        _ => Err("Invalid item_type".into()),
    }
}

/// Update the user rating (note) for a book or series.
#[tauri::command]
pub async fn update_rating(
    state: State<'_, AppState>,
    item_type: String,
    id: String,
    rating: i64,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let mut fields = HashMap::new();
    fields.insert("note".into(), Value::Number(rating.into()));
    match item_type.as_str() {
        "book" => repo
            .update_book_fields(&id, fields)
            .await
            .map_err(|e| format!("{}", e)),
        "series" => repo
            .update_series_fields(&id, fields)
            .await
            .map_err(|e| format!("{}", e)),
        _ => Err("Invalid item_type".into()),
    }
}

/// Get all series as display-ready objects (with computed read counts).
#[tauri::command]
pub async fn get_all_series(state: State<'_, AppState>) -> Result<Vec<DisplaySeries>, String> {
    let repo = get_repo(&state).await?;
    repo.get_all_display_series().await.map_err(|e| {
        error!("Error getting all series: {}", e);
        format!("Error getting all series: {}", e)
    })
}

/// Get a single series by ID.
#[tauri::command]
pub async fn get_series_by_id(
    state: State<'_, AppState>,
    series_id: String,
) -> Result<DisplaySeries, String> {
    let repo = get_repo(&state).await?;
    let series = repo
        .get_series_by_id(&series_id)
        .await
        .map_err(|e| format!("Error getting series: {}", e))?
        .ok_or_else(|| "Series not found".to_string())?;

    let id_str = series
        .id
        .as_ref()
        .map(|v| v.to_string())
        .unwrap_or_default();
    let book_count = repo.count_books_in_series(&id_str).await.unwrap_or(0);
    let read_count = repo.count_read_books_in_series(&id_str).await.unwrap_or(0);
    Ok(series.into_display(book_count, read_count))
}

/// Delete a series (and all its books) by ID.
#[tauri::command]
pub async fn delete_series(state: State<'_, AppState>, series_id: String) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    repo.delete_series(&series_id).await.map_err(|e| {
        error!("Error deleting series: {}", e);
        format!("Error deleting series: {}", e)
    })
}

/// Create a new scan path.
#[tauri::command]
pub async fn create_scan_path(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<(), String> {
    info!(
        "[create_scan_path] called with name='{}', path='{}'",
        name, path
    );
    let repo = get_repo(&state).await?;
    info!("[create_scan_path] got repo, calling repo.create_scan_path");
    let result = repo.create_scan_path(&name, &path).await.map_err(|e| {
        error!("[create_scan_path] repo.create_scan_path FAILED: {}", e);
        format!("{}", e)
    });
    info!("[create_scan_path] result ok={}", result.is_ok());

    match repo.get_all_scan_paths().await {
        Ok(paths) => info!(
            "[create_scan_path] verify: scan_path count={}, data={:?}",
            paths.len(),
            paths
        ),
        Err(e) => error!(
            "[create_scan_path] verify: failed to read back scan_paths: {}",
            e
        ),
    }

    result
}

/// Get all scan paths.
#[tauri::command]
pub async fn get_all_scan_paths(state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    info!("[get_all_scan_paths] called");
    let repo = get_repo(&state).await?;
    let paths = repo.get_all_scan_paths().await.map_err(|e| {
        error!("[get_all_scan_paths] FAILED: {}", e);
        format!("{}", e)
    })?;
    info!(
        "[get_all_scan_paths] got {} scan paths: {:?}",
        paths.len(),
        paths
    );
    Ok(paths
        .into_iter()
        .map(|p| serde_json::to_value(p).unwrap_or(Value::Null))
        .collect())
}

/// Delete a scan path.
#[tauri::command]
pub async fn delete_scan_path(
    state: State<'_, AppState>,
    scan_path_id: String,
) -> Result<(), String> {
    debug!(
        "[delete_scan_path] received scan_path_id: '{}'",
        scan_path_id
    );
    let repo = get_repo(&state).await?;
    repo.delete_scan_path(&scan_path_id).await.map_err(|e| {
        error!("[delete_scan_path] Error: {}", e);
        format!("{}", e)
    })?;
    debug!("[delete_scan_path] Successfully deleted scan path");
    Ok(())
}

/// Update an existing scan path (name and/or path).
#[tauri::command]
pub async fn update_scan_path(
    state: State<'_, AppState>,
    scan_path_id: String,
    name: String,
    path: String,
) -> Result<(), String> {
    info!(
        "[update_scan_path] id='{}', name='{}', path='{}'",
        scan_path_id, name, path
    );
    let repo = get_repo(&state).await?;
    repo.update_scan_path(&scan_path_id, &name, &path)
        .await
        .map_err(|e| {
            error!("[update_scan_path] Error: {}", e);
            format!("{}", e)
        })?;
    info!("[update_scan_path] Successfully updated scan path");
    Ok(())
}

/// Create a new manual book from form fields.
#[tauri::command]
pub async fn create_manual_book(
    state: State<'_, AppState>,
    fields: HashMap<String, Value>,
) -> Result<DisplayBook, String> {
    use crate::models::book::BookRecord;

    let repo = get_repo(&state).await?;
    let mut book = BookRecord::default();
    book.provider_id = ProviderKind::Manual.id();
    book.provider_name = ProviderKind::Manual.name().to_string();
    book.external_id = format!("manual_{}", chrono::Utc::now().timestamp_millis());

    if let Some(Value::String(v)) = fields.get("title") {
        book.title = v.clone();
    }
    if let Some(Value::String(v)) = fields.get("path") {
        book.path = v.clone();
    }
    if let Some(Value::String(v)) = fields.get("cover_url") {
        book.cover_url = Some(v.clone());
    }
    if let Some(Value::String(v)) = fields.get("description") {
        book.description = Some(v.clone());
    }
    if let Some(Value::String(v)) = fields.get("issue_number") {
        book.issue_number = Some(v.clone());
    }
    if let Some(Value::String(v)) = fields.get("format") {
        book.format = Some(v.clone());
    }
    if let Some(Value::Number(v)) = fields.get("page_count") {
        book.page_count = v.as_i64().unwrap_or(0);
    }

    let known_keys = [
        "title",
        "path",
        "cover_url",
        "description",
        "issue_number",
        "format",
        "page_count",
    ];
    for (k, v) in &fields {
        if !known_keys.contains(&k.as_str()) {
            book.extra.insert(k.clone(), v.clone());
        }
    }

    let created = repo.create_book(book).await.map_err(|e| {
        error!("Error creating manual book: {}", e);
        format!("Error creating manual book: {}", e)
    })?;

    info!("Manual book created: {:?}", created.id);
    Ok(DisplayBook::from(created))
}

/// Create a new manual series from form fields.
#[tauri::command]
pub async fn create_manual_series(
    state: State<'_, AppState>,
    fields: HashMap<String, Value>,
) -> Result<DisplaySeries, String> {
    let repo = get_repo(&state).await?;
    let mut series = SeriesRecord::default();
    series.provider_id = ProviderKind::Manual.id();
    series.provider_name = ProviderKind::Manual.name().to_string();
    series.external_id = format!("manual_{}", chrono::Utc::now().timestamp_millis());

    if let Some(Value::String(v)) = fields.get("title") {
        series.title = v.clone();
    }
    if let Some(Value::String(v)) = fields.get("path") {
        series.path = v.clone();
    }
    if let Some(Value::String(v)) = fields.get("cover_url") {
        series.cover_url = Some(v.clone());
    }
    if let Some(Value::String(v)) = fields.get("description") {
        series.description = Some(v.clone());
    }
    if let Some(Value::String(v)) = fields.get("status") {
        series.status = Some(v.clone());
    }

    let known_keys = ["title", "path", "cover_url", "description", "status"];
    for (k, v) in &fields {
        if !known_keys.contains(&k.as_str()) {
            series.extra.insert(k.clone(), v.clone());
        }
    }

    let created = repo.create_series(series).await.map_err(|e| {
        error!("Error creating manual series: {}", e);
        format!("Error creating manual series: {}", e)
    })?;

    let id_str = created
        .id
        .as_ref()
        .map(|v| v.to_string())
        .unwrap_or_default();
    info!("Manual series created: {}", id_str);
    Ok(created.into_display(0, 0))
}

#[tauri::command]
pub async fn insert_new_book_by_provider(
    state: State<'_, AppState>,
    external_id: String,
    provider_id: u8,
) -> Result<DisplayBook, String> {
    let repo = get_repo(&state).await?;
    let creds_lock = state.creds.lock().await;
    let creds = crate::providers::ApiCredentials {
        marvel_public_key: creds_lock.marvel_public_key.clone(),
        marvel_private_key: creds_lock.marvel_private_key.clone(),
        google_books_api_key: creds_lock.google_books_api_key.clone(),
        open_library_api_key: creds_lock.open_library_api_key.clone(),
        metron_username: creds_lock.metron_username.clone(),
        metron_password: creds_lock.metron_password.clone(),
    };
    drop(creds_lock);

    let kind = ProviderKind::from_id(provider_id)
        .ok_or_else(|| format!("Unknown provider ID: {}", provider_id))?;

    let provider_impl = crate::providers::get_provider_or_panic(kind);

    provider_impl
        .insert_book_surreal(&repo, &external_id, "", None, &creds)
        .await
        .map_err(|e| {
            error!("Error inserting book via provider {}: {}", kind.name(), e);
            format!("Error inserting book via provider {}: {}", kind.name(), e)
        })?;

    let books = repo.get_all_books().await.map_err(|e| format!("{}", e))?;
    let created = books
        .into_iter()
        .find(|b| b.external_id == external_id && b.provider_id == provider_id)
        .ok_or_else(|| "Book was inserted but could not be retrieved".to_string())?;

    info!(
        "Book inserted via provider {}: {:?}",
        kind.name(),
        created.id
    );
    Ok(DisplayBook::from(created))
}

#[tauri::command]
pub async fn get_bookmarks(
    state: State<'_, AppState>,
    book_id: Option<String>,
) -> Result<Vec<Value>, String> {
    let repo = get_repo(&state).await?;
    let bms = if let Some(ref id) = book_id {
        repo.get_bookmarks_by_book(id)
            .await
            .map_err(|e| format!("{}", e))?
    } else {
        repo.get_all_bookmarks()
            .await
            .map_err(|e| format!("{}", e))?
    };
    Ok(bms
        .into_iter()
        .map(|b| serde_json::to_value(b).unwrap_or(Value::Null))
        .collect())
}

#[tauri::command]
pub async fn create_bookmark(
    state: State<'_, AppState>,
    book_id: String,
    page: i64,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    let book = repo
        .get_book_by_id(&book_id)
        .await
        .map_err(|e| format!("Error fetching book: {}", e))?
        .ok_or_else(|| format!("Book not found: {}", book_id))?;
    repo.create_bookmark(&book_id, &book.path, page)
        .await
        .map_err(|e| format!("{}", e))
}

#[tauri::command]
pub async fn delete_bookmark(
    state: State<'_, AppState>,
    bookmark_id: String,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
    repo.delete_bookmark(&bookmark_id)
        .await
        .map_err(|e| format!("{}", e))
}

#[tauri::command]
pub async fn get_field_schema(provider_id: u8, item_type: String) -> Result<FieldSchema, String> {
    let kind = ProviderKind::from_id(provider_id).unwrap_or(ProviderKind::Manual);
    let provider_name = kind.name().to_string();
    Ok(build_field_schema(kind, &provider_name, &item_type))
}

fn calculate_series_match_score(search_name: &str, candidate_title: &str) -> f64 {
    let search_lower = search_name.to_lowercase();
    let candidate_lower = candidate_title.to_lowercase();

    if search_lower == candidate_lower {
        return 1.0;
    }

    if candidate_lower.contains(&search_lower) {
        let length_ratio = search_lower.len() as f64 / candidate_lower.len() as f64;
        return 0.8 * length_ratio.max(0.5);
    }

    if search_lower.contains(&candidate_lower) {
        return 0.7;
    }

    let search_words: Vec<&str> = search_lower.split_whitespace().collect();
    let candidate_words: Vec<&str> = candidate_lower.split_whitespace().collect();

    if search_words.is_empty() || candidate_words.is_empty() {
        return 0.0;
    }

    let mut matching_words = 0;
    for search_word in &search_words {
        if candidate_words
            .iter()
            .any(|cw| cw.contains(search_word) || search_word.contains(cw))
        {
            matching_words += 1;
        }
    }

    let overlap_score = matching_words as f64 / search_words.len() as f64;
    overlap_score * 0.6
}

async fn scan_books_in_folder(folder_path: &str, series: &SeriesRecord, repo: &SurrealRepo) {
    use crate::models::book::BookRecord;
    use crate::utils::VALID_BOOK_EXTENSION;

    let entries = match std::fs::read_dir(folder_path) {
        Ok(e) => e,
        Err(e) => {
            error!(
                "[scan_books_in_folder] Failed to read directory {}: {}",
                folder_path, e
            );
            return;
        }
    };

    let series_id = match &series.id {
        Some(id) => id.clone(),
        None => {
            error!("[scan_books_in_folder] Series has no ID: {}", series.title);
            return;
        }
    };

    let mut books_created = 0;
    for entry in entries.flatten() {
        let entry_path = entry.path();

        let is_dir = entry_path.is_dir();
        let is_file = entry_path.is_file();

        if !is_file && !is_dir {
            continue;
        }

        let file_path = entry_path.to_string_lossy().to_string();
        let file_name = entry_path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let is_valid_book = if is_file {
            let extension = match entry_path.extension().and_then(|e| e.to_str()) {
                Some(ext) => ext.to_lowercase(),
                None => {
                    continue;
                }
            };

            VALID_BOOK_EXTENSION
                .iter()
                .any(|valid| valid.eq_ignore_ascii_case(&extension))
        } else if is_dir {
            use crate::utils::VALID_IMAGE_EXTENSION;
            let has_images = match std::fs::read_dir(&entry_path) {
                Ok(dir_entries) => dir_entries
                    .flatten()
                    .filter(|e| e.path().is_file())
                    .any(|e| {
                        e.path()
                            .extension()
                            .and_then(|ext| ext.to_str())
                            .map(|ext| {
                                VALID_IMAGE_EXTENSION
                                    .iter()
                                    .any(|v| v.eq_ignore_ascii_case(ext))
                            })
                            .unwrap_or(false)
                    }),
                Err(_) => false,
            };

            if has_images {
                debug!(
                    "[scan_books_in_folder] Found folder-based book: {}",
                    file_name
                );
            } else {
                debug!(
                    "[scan_books_in_folder] Skipping folder (no images): {}",
                    file_name
                );
            }

            has_images
        } else {
            false
        };

        if !is_valid_book {
            continue;
        }

        let issue_number = extract_issue_number(&file_name);

        match repo.get_books_by_path(&file_path).await {
            Ok(existing) if !existing.is_empty() => {
                debug!(
                    "[scan_books_in_folder] Book already exists at path: {}",
                    file_path
                );
                continue;
            }
            _ => {}
        }

        let book = BookRecord {
            id: None,
            external_id: format!("manual_book_{}", rand::random::<u32>()),
            provider_id: series.provider_id,
            provider_name: series.provider_name.clone(),
            series_id: Some(series_id.to_string()),
            title: file_name.clone(),
            issue_number: issue_number.map(|n| n.to_string()),
            path: file_path,
            characters: Vec::new(),
            creators: Vec::new(),
            ..Default::default()
        };

        match repo.create_book(book).await {
            Ok(_) => {
                books_created += 1;
                debug!("[scan_books_in_folder] Created book: {}", file_name);
            }
            Err(e) => {
                error!(
                    "[scan_books_in_folder] Failed to create book {}: {}",
                    file_name, e
                );
            }
        }
    }

    info!(
        "[scan_books_in_folder] Created {} books for series: {}",
        books_created, series.title
    );
}

fn extract_issue_number(filename: &str) -> Option<i32> {
    use regex::Regex;

    let patterns = [
        r"#(\d+)",        // Spider-Man #23
        r"\s(\d+)\.",     // Spider-Man 23.cbz
        r"\s(\d+)\s",     // Spider-Man 23 (something)
        r"v\d+\s#?(\d+)", // Spider-Man v2 #23
        r"-(\d+)\.",      // Spider-Man-23.cbz
    ];

    for pattern in &patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(caps) = re.captures(filename) {
                if let Some(num_str) = caps.get(1) {
                    if let Ok(num) = num_str.as_str().parse::<i32>() {
                        return Some(num);
                    }
                }
            }
        }
    }

    None
}

/// Scan all library paths and match books to series.
#[tauri::command]
pub async fn scan_all_libraries(
    state: State<'_, AppState>,
    _app: tauri::AppHandle,
) -> Result<Value, String> {
    let config = state.config.lock().await;
    let creds = state.creds.lock().await;
    let _base_path = config.base_path.clone();
    let marvel_pub = creds.marvel_public_key.clone();
    let marvel_priv = creds.marvel_private_key.clone();
    let google_key = creds.google_books_api_key.clone();
    let metron_user = creds.metron_username.clone();
    let metron_pass = creds.metron_password.clone();
    drop(config);
    drop(creds);

    let repo = get_repo(&state).await?;

    let scan_paths = repo
        .get_all_scan_paths()
        .await
        .map_err(|e| format!("{}", e))?;

    let creds = crate::providers::ApiCredentials {
        marvel_public_key: marvel_pub,
        marvel_private_key: marvel_priv,
        google_books_api_key: google_key,
        open_library_api_key: String::new(),
        metron_username: metron_user,
        metron_password: metron_pass,
    };

    let mut added_count = 0i64;

    for sp in &scan_paths {
        let path = sp.path.as_str();
        if path.is_empty() {
            continue;
        }

        let entries = match std::fs::read_dir(path) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let entry_path = entry.path();
            if !entry_path.is_dir() {
                continue;
            }
            let folder_name = entry_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let folder_path = entry_path.to_string_lossy().to_string();

            if let Ok(Some(_)) = repo.get_series_by_path(&folder_path).await {
                continue;
            }

            let searchable = crate::providers::searchable_series_providers();
            let mut best: Option<(std::sync::Arc<dyn Provider>, SearchCandidate)> = None;
            let mut all_candidates = Vec::new();

            debug!("[scan] Searching providers for folder: {}", folder_name);
            for provider in searchable {
                if let Ok(mut candidates) = provider.search_series(&folder_name, None, &creds).await
                {
                    debug!(
                        "[scan]   {} returned {} candidates",
                        provider.kind().name(),
                        candidates.len()
                    );
                    for candidate in &mut candidates {
                        candidate.confidence_score =
                            calculate_series_match_score(&folder_name, &candidate.title);
                        debug!(
                            "[scan]     '{}' score: {:.3}",
                            candidate.title, candidate.confidence_score
                        );
                    }
                    all_candidates.append(&mut candidates);
                }
            }

            if !all_candidates.is_empty() {
                all_candidates
                    .sort_by(|a, b| b.confidence_score.partial_cmp(&a.confidence_score).unwrap());
                let top = &all_candidates[0];
                if top.confidence_score > 0.3 {
                    debug!(
                        "[scan] MATCH: '{}' from {} (score: {:.3})",
                        top.title,
                        top.provider_id.name(),
                        top.confidence_score
                    );
                    if let Some(provider) = get_provider(top.provider_id) {
                        best = Some((provider, top.clone()));
                    }
                } else {
                    debug!(
                        "[scan] NO MATCH: Best score {:.3} < threshold 0.3",
                        top.confidence_score
                    );
                }
            }

            if let Some((provider, candidate)) = best {
                debug!(
                    "[scan] Building series from external_id: {} (provider: {})",
                    candidate.external_id,
                    provider.kind().name()
                );
                match provider
                    .build_series_record_from_id(&candidate.external_id, &folder_path, &creds)
                    .await
                {
                    Ok(mut record) => {
                        record.path = folder_path;
                        if let Err(e) = repo.upsert_series(record).await {
                            error!("Failed to insert series {}: {}", folder_name, e);
                        } else {
                            added_count += 1;
                        }
                    }
                    Err(e) => error!("Failed to build series record {}: {}", folder_name, e),
                }
            } else {
                let record = SeriesRecord {
                    external_id: format!("manual_{}", rand::random::<u32>()),
                    provider_id: 0,
                    provider_name: "Manual".into(),
                    title: folder_name.clone(),
                    path: folder_path,
                    ..Default::default()
                };
                if let Err(e) = repo.create_series(record).await {
                    error!("Failed to insert manual series {}: {}", folder_name, e);
                } else {
                    added_count += 1;
                }
            }
        }
    }

    Ok(serde_json::json!({
        "added_count": added_count,
        "scan_paths_count": scan_paths.len(),
    }))
}

/// Export the entire database as JSON for backup.
#[tauri::command]
pub async fn export_database(state: State<'_, AppState>) -> Result<Value, String> {
    let repo = get_repo(&state).await?;
    repo.export_all().await.map_err(|e| format!("{}", e))
}

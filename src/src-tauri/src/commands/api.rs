// API-related Tauri commands (external APIs like Marvel, Google Books, etc.)
use crate::commands::state::AppState;
use crate::providers::{ApiCredentials, ProviderKind};
use crate::services::{
    anilist_service, googlebooks_service, marvel_service, metron_service, openlibrary_service,
};
use serde_json::Value;
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

#[tauri::command]
pub async fn search_anilist(_state: State<'_, AppState>, query: String) -> Result<Value, String> {
    anilist_service::search_anilist_manga(&query)
        .await
        .map(|opt| {
            opt.map(|v| Value::Object(v.into_iter().collect()))
                .unwrap_or(Value::Null)
        })
        .map_err(|e| {
            error!("Error searching AniList: {}", e);
            format!("Error searching AniList: {}", e)
        })
}

#[tauri::command]
pub async fn marvel_search_only(
    state: State<'_, AppState>,
    name: String,
    date: Option<String>,
) -> Result<Value, String> {
    let creds = state.creds.lock().await;
    let public_key = creds.marvel_public_key.clone();
    let private_key = creds.marvel_private_key.clone();
    drop(creds);

    marvel_service::get_marvel_api_search(&name, date, &private_key, &public_key)
        .await
        .map_err(|e| {
            error!("Error in Marvel search_only: {}", e);
            format!("Error in Marvel search_only: {}", e)
        })
}

#[tauri::command]
pub async fn marvel_get_comics(
    state: State<'_, AppState>,
    name: String,
    date: String,
) -> Result<Value, String> {
    let creds = state.creds.lock().await;
    let public_key = creds.marvel_public_key.clone();
    let private_key = creds.marvel_private_key.clone();
    drop(creds);

    marvel_service::get_marvel_api_comics(&name, &date, &private_key, &public_key)
        .await
        .map_err(|e| {
            error!("Error in Marvel get_comics: {}", e);
            format!("Error in Marvel get_comics: {}", e)
        })
}

#[tauri::command]
pub async fn add_series_by_provider(
    state: State<'_, AppState>,
    name: String,
    path: String,
    provider_id: u8,
) -> Result<(), String> {
    let kind = ProviderKind::from_id(provider_id)
        .ok_or_else(|| format!("Unknown provider ID: {}", provider_id))?;

    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let provider = crate::providers::get_provider_or_panic(kind);
    provider
        .insert_series_surreal(&repo, &name, &path, &creds)
        .await
        .map_err(|e| {
            error!("Error adding {} series: {}", kind.name(), e);
            format!("Error adding {} series: {}", kind.name(), e)
        })?;

    info!("{} series '{}' added successfully", kind.name(), name);
    Ok(())
}

#[tauri::command]
pub async fn anilist_search_only(
    _state: State<'_, AppState>,
    name: String,
) -> Result<Value, String> {
    anilist_service::api_anilist_get_search(&name)
        .await
        .map(|opt| {
            opt.map(|v| Value::Object(v.into_iter().collect()))
                .unwrap_or(Value::Null)
        })
        .map_err(|e| {
            error!("Error in Anilist search: {}", e);
            format!("Error in Anilist search: {}", e)
        })
}

#[tauri::command]
pub async fn googlebooks_get_comics(
    state: State<'_, AppState>,
    name: String,
) -> Result<Value, String> {
    let creds = state.creds.lock().await;
    let api_key = creds.google_books_api_key.clone();
    drop(creds);

    googlebooks_service::search_gbapi_comics_by_name(&name, api_key)
        .await
        .map_err(|e| {
            error!("Error in Google Books get_comics: {}", e);
            format!("Error in Google Books get_comics: {}", e)
        })
}

#[tauri::command]
pub async fn openlibrary_get_comics(
    _state: State<'_, AppState>,
    name: String,
) -> Result<Value, String> {
    openlibrary_service::get_olapi_search(&name)
        .await
        .map(|results| serde_json::to_value(results).unwrap_or(Value::Null))
        .map_err(|e| {
            error!("Error in OpenLibrary get_comics: {}", e);
            format!("Error in OpenLibrary get_comics: {}", e)
        })
}

#[tauri::command]
pub async fn metron_search_issues(
    state: State<'_, AppState>,
    name: String,
) -> Result<Value, String> {
    let creds_lock = state.creds.lock().await;
    let metron_creds = metron_service::MetronCredentials {
        username: creds_lock.metron_username.clone(),
        password: creds_lock.metron_password.clone(),
    };
    drop(creds_lock);

    metron_service::search_issues(&name, &metron_creds)
        .await
        .map(|results| serde_json::to_value(results).unwrap_or(Value::Null))
        .map_err(|e| {
            error!("Error in Metron search issues: {}", e);
            format!("Error in Metron search issues: {}", e)
        })
}

#[tauri::command]
pub async fn metron_search_series(
    state: State<'_, AppState>,
    name: String,
) -> Result<Value, String> {
    let creds_lock = state.creds.lock().await;
    let metron_creds = metron_service::MetronCredentials {
        username: creds_lock.metron_username.clone(),
        password: creds_lock.metron_password.clone(),
    };
    drop(creds_lock);

    metron_service::search_series(&name, &metron_creds)
        .await
        .map(|results| serde_json::to_value(results).unwrap_or(Value::Null))
        .map_err(|e| {
            error!("Error in Metron search series: {}", e);
            format!("Error in Metron search series: {}", e)
        })
}

#[tauri::command]
pub async fn metron_get_comics(
    state: State<'_, AppState>,
    name: String,
    year: Option<String>,
) -> Result<Value, String> {
    let creds_lock = state.creds.lock().await;
    let metron_creds = metron_service::MetronCredentials {
        username: creds_lock.metron_username.clone(),
        password: creds_lock.metron_password.clone(),
    };
    drop(creds_lock);

    metron_service::search_issues_by_series_and_year(&name, year.as_deref(), &metron_creds)
        .await
        .map_err(|e| {
            error!("Error in Metron get_comics: {}", e);
            format!("Error in Metron get_comics: {}", e)
        })
}

#[tauri::command]
pub async fn metron_link_placeholder_to_path(
    state: State<'_, AppState>,
    series_metron_id: i64,
    issue_number: String,
    file_path: String,
) -> Result<Option<Value>, String> {
    let repo = get_repo(&state).await?;
    let creds = get_creds(&state).await;

    let normalized = issue_number.trim_start_matches('0');
    let normalized = if normalized.is_empty() {
        "0"
    } else {
        normalized
    };

    let query = "SELECT * FROM book WHERE provider_id = 6 \
                 AND (issue_number = $inum OR issue_number = $inum_raw) \
                 AND (path = '' OR path = NONE) \
                 AND extra.series_metron_id = $series_id \
                 LIMIT 1";

    let results: Vec<crate::models::BookRecord> = repo
        .raw_query_typed(
            query,
            vec![
                ("inum", Value::String(normalized.into())),
                ("inum_raw", Value::String(issue_number.clone())),
                ("series_id", Value::Number(series_metron_id.into())),
            ],
        )
        .await
        .unwrap_or_default();

    if let Some(book) = results.into_iter().next() {
        let id_str = book.id.as_ref().map(|v| v.to_string()).unwrap_or_default();

        let mut fields = std::collections::HashMap::new();
        fields.insert("path".into(), Value::String(file_path.clone()));
        repo.update_book_fields(&id_str, fields)
            .await
            .map_err(|e| format!("{}", e))?;

        info!(
            "Linked Metron placeholder {} (issue {}) to {}",
            id_str, normalized, file_path
        );

        let display = crate::models::DisplayBook::from(book);
        return Ok(Some(serde_json::to_value(display).unwrap_or(Value::Null)));
    }

    info!(
        "No Metron placeholder found for series {} issue {} — fetching from API",
        series_metron_id, normalized
    );

    let metron_creds = metron_service::MetronCredentials {
        username: creds.metron_username.clone(),
        password: creds.metron_password.clone(),
    };

    let list_item = metron_service::get_issue_by_series_and_number(
        series_metron_id as u64,
        normalized,
        &metron_creds,
    )
    .await
    .map_err(|e| format!("Metron API search error: {}", e))?;

    let list_item = match list_item {
        Some(i) => i,
        None => {
            info!(
                "Metron API returned no issue for series {} number {}",
                series_metron_id, normalized
            );
            return Ok(None);
        }
    };

    let provider = crate::providers::get_provider_or_panic(ProviderKind::Metron);
    let mut record = provider
        .build_book_record(
            &list_item.number.clone().unwrap_or_default(),
            &file_path,
            None,
            &creds,
        )
        .await
        .map_err(|e| format!("Metron build error: {}", e))?;

    record.external_id = format!("{}", list_item.id);
    let book = repo
        .upsert_book(record)
        .await
        .map_err(|e| format!("{}", e))?;

    info!("Inserted Metron book {} at {}", list_item.id, file_path);
    let display = crate::models::DisplayBook::from(book);
    Ok(Some(serde_json::to_value(display).unwrap_or(Value::Null)))
}

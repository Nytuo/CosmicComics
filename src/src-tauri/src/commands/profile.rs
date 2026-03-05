use crate::commands::state::AppState;
use crate::providers::{ApiCredentials, ProviderKind};
use tauri::State;
use tracing::info;

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

/// Download/export the database as JSON.
#[tauri::command]
pub async fn download_database(state: State<'_, AppState>) -> Result<Vec<u8>, String> {
    let repo = get_repo(&state).await?;
    let export = repo.export_all().await.map_err(|e| format!("{}", e))?;
    let json_bytes = serde_json::to_vec_pretty(&export)
        .map_err(|e| format!("Failed to serialize database: {}", e))?;
    Ok(json_bytes)
}

/// Refresh metadata for a book or series.
#[tauri::command]
pub async fn refresh_metadata_by_provider(
    state: State<'_, AppState>,
    id: String,
    provider: i32,
    item_type: String,
) -> Result<(), String> {
    let repo = get_repo(&state).await?;
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

    let sanitized_id = id.trim().replace("'", "");

    info!(
        "Refresh Metadata for {} {} for provider {}",
        sanitized_id, item_type, provider
    );

    let kind = ProviderKind::from_id(provider as u8)
        .ok_or_else(|| format!("Unsupported provider: {}", provider))?;

    let provider_impl = crate::providers::get_provider_or_panic(kind);

    match item_type.as_str() {
        "book" => {
            provider_impl
                .refresh_book_meta_surreal(&repo, &sanitized_id, &creds)
                .await
                .map_err(|e| format!("Error refreshing book metadata: {}", e))?;
        }
        "series" => {
            provider_impl
                .refresh_series_meta_surreal(&repo, &sanitized_id, &creds)
                .await
                .map_err(|e| format!("Error refreshing series metadata: {}", e))?;
        }
        _ => return Err(format!("Invalid item_type: {}", item_type)),
    }

    info!(
        "Metadata refreshed for {} (provider: {})",
        sanitized_id, provider
    );
    Ok(())
}

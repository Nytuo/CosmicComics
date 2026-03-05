// Settings-related Tauri commands
use crate::commands::state::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;
use tracing::{error, info, warn};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CredentialDefinition {
    pub key: String,
    pub label: String,
    pub description: String,
    pub is_secret: bool,
    pub provider: String,
}

fn all_credential_definitions() -> Vec<CredentialDefinition> {
    vec![
        CredentialDefinition {
            key: "marvel_public_key".into(),
            label: "Marvel Public Key".into(),
            description: "Marvel API public key (developer.marvel.com)".into(),
            is_secret: false,
            provider: "Marvel".into(),
        },
        CredentialDefinition {
            key: "marvel_private_key".into(),
            label: "Marvel Private Key".into(),
            description: "Marvel API private key — keep this secret".into(),
            is_secret: true,
            provider: "Marvel".into(),
        },
        CredentialDefinition {
            key: "google_books_api_key".into(),
            label: "Google Books API Key".into(),
            description: "Google Books API key (console.cloud.google.com)".into(),
            is_secret: true,
            provider: "Google Books".into(),
        },
        CredentialDefinition {
            key: "metron_username".into(),
            label: "Metron Username".into(),
            description: "Your Metron.cloud account username".into(),
            is_secret: false,
            provider: "Metron".into(),
        },
        CredentialDefinition {
            key: "metron_password".into(),
            label: "Metron Password".into(),
            description: "Your Metron.cloud account password".into(),
            is_secret: true,
            provider: "Metron".into(),
        },
        CredentialDefinition {
            key: "mangadex_client_id".into(),
            label: "MangaDex Client ID".into(),
            description: "MangaDex personal client ID (mangadex.org/settings)".into(),
            is_secret: false,
            provider: "MangaDex".into(),
        },
        CredentialDefinition {
            key: "mangadex_client_secret".into(),
            label: "MangaDex Client Secret".into(),
            description: "MangaDex personal client secret — keep this secret".into(),
            is_secret: true,
            provider: "MangaDex".into(),
        },
        CredentialDefinition {
            key: "mangadex_username".into(),
            label: "MangaDex Username".into(),
            description: "Your MangaDex account username".into(),
            is_secret: false,
            provider: "MangaDex".into(),
        },
        CredentialDefinition {
            key: "mangadex_password".into(),
            label: "MangaDex Password".into(),
            description: "Your MangaDex account password".into(),
            is_secret: true,
            provider: "MangaDex".into(),
        },
    ]
}

pub async fn load_credentials_into_state(state: &AppState) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let global = state.global_vars.lock().await;
    let repo = global.get_surreal_db(&base_path).await.map_err(|e| {
        warn!("[load_credentials_into_state] DB not ready yet: {}", e);
        format!("{}", e)
    })?;
    drop(global);

    let stored = repo.get_all_api_credentials().await.map_err(|e| {
        error!(
            "[load_credentials_into_state] Failed to read credentials: {}",
            e
        );
        format!("{}", e)
    })?;

    let mut creds = state.creds.lock().await;
    for (key, value) in &stored {
        if value.is_empty() {
            continue;
        }
        match key.as_str() {
            "marvel_public_key" => creds.marvel_public_key = value.clone(),
            "marvel_private_key" => creds.marvel_private_key = value.clone(),
            "google_books_api_key" => creds.google_books_api_key = value.clone(),
            "open_library_api_key" => creds.open_library_api_key = value.clone(),
            "metron_username" => creds.metron_username = value.clone(),
            "metron_password" => creds.metron_password = value.clone(),
            "mangadex_client_id" => creds.mangadex_client_id = value.clone(),
            "mangadex_client_secret" => creds.mangadex_client_secret = value.clone(),
            "mangadex_username" => creds.mangadex_username = value.clone(),
            "mangadex_password" => creds.mangadex_password = value.clone(),
            _ => {}
        }
    }
    info!(
        "[load_credentials_into_state] Applied {} stored credentials",
        stored.len()
    );
    Ok(())
}

#[tauri::command]
pub async fn get_credential_definitions() -> Result<Vec<CredentialDefinition>, String> {
    Ok(all_credential_definitions())
}

#[tauri::command]
pub async fn get_api_credentials(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let global = state.global_vars.lock().await;
    let repo = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("{}", e))?;
    drop(global);

    repo.get_all_api_credentials().await.map_err(|e| {
        error!("[get_api_credentials] {}", e);
        format!("{}", e)
    })
}

#[tauri::command]
pub async fn save_api_credentials(
    state: State<'_, AppState>,
    credentials: HashMap<String, String>,
) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let global = state.global_vars.lock().await;
    let repo = global
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("{}", e))?;
    drop(global);

    for (key, value) in &credentials {
        repo.upsert_api_credential(key, value).await.map_err(|e| {
            error!("[save_api_credentials] Failed to save key '{}': {}", key, e);
            format!("{}", e)
        })?;
    }

    let mut creds = state.creds.lock().await;
    for (key, value) in &credentials {
        match key.as_str() {
            "marvel_public_key" => creds.marvel_public_key = value.clone(),
            "marvel_private_key" => creds.marvel_private_key = value.clone(),
            "google_books_api_key" => creds.google_books_api_key = value.clone(),
            "open_library_api_key" => creds.open_library_api_key = value.clone(),
            "metron_username" => creds.metron_username = value.clone(),
            "metron_password" => creds.metron_password = value.clone(),
            "mangadex_client_id" => creds.mangadex_client_id = value.clone(),
            "mangadex_client_secret" => creds.mangadex_client_secret = value.clone(),
            "mangadex_username" => creds.mangadex_username = value.clone(),
            "mangadex_password" => creds.mangadex_password = value.clone(),
            _ => {}
        }
    }

    info!(
        "[save_api_credentials] Saved {} credentials",
        credentials.len()
    );
    Ok(())
}

#[tauri::command]
pub async fn get_app_version(state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().await;
    Ok(config.version.clone())
}

#[tauri::command]
pub async fn get_base_path(state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().await;
    Ok(config.base_path.clone())
}

#[tauri::command]
pub async fn get_user_config(state: State<'_, AppState>) -> Result<Value, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);

    let config_path = PathBuf::from(&base_path).join("config.json");

    let config_content = fs::read_to_string(&config_path).map_err(|e| {
        error!("Failed to read user config: {}", e);
        format!("Failed to read user config: {}", e)
    })?;

    let config_json: Value = serde_json::from_str(&config_content).map_err(|e| {
        error!("Failed to parse user config: {}", e);
        format!("Failed to parse user config: {}", e)
    })?;

    Ok(config_json)
}

#[tauri::command]
pub async fn write_user_config(state: State<'_, AppState>, config: Value) -> Result<(), String> {
    let app_config = state.config.lock().await;
    let base_path = app_config.base_path.clone();
    drop(app_config);

    let config_path = PathBuf::from(&base_path).join("config.json");

    fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap()).map_err(|e| {
        error!("Failed to write user config: {}", e);
        format!("Failed to write user config: {}", e)
    })?;

    info!("User config updated successfully with : {}", config);
    Ok(())
}

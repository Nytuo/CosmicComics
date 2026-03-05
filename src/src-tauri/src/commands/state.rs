// Application state for Tauri commands
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use crate::repositories::surreal_repo::SurrealRepo;

pub struct AppConfig {
    pub base_path: String,
    pub version: String,
}

pub struct ApiTokens {
    pub marvel_public_key: String,
    pub marvel_private_key: String,
    pub google_books_api_key: String,
    pub open_library_api_key: String,
    pub metron_username: String,
    pub metron_password: String,
    pub mangadex_client_id: String,
    pub mangadex_client_secret: String,
    pub mangadex_username: String,
    pub mangadex_password: String,
}

#[derive(Clone)]
pub struct AppGlobalVariables {
    pub progress_status: Arc<Mutex<HashMap<String, HashMap<String, String>>>>,
    pub surreal_db: Arc<Mutex<Option<SurrealRepo>>>,
    pub app_handle: Option<AppHandle>,
}

impl AppGlobalVariables {
    pub fn new() -> Self {
        AppGlobalVariables {
            progress_status: Arc::new(Mutex::new(HashMap::new())),
            surreal_db: Arc::new(Mutex::new(None)),
            app_handle: None,
        }
    }

    pub fn with_app_handle(app_handle: AppHandle) -> Self {
        AppGlobalVariables {
            progress_status: Arc::new(Mutex::new(HashMap::new())),
            surreal_db: Arc::new(Mutex::new(None)),
            app_handle: Some(app_handle),
        }
    }

    pub async fn get_progress_status(&self) -> HashMap<String, HashMap<String, String>> {
        self.progress_status.lock().await.clone()
    }

    pub async fn set_progress_status(
        &self,
        key: String,
        status: String,
        progress: String,
        current_task: String,
    ) {
        let mut progress_map = self.progress_status.lock().await;
        progress_map.insert(
            key.clone(),
            HashMap::from([
                ("status".to_string(), status.clone()),
                ("percentage".to_string(), progress.clone()),
                ("current_file".to_string(), current_task.clone()),
            ]),
        );

        if let Some(handle) = &self.app_handle {
            let _ = handle.emit(
                "progress-update",
                serde_json::json!({
                    "key": key,
                    "status": status,
                    "percentage": progress,
                    "current_file": current_task,
                }),
            );
        }
    }

    pub async fn get_surreal_db(&self, base_path: &str) -> anyhow::Result<SurrealRepo> {
        tracing::debug!("[get_surreal_db] called with base_path={}", base_path);
        let mut guard = self.surreal_db.lock().await;
        if let Some(repo) = guard.as_ref() {
            tracing::debug!("[get_surreal_db] returning cached SurrealRepo");
            return Ok(repo.clone());
        }
        tracing::debug!("[get_surreal_db] no cached repo, calling SurrealRepo::open");
        let repo = SurrealRepo::open(base_path).await?;
        tracing::debug!("[get_surreal_db] SurrealRepo::open succeeded, caching");
        *guard = Some(repo.clone());
        Ok(repo)
    }
}

pub struct AppState {
    pub config: Arc<Mutex<AppConfig>>,
    pub creds: Arc<Mutex<ApiTokens>>,
    pub global_vars: Arc<Mutex<AppGlobalVariables>>,
    pub scan_locks: Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>,
}

impl AppState {
    pub fn new(base_path: String, app_handle: AppHandle) -> Self {
        let version = env!("CARGO_PKG_VERSION").to_string();

        let marvel_public_key = std::env::var("MARVEL_PUBLIC_KEY").unwrap_or_default();
        let marvel_private_key = std::env::var("MARVEL_PRIVATE_KEY").unwrap_or_default();
        let google_books_api_key = std::env::var("GOOGLE_BOOKS_API_KEY").unwrap_or_default();
        let open_library_api_key = std::env::var("OPEN_LIBRARY_API_KEY").unwrap_or_default();
        let metron_username = std::env::var("METRON_USERNAME").unwrap_or_default();
        let metron_password = std::env::var("METRON_PASSWORD").unwrap_or_default();
        let mangadex_client_id = std::env::var("MANGADEX_CLIENT_ID").unwrap_or_default();
        let mangadex_client_secret = std::env::var("MANGADEX_CLIENT_SECRET").unwrap_or_default();
        let mangadex_username = std::env::var("MANGADEX_USERNAME").unwrap_or_default();
        let mangadex_password = std::env::var("MANGADEX_PASSWORD").unwrap_or_default();

        AppState {
            config: Arc::new(Mutex::new(AppConfig { base_path, version })),
            creds: Arc::new(Mutex::new(ApiTokens {
                marvel_public_key,
                marvel_private_key,
                google_books_api_key,
                open_library_api_key,
                metron_username,
                metron_password,
                mangadex_client_id,
                mangadex_client_secret,
                mangadex_username,
                mangadex_password,
            })),
            global_vars: Arc::new(Mutex::new(AppGlobalVariables::with_app_handle(app_handle))),
            scan_locks: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

use crate::commands::state::AppState;
use crate::models::stats::{ReadingSessionRecord, StatsOverview};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::jellyfin_service::{
    JellyfinClient, JellyfinError, JellyfinServer, JellyfinStore,
};
use crate::services::stats_service::{
    compute, parse_time, SourceFilter, StatBook, StatsFilter, StatsInput,
};
use chrono::Utc;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;
use tracing::{error, warn};

const JELLYFIN_CACHE_TTL: Duration = Duration::from_secs(120);
const JELLYFIN_BOOK_CAP: usize = 10_000;
const MAX_SESSION_SECS: i64 = 24 * 3600;

type BookCache = HashMap<String, (Instant, Vec<StatBook>)>;

static JELLYFIN_CACHE: Lazy<Mutex<BookCache>> = Lazy::new(|| Mutex::new(HashMap::new()));

async fn repo(state: &State<'_, AppState>) -> Result<SurrealRepo, String> {
    let base_path = state.config.lock().await.base_path.clone();
    state
        .global_vars
        .lock()
        .await
        .get_surreal_db(&base_path)
        .await
        .map_err(|e| format!("Error getting SurrealDB: {}", e))
}

fn valid_session(mut session: ReadingSessionRecord) -> Result<ReadingSessionRecord, String> {
    let id_ok = !session.session_id.is_empty()
        && session.session_id.len() <= 64
        && session
            .session_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !id_ok {
        return Err("Invalid session id".into());
    }
    if !matches!(session.source.as_str(), "local" | "jellyfin") {
        return Err("Invalid session source".into());
    }
    if parse_time(&session.started_at).is_none() || parse_time(&session.ended_at).is_none() {
        return Err("Invalid session time".into());
    }
    session.duration_secs = session.duration_secs.clamp(0, MAX_SESSION_SECS);
    session.pages_read = session.pages_read.max(0);
    session.page_count = session.page_count.max(0);
    session.title = session.title.chars().take(300).collect();
    Ok(session)
}

#[tauri::command]
pub async fn stats_record_session(
    state: State<'_, AppState>,
    session: ReadingSessionRecord,
) -> Result<(), String> {
    let session = valid_session(session)?;
    repo(&state)
        .await?
        .upsert_reading_session(&session)
        .await
        .map_err(|e| {
            error!("[stats] could not save the reading session: {}", e);
            e.to_string()
        })
}

#[tauri::command]
pub async fn stats_clear_history(state: State<'_, AppState>) -> Result<(), String> {
    repo(&state)
        .await?
        .clear_reading_sessions()
        .await
        .map_err(|e| e.to_string())
}

async fn jellyfin_books(
    server: &JellyfinServer,
    device_id: &str,
    refresh: bool,
) -> Result<Vec<StatBook>, JellyfinError> {
    if !refresh {
        let cache = JELLYFIN_CACHE.lock().unwrap_or_else(|e| e.into_inner());
        if let Some((at, books)) = cache.get(&server.id) {
            if at.elapsed() < JELLYFIN_CACHE_TTL {
                return Ok(books.clone());
            }
        }
    }
    let client = JellyfinClient::for_server(server, device_id);
    let mut books = Vec::new();
    for library in client.books_by_library(JELLYFIN_BOOK_CAP).await? {
        books.extend(library.items.iter().map(|item| {
            StatBook::from_jellyfin(&server.id, &server.name, item, Some(&library.library_name))
        }));
    }
    JELLYFIN_CACHE
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(server.id.clone(), (Instant::now(), books.clone()));
    Ok(books)
}

#[tauri::command]
pub async fn stats_get_overview(
    state: State<'_, AppState>,
    source: String,
    server_id: Option<String>,
    offset_minutes: i32,
    refresh: Option<bool>,
) -> Result<StatsOverview, String> {
    let filter = StatsFilter {
        source: SourceFilter::parse(&source),
        server_id: server_id.filter(|id| !id.is_empty()),
    };
    let repo = repo(&state).await?;
    let mut books = Vec::new();
    let mut warnings = Vec::new();
    let mut local_series = 0;

    if filter.source.includes_local() {
        let series = repo.get_all_series().await.map_err(|e| e.to_string())?;
        local_series = series.len() as i64;
        let by_id: HashMap<String, &_> = series
            .iter()
            .filter_map(|s| s.id.as_ref().map(|id| (id.to_string(), s)))
            .collect();
        for book in repo
            .get_all_books()
            .await
            .map_err(|e| e.to_string())?
            .iter()
            .filter(|b| !b.path.trim().is_empty())
        {
            let series = book
                .series_id
                .as_ref()
                .and_then(|id| by_id.get(id).copied());
            books.push(StatBook::from_local(book, series));
        }
    }

    if filter.source.includes_jellyfin() {
        let base_path = state.config.lock().await.base_path.clone();
        let store = JellyfinStore::new(&base_path);
        let device_id = store.device_id().map_err(|e| e.to_string())?;
        let servers: Vec<JellyfinServer> = store
            .servers()
            .into_iter()
            .filter(|s| filter.server_id.as_ref().is_none_or(|id| &s.id == id))
            .collect();
        let results = futures::future::join_all(
            servers
                .iter()
                .map(|server| jellyfin_books(server, &device_id, refresh.unwrap_or(false))),
        )
        .await;
        for (server, result) in servers.iter().zip(results) {
            match result {
                Ok(list) => books.extend(list),
                Err(JellyfinError::Unauthorized) => {
                    warnings.push(format!("unauthorized:{}", server.name))
                }
                Err(e) => {
                    warn!("[stats] {}: {}", server.name, e);
                    warnings.push(format!("error:{}: {}", server.name, e));
                }
            }
        }
    }

    let sessions = repo
        .get_reading_sessions()
        .await
        .map_err(|e| e.to_string())?;
    Ok(compute(
        StatsInput {
            books,
            local_series,
            sessions,
            now: Utc::now(),
            offset_minutes,
            warnings,
        },
        &filter,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session() -> ReadingSessionRecord {
        ReadingSessionRecord {
            session_id: "abc-123".into(),
            source: "local".into(),
            server_id: None,
            book_ref: "book:x".into(),
            title: "T".into(),
            series_title: None,
            format: None,
            started_at: "2026-09-20T10:00:00Z".into(),
            ended_at: "2026-09-20T10:10:00Z".into(),
            duration_secs: 600,
            pages_read: 5,
            page_count: 20,
            completed: false,
        }
    }

    #[test]
    fn sessions_are_validated_and_clamped() {
        assert!(valid_session(session()).is_ok());

        let mut bad_id = session();
        bad_id.session_id = "../../x".into();
        assert!(valid_session(bad_id).is_err());

        let mut bad_source = session();
        bad_source.source = "cloud".into();
        assert!(valid_session(bad_source).is_err());

        let mut bad_time = session();
        bad_time.started_at = "yesterday".into();
        assert!(valid_session(bad_time).is_err());

        let mut huge = session();
        huge.duration_secs = 999_999_999;
        huge.pages_read = -4;
        let clean = valid_session(huge).unwrap();
        assert_eq!(clean.duration_secs, MAX_SESSION_SECS);
        assert_eq!(clean.pages_read, 0);
    }
}

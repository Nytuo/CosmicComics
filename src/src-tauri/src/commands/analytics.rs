// Opt-in usage counting and bug reports, sent to a self-hosted Aptabase.
//
// Nothing is registered, queued or sent until the user has said yes. The
// choice lives in `analytics.json` next to the rest of the app data.
use crate::commands::state::AppState;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, State};
use tauri_plugin_aptabase::{ErrorReport, EventTracker, InitOptions};

const APP_KEY: &str = "A-SH-7231295990";
const HOST: &str = "https://analytics.nytuo.fr";

/// Usage counting is allowed right now.
static USAGE: AtomicBool = AtomicBool::new(false);
/// Error reports are allowed right now.
static ERRORS: AtomicBool = AtomicBool::new(false);
/// The Aptabase plugin has been added to the app (it cannot be removed again).
static REGISTERED: AtomicBool = AtomicBool::new(false);

/// The two choices are independent: usage counting and error reports.
#[derive(Serialize, Deserialize, Clone, Copy, Default)]
pub struct Consent {
    pub usage: bool,
    pub errors: bool,
}

fn consent_file(base_path: &Path) -> PathBuf {
    base_path.join("analytics.json")
}

/// `None` while the user has not been asked yet.
fn read_consent(base_path: &Path) -> Option<Consent> {
    let raw = std::fs::read_to_string(consent_file(base_path)).ok()?;
    serde_json::from_str::<Consent>(&raw).ok()
}

fn write_consent(base_path: &Path, consent: Consent) -> Result<(), String> {
    let raw = serde_json::to_string(&consent).map_err(|e| e.to_string())?;
    std::fs::write(consent_file(base_path), raw).map_err(|e| e.to_string())
}

fn register(app: &AppHandle) -> Result<(), String> {
    if REGISTERED
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Ok(());
    }

    let plugin = tauri_plugin_aptabase::Builder::new(APP_KEY)
        .with_options(InitOptions {
            host: Some(HOST.into()),
            flush_interval: None,
        })
        // Crash reports say where the panic happened (file name and line), never
        // its message or the path: those can contain book names and user names.
        .with_panic_hook(Box::new(|client, info, _message| {
            if !ERRORS.load(Ordering::SeqCst) {
                return;
            }
            let location = info
                .location()
                .map(|l| {
                    let file = Path::new(l.file())
                        .file_name()
                        .map(|f| f.to_string_lossy().into_owned())
                        .unwrap_or_default();
                    format!("{}:{}", file, l.line())
                })
                .unwrap_or_default();
            let report =
                ErrorReport::new("panic", format!("panic at {}", location)).with_fatal(true);
            client.track_error(report);
            client.flush_blocking();
        }))
        .build();

    app.plugin(plugin).map_err(|e| {
        REGISTERED.store(false, Ordering::SeqCst);
        e.to_string()
    })
}

/// Applies the choices: the plugin is added only if one of them is on.
fn apply(app: &AppHandle, consent: Consent) {
    let was_counting = USAGE.load(Ordering::SeqCst);
    if consent.usage || consent.errors {
        if let Err(e) = register(app) {
            tracing::warn!("[analytics] could not start: {}", e);
            return;
        }
    }
    USAGE.store(consent.usage, Ordering::SeqCst);
    ERRORS.store(consent.errors, Ordering::SeqCst);
    if consent.usage && !was_counting {
        let _ = app.track_event("app_started", None);
    }
}

/// Called once at startup: resumes what the user already allowed.
pub fn init(app: &AppHandle, base_path: &str) {
    if let Some(consent) = read_consent(Path::new(base_path)) {
        apply(app, consent);
    }
}

/// Called when the app exits: sends what is still queued.
pub fn on_exit(app: &AppHandle) {
    if USAGE.load(Ordering::SeqCst) {
        let _ = app.track_event("app_exited", None);
    }
    if REGISTERED.load(Ordering::SeqCst) {
        app.flush_events_blocking();
    }
}

#[tauri::command]
pub async fn get_analytics_consent(state: State<'_, AppState>) -> Result<Option<Consent>, String> {
    let base_path = state.config.lock().await.base_path.clone();
    Ok(read_consent(Path::new(&base_path)))
}

#[tauri::command]
pub async fn set_analytics_consent(
    app: AppHandle,
    state: State<'_, AppState>,
    usage: bool,
    errors: bool,
) -> Result<(), String> {
    let base_path = state.config.lock().await.base_path.clone();
    let consent = Consent { usage, errors };
    write_consent(Path::new(&base_path), consent)?;
    apply(&app, consent);
    Ok(())
}

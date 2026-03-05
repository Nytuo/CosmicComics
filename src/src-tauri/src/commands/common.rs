use crate::commands::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_progress(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<std::collections::HashMap<String, String>>, String> {
    let global = state.global_vars.lock().await;
    let all_progress = global.get_progress_status().await;
    Ok(all_progress.get(&key).cloned())
}

#[tauri::command]
pub async fn ping() -> Result<String, String> {
    Ok("pong".to_string())
}

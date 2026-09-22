//! Books opened from the system (double click, "Open with", drag on the app
//! icon, command line). The path is kept until the window takes it, so a book
//! opened while the app is starting is not lost.

use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

static PENDING: Mutex<Option<String>> = Mutex::new(None);

/// A path the viewer can open: an existing file with a book extension.
pub fn openable(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .is_some_and(|e| crate::utils::VALID_BOOK_EXTENSION.contains(&e.as_str()))
}

/// First openable book among command-line arguments (the program name
/// excluded). Relative paths are resolved against `cwd`.
pub fn from_args(args: &[String], cwd: &Path) -> Option<PathBuf> {
    args.iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .map(|a| {
            let path = PathBuf::from(a.trim_start_matches("file://"));
            if path.is_absolute() {
                path
            } else {
                cwd.join(path)
            }
        })
        .find(|p| openable(p))
}

/// Queues a book for the viewer and brings the window forward.
pub fn open(app: &AppHandle, path: &Path) {
    let path = path.to_string_lossy().to_string();
    tracing::info!("[open-file] {}", path);
    *PENDING.lock().unwrap_or_else(|e| e.into_inner()) = Some(path.clone());
    let _ = app.emit("open-file", path);
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(desktop)]
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// The book waiting to be opened, if any. Taking it clears it.
#[tauri::command]
pub fn take_pending_open_file() -> Option<String> {
    PENDING.lock().unwrap_or_else(|e| e.into_inner()).take()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_existing_books_are_opened() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("Saga 01.CBZ"), b"PK").unwrap();
        std::fs::write(dir.path().join("notes.txt"), b"").unwrap();
        let args: Vec<String> = ["app", "--flag", "notes.txt", "missing.cbz", "Saga 01.CBZ"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        assert_eq!(
            from_args(&args, dir.path()),
            Some(dir.path().join("Saga 01.CBZ"))
        );
        assert_eq!(from_args(&args[..3], dir.path()), None);
    }
}

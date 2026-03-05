// Collectionner service — file system operations
use anyhow::Result;
use serde_json::{json, Value};
use std::fs;

/// List subdirectories in the given path.
pub async fn get_list_of_folders(path: String) -> Result<Value> {
    let entries = fs::read_dir(&path)?;
    let mut folders = Vec::new();
    for entry in entries.flatten() {
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            let full_path = entry.path().to_string_lossy().to_string();
            folders.push(json!({
                "name": name,
                "path": full_path,
            }));
        }
    }
    folders.sort_by(|a, b| {
        a.get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .cmp(b.get("name").and_then(|v| v.as_str()).unwrap_or(""))
    });
    Ok(json!(folders))
}

/// List all files and folders in the given path.
pub async fn get_list_of_files_and_folders(path: String) -> Result<Value> {
    let entries = fs::read_dir(&path)?;
    let mut items = Vec::new();
    for entry in entries.flatten() {
        let file_type = entry.file_type()?;
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        items.push(json!({
            "name": name,
            "path": full_path,
            "is_dir": file_type.is_dir(),
        }));
    }
    items.sort_by(|a, b| {
        let a_dir = a.get("is_dir").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_dir = b.get("is_dir").and_then(|v| v.as_bool()).unwrap_or(false);
        b_dir.cmp(&a_dir).then_with(|| {
            a.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .cmp(b.get("name").and_then(|v| v.as_str()).unwrap_or(""))
        })
    });
    Ok(json!(items))
}

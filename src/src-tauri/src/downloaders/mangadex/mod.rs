pub mod auth;
pub mod db;
pub mod download;
pub mod models;
pub mod search;

pub use auth::*;
pub use db::*;
pub use download::*;
#[allow(unused_imports)]
pub use models::*;
pub use search::*;

pub(crate) const MANGADEX_API: &str = "https://api.mangadex.org";
pub(crate) const MANGADEX_AUTH: &str =
    "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token";
pub(crate) const MANGADEX_COVERS: &str = "https://uploads.mangadex.org/covers";

/// Build a reusable HTTP client for MangaDex API requests.
pub(crate) fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("CosmicComics/1.0")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

/// Extract the best English (fallback to any) title from a MangaDex title map.
pub(crate) fn extract_title(title_map: &serde_json::Value) -> String {
    if let Some(en) = title_map.get("en").and_then(|v| v.as_str()) {
        return en.to_string();
    }
    if let Some(obj) = title_map.as_object() {
        for (_lang, val) in obj {
            if let Some(s) = val.as_str() {
                return s.to_string();
            }
        }
    }
    "Unknown".to_string()
}

/// Extract description preferring English.
pub(crate) fn extract_description(desc_map: &serde_json::Value) -> String {
    if let Some(en) = desc_map.get("en").and_then(|v| v.as_str()) {
        return en.to_string();
    }
    if let Some(obj) = desc_map.as_object() {
        for (_lang, val) in obj {
            if let Some(s) = val.as_str() {
                return s.to_string();
            }
        }
    }
    String::new()
}

/// Build the cover URL from a manga ID and cover filename.
pub(crate) fn build_cover_url(manga_id: &str, cover_filename: &str) -> String {
    format!(
        "{}/{}/{}.256.jpg",
        MANGADEX_COVERS, manga_id, cover_filename
    )
}

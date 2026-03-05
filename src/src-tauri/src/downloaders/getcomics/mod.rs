pub mod db;
pub mod download;
pub mod latest;
pub mod models;
pub mod search;

pub use db::*;
pub use download::*;
pub use latest::*;
#[allow(unused_imports)]
pub use models::*;
pub use search::*;

pub(crate) const GETCOMICS_BASE: &str = "https://getcomics.org";

/// Build a reusable HTTP client for GetComics requests.
pub(crate) fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

/// Extract the post ID from an article element id.
pub(crate) fn extract_post_id(article_id: &str) -> String {
    article_id
        .strip_prefix("post-")
        .unwrap_or(article_id)
        .to_string()
}

/// Parse year and size from text like "Year : 2026 | Size : 70 MB".
pub(crate) fn parse_year_size(text: &str) -> (Option<String>, Option<String>) {
    let mut year: Option<String> = None;
    let mut size: Option<String> = None;

    for part in text.split('|') {
        let part = part.trim();
        if let Some(y) = part
            .strip_prefix("Year :")
            .or_else(|| part.strip_prefix("Year:"))
        {
            let y = y.trim();
            if !y.is_empty() {
                year = Some(y.to_string());
            }
        } else if let Some(s) = part
            .strip_prefix("Size :")
            .or_else(|| part.strip_prefix("Size:"))
        {
            let s = s.trim();
            if !s.is_empty() && s != "- MB" {
                size = Some(s.to_string());
            }
        }
    }

    (year, size)
}

/// Classify a download link based on its CSS class and label text.
pub(crate) fn classify_link(class: &str, label: &str, url: &str) -> String {
    let label_lower = label.to_lowercase();
    let class_lower = class.to_lowercase();

    if label_lower.contains("mega") || class_lower.contains("aio-black") {
        "mega".to_string()
    } else if label_lower.contains("mediafire") {
        "mediafire".to_string()
    } else if label_lower.contains("zippyshare") {
        "zippyshare".to_string()
    } else if label_lower.contains("terabox") {
        "terabox".to_string()
    } else if label_lower.contains("rootz") {
        "rootz".to_string()
    } else if label_lower.contains("ufile") || label_lower.contains("uploadhaven") {
        "ufile".to_string()
    } else if class_lower.contains("aio-red") || label_lower.contains("download now") {
        "direct".to_string()
    } else if url.contains("getcomics.org/dlds/") {
        "direct".to_string()
    } else {
        "other".to_string()
    }
}

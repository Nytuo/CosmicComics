use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MangaDexAuth {
    pub access_token: String,
    pub refresh_token: String,
    pub authenticated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MangaDexManga {
    pub id: String,
    pub title: String,
    pub alt_titles: Option<Vec<String>>,
    pub description: String,
    pub cover_url: String,
    pub status: Option<String>,
    pub year: Option<u32>,
    pub content_rating: Option<String>,
    pub tags: Option<Vec<String>>,
    pub authors: Option<Vec<String>>,
    pub artists: Option<Vec<String>>,
    pub original_language: Option<String>,
    pub last_chapter: Option<String>,
    pub last_volume: Option<String>,
    pub demographic_target: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MangaDexChapter {
    pub id: String,
    pub title: String,
    pub volume: String,
    pub chapter: String,
    pub pages: u32,
    pub translated_language: String,
    pub scanlation_group: Option<String>,
    pub publish_at: Option<String>,
    pub readable_at: Option<String>,
    pub external_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MangaDexDownloadProgress {
    pub chapter_id: String,
    pub chapter_title: String,
    pub current_page: u32,
    pub total_pages: u32,
    pub status: String,
    pub error: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MangaDexDownloadRequest {
    pub chapter_id: String,
    pub chapter_title: String,
    pub manga_id: String,
    pub manga_title: String,
    pub save_path: Option<String>,
    pub data_quality: Option<String>,
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetComicsPost {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cover_url: String,
    pub post_url: String,
    pub category: String,
    pub year: Option<String>,
    pub size: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetComicsDownloadLink {
    pub label: String,
    pub url: String,
    pub link_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetComicsDetail {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cover_url: String,
    pub post_url: String,
    pub category: String,
    pub year: Option<String>,
    pub size: Option<String>,
    pub language: Option<String>,
    pub format: Option<String>,
    pub download_links: Vec<GetComicsDownloadLink>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetComicsDownloadProgress {
    pub post_id: String,
    pub post_title: String,
    pub current_bytes: u64,
    pub total_bytes: u64,
    pub status: String,
    pub error: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetComicsDownloadRequest {
    pub post_id: String,
    pub post_title: String,
    pub download_url: String,
    pub save_path: Option<String>,
}

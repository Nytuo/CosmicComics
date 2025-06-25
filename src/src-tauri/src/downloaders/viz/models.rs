use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct VizCookies {
    pub cookies: HashMap<String, String>,
    pub authenticated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VizChapter {
    pub id: String,
    pub title: String,
    pub chapter_number: String,
    pub description: String,
    pub cover_url: String,
    pub series_id: Option<String>,
    pub series_title: Option<String>,
    pub creators: Option<Vec<String>>,
    pub publish_date: Option<String>,
    pub page_count: Option<u32>,
    pub subscription: Option<String>,
    pub free: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VizSeries {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cover_url: String,
    pub start_year: Option<String>,
    pub end_year: Option<String>,
    pub chapter_count: Option<u32>,
    pub subscription: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VizDownloadProgress {
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
pub struct VizDownloadRequest {
    pub chapter_id: String,
    pub chapter_title: String,
    pub cookies: HashMap<String, String>,
    pub save_path: Option<String>,
    pub series_slug: Option<String>,
    pub chapter_number: Option<String>,
}

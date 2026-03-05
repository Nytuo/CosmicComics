use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct DCInfiniteCookies {
    pub cookies: HashMap<String, String>,
    pub authenticated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DCInfiniteComic {
    pub id: String,
    pub title: String,
    pub issue_number: String,
    pub description: String,
    pub cover_url: String,
    pub series_id: Option<String>,
    pub series_title: Option<String>,
    pub creators: Option<Vec<String>>,
    pub publish_date: Option<String>,
    pub page_count: Option<u32>,
    pub rating: Option<String>,
    pub format: Option<String>,
    pub price: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DCInfiniteSeries {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cover_url: String,
    pub start_year: Option<String>,
    pub end_year: Option<String>,
    pub issue_count: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DCDownloadProgress {
    pub comic_id: String,
    pub comic_title: String,
    pub current_page: u32,
    pub total_pages: u32,
    pub status: String,
    pub error: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DCDownloadRequest {
    pub comic_id: String,
    pub comic_title: String,
    pub cookies: HashMap<String, String>,
    pub save_path: Option<String>,
}

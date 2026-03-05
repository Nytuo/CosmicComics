use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct MarvelUnlimitedCookies {
    pub cookies: HashMap<String, String>,
    pub authenticated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarvelUnlimitedComic {
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
    pub upc: Option<String>,
    pub foc_date: Option<String>,
    pub price: Option<String>,
    pub extended_credits: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarvelUnlimitedSeries {
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
pub struct DownloadProgress {
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
pub struct DownloadRequest {
    pub comic_id: String,
    pub comic_title: String,
    pub cookies: HashMap<String, String>,
    pub save_path: Option<String>,
}

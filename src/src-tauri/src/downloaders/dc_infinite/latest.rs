use super::models::DCInfiniteComic;
use super::{extract_dc_comic_id, extract_dc_issue_number, render_dc_page_with_cookies};
use crate::AppState;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct DCNewComicsCache {
    comics: Vec<DCInfiniteComic>,
    fetched_at: i64,
}

fn get_dc_new_comics_cache_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("dc_infinite_new_comics_cache.json"))
}

/// Fetch new comics from the DC Infinite home page.
#[tauri::command]
pub async fn get_dc_infinite_new_comics(
    cookies: HashMap<String, String>,
) -> Result<Vec<DCInfiniteComic>, String> {
    tracing::info!("Fetching new comics from DC Infinite home page");

    let url = "https://www.dcuniverseinfinite.com";

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_dc_page_with_cookies(url, &cookies_clone, "a[href*='/comics/book/']")
    })
    .await
    .map_err(|e| format!("DC home page render task join error: {:?}", e))?
    .map_err(|e| format!("DC home page render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);
    let link_selector = Selector::parse("a[href*='/comics/book/']").unwrap();

    let mut results = Vec::new();

    for link in document.select(&link_selector) {
        let href = link.value().attr("href").unwrap_or("");
        let comic_id = extract_dc_comic_id(href);
        if comic_id.is_empty() {
            continue;
        }

        let title = link.text().collect::<String>().trim().to_string();

        let title = if title.is_empty() {
            let img_sel = Selector::parse("img").unwrap();
            link.select(&img_sel)
                .next()
                .and_then(|img| img.value().attr("alt"))
                .unwrap_or("")
                .trim()
                .to_string()
        } else {
            title
        };

        if title.is_empty() {
            continue;
        }

        let img_sel = Selector::parse("img").unwrap();
        let cover_url = link
            .select(&img_sel)
            .next()
            .and_then(|img| img.value().attr("src"))
            .unwrap_or("")
            .to_string();

        let issue_number = extract_dc_issue_number(&title);

        if results.iter().any(|r: &DCInfiniteComic| r.id == comic_id) {
            continue;
        }

        results.push(DCInfiniteComic {
            id: comic_id,
            title,
            issue_number,
            description: String::new(),
            cover_url,
            series_id: None,
            series_title: None,
            creators: None,
            publish_date: None,
            page_count: None,
            rating: None,
            format: None,
            price: None,
        });
    }

    tracing::info!("Scraped {} new comics from DC Infinite", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn save_dc_new_comics_cache(
    _app: tauri::AppHandle,
    comics: Vec<DCInfiniteComic>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let cache = DCNewComicsCache {
        comics,
        fetched_at: chrono::Utc::now().timestamp(),
    };
    let json = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize DC cache: {}", e))?;
    let path = get_dc_new_comics_cache_path(base_path)?;
    fs::write(&path, json).map_err(|e| format!("Failed to write DC cache: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn load_dc_new_comics_cache(
    _app: tauri::AppHandle,
    max_age_secs: i64,
    state: State<'_, AppState>,
) -> Result<Option<Vec<DCInfiniteComic>>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_dc_new_comics_cache_path(base_path)?;
    if !path.exists() {
        return Ok(None);
    }
    let json = fs::read_to_string(&path).map_err(|e| format!("Failed to read DC cache: {}", e))?;
    let cache: DCNewComicsCache =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse DC cache: {}", e))?;
    let age = chrono::Utc::now().timestamp() - cache.fetched_at;
    if age > max_age_secs {
        return Ok(None);
    }
    Ok(Some(cache.comics))
}

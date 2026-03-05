use super::models::MarvelUnlimitedComic;
use super::{extract_comic_id, extract_issue_number, extract_series_id, get_persistent_browser};
use crate::AppState;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct NewComicsCache {
    comics: Vec<MarvelUnlimitedComic>,
    fetched_at: i64,
}

/// Get the path to the new-comics cache file.
fn get_new_comics_cache_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("marvel_unlimited_new_comics_cache.json"))
}

/// Render the Marvel Unlimited home page with the persistent headless browser and
/// inject cookies via CDP before navigation. Waits for `.ComicCard` elements to appear.
fn render_home_page_with_cookies(
    url: &str,
    cookies: &HashMap<String, String>,
) -> Result<String, String> {
    let guard = get_persistent_browser()?;
    let browser_ref = guard
        .as_ref()
        .ok_or_else(|| "Browser was not initialized".to_string())?;
    let tab = browser_ref
        .new_tab()
        .map_err(|e| format!("Failed to open new tab: {}", e))?;

    if !cookies.is_empty() {
        for (name, value) in cookies.iter() {
            if let Err(e) = tab.call_method(headless_chrome::protocol::cdp::Network::SetCookie {
                name: name.to_string(),
                value: value.to_string(),
                url: None,
                domain: Some(".marvel.com".to_string()),
                path: Some("/".to_string()),
                secure: Some(true),
                http_only: Some(false),
                same_site: Some(headless_chrome::protocol::cdp::Network::CookieSameSite::Lax),
                expires: None,
                priority: None,
                same_party: None,
                source_scheme: None,
                source_port: None,
                partition_key: None,
            }) {
                tracing::warn!("Failed to set cookie {} for home page: {:?}", name, e);
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    tab.navigate_to(url)
        .map_err(|e| format!("Failed to navigate to {}: {}", url, e))?;

    let _ = tab.wait_for_element(".ComicCard");

    std::thread::sleep(std::time::Duration::from_millis(2000));

    let content = tab
        .get_content()
        .map_err(|e| format!("Failed to capture rendered content: {}", e))?;

    if let Err(e) = tab.close(true) {
        tracing::warn!("Failed to close tab: {:?}", e);
    }

    Ok(content)
}

/// Save the new-comics list to disk so it persists across restarts.
#[tauri::command]
pub async fn save_new_comics_cache(
    _app: tauri::AppHandle,
    comics: Vec<MarvelUnlimitedComic>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let cache = NewComicsCache {
        comics,
        fetched_at: chrono::Utc::now().timestamp(),
    };
    let json = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize new comics cache: {}", e))?;
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_new_comics_cache_path(base_path)?;
    fs::write(&path, json).map_err(|e| format!("Failed to write new comics cache: {}", e))?;
    tracing::info!(
        "Saved new comics cache ({} comics) to {:?}",
        cache.fetched_at,
        path
    );
    Ok(())
}

/// Load the new-comics cache from disk.
#[tauri::command]
pub async fn load_new_comics_cache(
    _app: tauri::AppHandle,
    max_age_secs: i64,
    state: State<'_, AppState>,
) -> Result<Option<Vec<MarvelUnlimitedComic>>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_new_comics_cache_path(base_path)?;
    if !path.exists() {
        return Ok(None);
    }
    let json =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read new comics cache: {}", e))?;
    let cache: NewComicsCache = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse new comics cache: {}", e))?;
    let age = chrono::Utc::now().timestamp() - cache.fetched_at;
    if age > max_age_secs {
        tracing::info!(
            "New comics cache is stale ({} s > {} s), ignoring",
            age,
            max_age_secs
        );
        return Ok(None);
    }
    tracing::info!(
        "Loaded new comics cache: {} comics, age {} s",
        cache.comics.len(),
        age
    );
    Ok(Some(cache.comics))
}

/// Fetch and scrape the "New Comics" section from the Marvel Unlimited home page.
#[tauri::command]
pub async fn get_marvel_unlimited_new_comics(
    cookies: HashMap<String, String>,
) -> Result<Vec<MarvelUnlimitedComic>, String> {
    tracing::info!("Fetching new comics from Marvel Unlimited home page");

    let url = "https://www.marvel.com/comics/unlimited/home";

    let cookies_clone = cookies.clone();
    let rendered_html =
        tokio::task::spawn_blocking(move || render_home_page_with_cookies(url, &cookies_clone))
            .await
            .map_err(|e| format!("Home page render task join error: {:?}", e))?
            .map_err(|e| format!("Home page render error: {}", e))?;

    tracing::debug!(
        "Home page rendered HTML length: {} chars",
        rendered_html.len()
    );

    let document = Html::parse_document(&rendered_html);

    let card_selector = Selector::parse("div.Card[data-content-type=\"comic\"]").unwrap();
    let link_selector = Selector::parse("a.ComicCard__Link").unwrap();
    let img_selector = Selector::parse("img[data-testid=\"prism-image\"]").unwrap();
    let title_selector = Selector::parse("p.ComicCard__Meta__Title a").unwrap();
    let creators_selector = Selector::parse("ul.ComicCard__Meta__Creators_List li a").unwrap();

    let mut results = Vec::new();

    for card in document.select(&card_selector) {
        let href = card
            .select(&link_selector)
            .next()
            .and_then(|a| a.value().attr("href"))
            .unwrap_or("");

        let comic_id = extract_comic_id(href);
        if comic_id.is_empty() {
            tracing::debug!(
                "Skipping card — could not extract comic ID from href: {}",
                href
            );
            continue;
        }

        let cover_url = card
            .select(&img_selector)
            .next()
            .and_then(|img| img.value().attr("src"))
            .filter(|s| !s.is_empty() && *s != "about:blank")
            .unwrap_or("https://cdn.marvel.com/content/1x/default/media-no-img.jpg")
            .to_string();

        let title = card
            .select(&title_selector)
            .next()
            .map(|a| a.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        if title.is_empty() {
            tracing::debug!("Skipping card — empty title for comic ID {}", comic_id);
            continue;
        }

        let creators: Vec<String> = card
            .select(&creators_selector)
            .map(|a| a.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let issue_number = extract_issue_number(&title);
        let series_id = extract_series_id(href);

        tracing::debug!(
            "New comic: {} (ID: {}, issue: {})",
            title,
            comic_id,
            issue_number
        );

        results.push(MarvelUnlimitedComic {
            id: comic_id,
            title: title.clone(),
            issue_number,
            description: String::new(),
            cover_url,
            series_id: if series_id.is_empty() {
                None
            } else {
                Some(series_id)
            },
            series_title: None,
            creators: if creators.is_empty() {
                None
            } else {
                Some(creators)
            },
            publish_date: None,
            page_count: None,
            rating: None,
            format: None,
            upc: None,
            foc_date: None,
            price: None,
            extended_credits: None,
        });
    }

    tracing::info!(
        "Scraped {} new comics from Marvel Unlimited home page",
        results.len()
    );

    Ok(results)
}

use super::models::VizChapter;
use super::{extract_viz_chapter_number, render_viz_page_with_cookies, series_slug_to_title};
use crate::AppState;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
struct VizLatestCache {
    chapters: Vec<VizChapter>,
    fetched_at: i64,
}
fn get_viz_latest_cache_path(base_path: String) -> Result<PathBuf, String> {
    Ok(PathBuf::from(base_path).join("viz_latest_cache.json"))
}

/// Fetch latest chapters from VIZ (Shonen Jump homepage).
#[tauri::command]
pub async fn get_viz_latest_chapters(
    cookies: HashMap<String, String>,
) -> Result<Vec<VizChapter>, String> {
    tracing::info!("Fetching latest chapters from VIZ");

    let url = "https://www.viz.com/shonenjump";

    let cookies_clone = cookies.clone();
    let rendered_html =
        tokio::task::spawn_blocking(move || render_viz_page_with_cookies(url, &cookies_clone, "a"))
            .await
            .map_err(|e| format!("VIZ latest render task join error: {:?}", e))?
            .map_err(|e| format!("VIZ latest render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);
    let mut results = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    let chapter_link_re =
        regex::Regex::new(r"/shonenjump/([a-z0-9-]+?)-chapter-[^/]+/chapter/(\d+)").unwrap();

    let date_re = regex::Regex::new(
        r"(?i)(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}",
    )
    .unwrap();

    let tile_sel = Selector::parse("div.o_sortable, div[data-sort-alpha-label]").unwrap();
    let series_link_sel = Selector::parse("a[href*='/shonenjump/chapters/']").unwrap();
    let chapter_link_sel = Selector::parse("a[href*='/chapter/']").unwrap();
    let img_sel = Selector::parse("img").unwrap();

    for tile in document.select(&tile_sel) {
        let chapter_link = tile.select(&chapter_link_sel).find(|a| {
            let href = a.value().attr("href").unwrap_or("");
            chapter_link_re.is_match(href)
        });

        if let Some(ch_link) = chapter_link {
            let href = ch_link.value().attr("href").unwrap_or("");
            if let Some(caps) = chapter_link_re.captures(href) {
                let series_slug = caps
                    .get(1)
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_default();
                let chapter_id = caps
                    .get(2)
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_default();

                if chapter_id.is_empty() || !seen_ids.insert(chapter_id.clone()) {
                    continue;
                }

                let link_text = ch_link.text().collect::<String>();
                let link_text = link_text.trim().to_string();
                let chapter_number = extract_viz_chapter_number(&link_text);
                let publish_date = date_re.find(&link_text).map(|m| m.as_str().to_string());

                let series_title = tile
                    .select(&series_link_sel)
                    .next()
                    .map(|a| a.text().collect::<String>().trim().to_string())
                    .filter(|t| !t.is_empty())
                    .unwrap_or_else(|| series_slug_to_title(&series_slug));

                let title = if !chapter_number.is_empty() {
                    format!("{} Chapter {}", series_title, chapter_number)
                } else {
                    format!("{} (Latest)", series_title)
                };

                let cover_url = tile
                    .select(&img_sel)
                    .next()
                    .and_then(|img| {
                        img.value()
                            .attr("data-original")
                            .or_else(|| img.value().attr("data-src"))
                            .or_else(|| {
                                let src = img.value().attr("src").unwrap_or("");
                                if src.contains("placeholder") {
                                    None
                                } else {
                                    Some(src)
                                }
                            })
                    })
                    .unwrap_or("")
                    .to_string();

                results.push(VizChapter {
                    id: chapter_id,
                    title,
                    chapter_number,
                    description: String::new(),
                    cover_url,
                    series_id: Some(series_slug),
                    series_title: Some(series_title.clone()),
                    creators: None,
                    publish_date,
                    page_count: None,
                    subscription: Some("shonenjump".to_string()),
                    free: Some(
                        link_text.to_lowercase().contains("free") || href.contains("action=read"),
                    ),
                });
            }
        }
    }

    let all_chapter_links = Selector::parse("a[href*='/chapter/']").unwrap();
    for link in document.select(&all_chapter_links) {
        let href = link.value().attr("href").unwrap_or("");
        if let Some(caps) = chapter_link_re.captures(href) {
            let series_slug = caps
                .get(1)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();
            let chapter_id = caps
                .get(2)
                .map(|m| m.as_str().to_string())
                .unwrap_or_default();

            if chapter_id.is_empty() || !seen_ids.insert(chapter_id.clone()) {
                continue;
            }

            let link_text = link.text().collect::<String>();
            let link_text = link_text.trim().to_string();
            let chapter_number = extract_viz_chapter_number(&link_text);
            let publish_date = date_re.find(&link_text).map(|m| m.as_str().to_string());

            let series_title = series_slug_to_title(&series_slug);
            let title = if !chapter_number.is_empty() {
                format!("{} Chapter {}", series_title, chapter_number)
            } else {
                link_text.clone()
            };

            results.push(VizChapter {
                id: chapter_id,
                title,
                chapter_number,
                description: String::new(),
                cover_url: String::new(),
                series_id: Some(series_slug),
                series_title: Some(series_title),
                creators: None,
                publish_date,
                page_count: None,
                subscription: Some("shonenjump".to_string()),
                free: Some(
                    link_text.to_lowercase().contains("free") || href.contains("action=read"),
                ),
            });
        }
    }

    tracing::info!("Scraped {} latest chapters from VIZ", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn save_viz_latest_cache(
    _app: tauri::AppHandle,
    chapters: Vec<VizChapter>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let cache = VizLatestCache {
        chapters,
        fetched_at: chrono::Utc::now().timestamp(),
    };
    let json = serde_json::to_string_pretty(&cache)
        .map_err(|e| format!("Failed to serialize VIZ cache: {}", e))?;
    let path = get_viz_latest_cache_path(base_path)?;
    fs::write(&path, json).map_err(|e| format!("Failed to write VIZ cache: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn load_viz_latest_cache(
    _app: tauri::AppHandle,
    max_age_secs: i64,
    state: State<'_, AppState>,
) -> Result<Option<Vec<VizChapter>>, String> {
    let config = state.config.lock().await;
    let base_path = config.base_path.clone();
    drop(config);
    let path = get_viz_latest_cache_path(base_path)?;
    if !path.exists() {
        return Ok(None);
    }
    let json = fs::read_to_string(&path).map_err(|e| format!("Failed to read VIZ cache: {}", e))?;
    let cache: VizLatestCache =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse VIZ cache: {}", e))?;
    let age = chrono::Utc::now().timestamp() - cache.fetched_at;
    if age > max_age_secs {
        return Ok(None);
    }
    Ok(Some(cache.chapters))
}

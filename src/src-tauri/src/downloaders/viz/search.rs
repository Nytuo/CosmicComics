use scraper::{Html, Selector};
use std::collections::HashMap;

use super::models::{VizChapter, VizSeries};
use super::{parse_viz_chapters_page, render_viz_page_with_cookies, series_slug_to_title};

/// Search for manga on VIZ (both Shonen Jump and VIZ Manga).
#[tauri::command]
pub async fn search_viz_manga(
    query: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<VizChapter>, String> {
    tracing::info!("Searching VIZ manga: {}", query);

    let encoded_query = urlencoding::encode(&query);
    let search_url = format!(
        "https://www.viz.com/search?search={}&category=manga",
        encoded_query
    );

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_viz_page_with_cookies(&search_url, &cookies_clone, "a")
    })
    .await
    .map_err(|e| format!("VIZ render task join error: {:?}", e))?
    .map_err(|e| format!("VIZ render error: {}", e))?;

    let series_slugs = {
        let document = Html::parse_document(&rendered_html);
        tracing::debug!("VIZ search HTML length: {} chars", rendered_html.len());

        let link_selector = Selector::parse("a[href*='/manga-books/']").unwrap();
        let slug_re = regex::Regex::new(
            r"/manga-books/manga/([a-z0-9-]+?)(?:-volume-\d+(?:-\d+)?|-omnibus.*)?/product/",
        )
        .unwrap();

        let mut seen_slugs = std::collections::HashSet::new();
        let mut slugs = Vec::new();

        for link in document.select(&link_selector) {
            let href = link.value().attr("href").unwrap_or("");
            if let Some(captures) = slug_re.captures(href) {
                if let Some(slug) = captures.get(1) {
                    let slug_str = slug.as_str().to_string();
                    if seen_slugs.insert(slug_str.clone()) {
                        let title = link.text().collect::<String>().trim().to_string();
                        let img_sel = Selector::parse("img").unwrap();
                        let cover_url = link
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
                        slugs.push((slug_str, title, cover_url));
                    }
                }
            }
        }
        slugs
    };

    tracing::info!(
        "Found {} unique series slugs from VIZ search",
        series_slugs.len()
    );

    if series_slugs.is_empty() {
        return Ok(Vec::new());
    }

    let max_series = series_slugs.len().min(5);
    let mut all_chapters = Vec::new();

    for (slug, _series_title, _cover) in series_slugs.into_iter().take(max_series) {
        let chapters_url = format!("https://www.viz.com/shonenjump/chapters/{}", slug);
        let cookies_inner = cookies.clone();
        let slug_inner = slug.clone();

        match tokio::task::spawn_blocking(move || {
            render_viz_page_with_cookies(&chapters_url, &cookies_inner, "a")
        })
        .await
        {
            Ok(Ok(html)) => {
                let mut chapters = parse_viz_chapters_page(&html, &slug_inner);
                chapters.truncate(10);
                all_chapters.extend(chapters);
            }
            Ok(Err(e)) => {
                tracing::warn!("Failed to render chapters page for {}: {}", slug, e);
            }
            Err(e) => {
                tracing::warn!("Task join error for {}: {:?}", slug, e);
            }
        }
    }

    tracing::info!(
        "Found {} total VIZ chapters from search",
        all_chapters.len()
    );
    Ok(all_chapters)
}

/// Search for series on VIZ.
#[tauri::command]
pub async fn search_viz_series(
    query: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<VizSeries>, String> {
    tracing::info!("Searching VIZ series: {}", query);

    let encoded_query = urlencoding::encode(&query);
    let search_url = format!(
        "https://www.viz.com/search?search={}&category=manga",
        encoded_query
    );

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_viz_page_with_cookies(&search_url, &cookies_clone, "a")
    })
    .await
    .map_err(|e| format!("VIZ series render task join error: {:?}", e))?
    .map_err(|e| format!("VIZ series render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);
    tracing::debug!("VIZ search HTML length: {} chars", rendered_html.len());

    let link_selector = Selector::parse("a[href*='/manga-books/']").unwrap();
    let slug_re = regex::Regex::new(
        r"/manga-books/manga/([a-z0-9-]+?)(?:-volume-\d+(?:-\d+)?|-omnibus.*)?/product/",
    )
    .unwrap();

    let mut results = Vec::new();
    let mut seen_slugs = std::collections::HashSet::new();

    for link in document.select(&link_selector) {
        let href = link.value().attr("href").unwrap_or("");
        if let Some(caps) = slug_re.captures(href) {
            if let Some(slug) = caps.get(1) {
                let slug_str = slug.as_str().to_string();
                if seen_slugs.insert(slug_str.clone()) {
                    let title_text = link.text().collect::<String>().trim().to_string();
                    let title = regex::Regex::new(r",?\s*Vol\.?\s*\d+.*$")
                        .ok()
                        .map(|re| re.replace(&title_text, "").to_string())
                        .unwrap_or_else(|| title_text.clone());
                    let title = if title.is_empty() {
                        series_slug_to_title(&slug_str)
                    } else {
                        title
                    };

                    let img_sel = Selector::parse("img").unwrap();
                    let cover_url = link
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

                    results.push(VizSeries {
                        id: slug_str,
                        title,
                        description: String::new(),
                        cover_url,
                        start_year: None,
                        end_year: None,
                        chapter_count: None,
                        subscription: Some("shonenjump".to_string()),
                    });
                }
            }
        }
    }

    tracing::info!("Found {} VIZ series for query: {}", results.len(), query);
    Ok(results)
}

/// Get chapters in a VIZ series.
#[tauri::command]
pub async fn get_viz_series_chapters(
    series_id: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<VizChapter>, String> {
    tracing::info!("Fetching chapters for VIZ series: {}", series_id);

    let chapters_url = format!("https://www.viz.com/shonenjump/chapters/{}", series_id);
    let cookies_clone = cookies.clone();
    let url_clone = chapters_url.clone();
    let series_slug = series_id.clone();

    let rendered_html = tokio::task::spawn_blocking(move || {
        render_viz_page_with_cookies(&url_clone, &cookies_clone, "a")
    })
    .await
    .map_err(|e| format!("VIZ chapters render task join error: {:?}", e))?
    .map_err(|e| format!("VIZ chapters render error: {}", e))?;

    let results = parse_viz_chapters_page(&rendered_html, &series_slug);

    tracing::info!(
        "Found {} chapters in VIZ series {}",
        results.len(),
        series_id
    );
    Ok(results)
}

/// Get detailed information about a specific VIZ chapter.
#[tauri::command]
pub async fn get_viz_chapter_details(
    chapter_id: String,
    _cookies: HashMap<String, String>,
) -> Result<VizChapter, String> {
    tracing::info!("Fetching VIZ chapter details: {}", chapter_id);

    if chapter_id.starts_with("viz_") {
        let parts: Vec<&str> = chapter_id.splitn(3, '_').collect();
        let (slug, ch_num) = if parts.len() == 3 {
            (parts[1].to_string(), parts[2].to_string())
        } else {
            (chapter_id.clone(), String::new())
        };

        let title = if !ch_num.is_empty() {
            format!("{} Chapter {}", series_slug_to_title(&slug), ch_num)
        } else {
            series_slug_to_title(&slug)
        };

        return Ok(VizChapter {
            id: chapter_id,
            title,
            chapter_number: ch_num,
            description: String::new(),
            cover_url: String::new(),
            series_id: Some(slug),
            series_title: None,
            creators: None,
            publish_date: None,
            page_count: None,
            subscription: Some("shonenjump".to_string()),
            free: Some(false),
        });
    }

    Ok(VizChapter {
        id: chapter_id.clone(),
        title: format!("VIZ Chapter {}", chapter_id),
        chapter_number: String::new(),
        description: String::new(),
        cover_url: String::new(),
        series_id: None,
        series_title: None,
        creators: None,
        publish_date: None,
        page_count: None,
        subscription: Some("shonenjump".to_string()),
        free: None,
    })
}

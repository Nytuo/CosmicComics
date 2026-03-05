use scraper::{Html, Selector};
use std::collections::HashMap;

use super::models::{DCInfiniteComic, DCInfiniteSeries};
use super::{
    extract_dc_comic_id, extract_dc_issue_number, extract_dc_series_id, render_dc_page_with_cookies,
};

/// Search for comics on DC Universe Infinite via headless browser.
#[tauri::command]
pub async fn search_dc_infinite_comics(
    query: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<DCInfiniteComic>, String> {
    tracing::info!("Searching DC Infinite comics: {}", query);

    let encoded_query = urlencoding::encode(&query);
    let search_url = format!(
        "https://www.dcuniverseinfinite.com/search?q={}&group=comics",
        encoded_query
    );

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_dc_page_with_cookies(&search_url, &cookies_clone, "div.thumb-issue")
    })
    .await
    .map_err(|e| format!("DC render task join error: {:?}", e))?
    .map_err(|e| format!("DC render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);
    tracing::debug!("DC search HTML length: {} chars", rendered_html.len());

    let card_selector = Selector::parse("div.thumb-issue").unwrap();
    let link_selector = Selector::parse("a.thumb-issue__item").unwrap();
    let title_selector = Selector::parse("span.thumb-issue__title").unwrap();
    let img_selector = Selector::parse("img").unwrap();

    let mut results = Vec::new();

    for card in document.select(&card_selector) {
        let link = match card.select(&link_selector).next() {
            Some(l) => l,
            None => continue,
        };

        let href = link.value().attr("href").unwrap_or("");
        let comic_id = extract_dc_comic_id(href);
        if comic_id.is_empty() {
            continue;
        }

        let title = card
            .select(&title_selector)
            .next()
            .map(|t| t.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        if title.is_empty() {
            continue;
        }

        let cover_url = card
            .select(&img_selector)
            .next()
            .and_then(|img| {
                img.value()
                    .attr("srcset")
                    .or_else(|| img.value().attr("src"))
            })
            .unwrap_or("")
            .to_string();

        let issue_number = extract_dc_issue_number(&title);

        if results.iter().any(|r: &DCInfiniteComic| r.id == comic_id) {
            continue;
        }

        results.push(DCInfiniteComic {
            id: comic_id,
            title: title.clone(),
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

    tracing::info!("Found {} DC comics for query: {}", results.len(), query);
    Ok(results)
}

/// Search for series on DC Universe Infinite.
#[tauri::command]
pub async fn search_dc_infinite_series(
    query: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<DCInfiniteSeries>, String> {
    tracing::info!("Searching DC Infinite series: {}", query);

    let encoded_query = urlencoding::encode(&query);
    let search_url = format!(
        "https://www.dcuniverseinfinite.com/search?q={}&group=comics",
        encoded_query
    );

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_dc_page_with_cookies(&search_url, &cookies_clone, "div.thumb-issue")
    })
    .await
    .map_err(|e| format!("DC series render task join error: {:?}", e))?
    .map_err(|e| format!("DC series render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);
    tracing::debug!("DC search HTML length: {} chars", rendered_html.len());

    let card_selector = Selector::parse("div.thumb-issue").unwrap();
    let link_selector = Selector::parse("a.thumb-issue__item").unwrap();
    let title_selector = Selector::parse("span.thumb-issue__title").unwrap();
    let img_selector = Selector::parse("img").unwrap();
    let source_selector = Selector::parse("source").unwrap();

    let mut results = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    for card in document.select(&card_selector) {
        let classes = card.value().attr("class").unwrap_or("");
        if !classes.contains("thumb-issue--comicseries") {
            continue;
        }

        let link = match card.select(&link_selector).next() {
            Some(l) => l,
            None => continue,
        };

        let href = link.value().attr("href").unwrap_or("");
        if !href.contains("/comics/series/") {
            continue;
        }

        let series_id = extract_dc_series_id(href);
        if series_id.is_empty() || seen_ids.contains(&series_id) {
            continue;
        }
        seen_ids.insert(series_id.clone());

        let title = card
            .select(&title_selector)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        if title.is_empty() {
            continue;
        }

        let cover_url = card
            .select(&source_selector)
            .next()
            .and_then(|source| source.value().attr("srcset"))
            .or_else(|| {
                card.select(&img_selector)
                    .next()
                    .and_then(|img| img.value().attr("src"))
            })
            .map(|url| {
                url.split(',')
                    .next()
                    .unwrap_or(url)
                    .split_whitespace()
                    .next()
                    .unwrap_or(url)
                    .to_string()
            })
            .unwrap_or_default();

        let slug = href
            .split('/')
            .filter(|s| !s.is_empty())
            .nth(2)
            .unwrap_or("");
        let year = regex::Regex::new(r"(\d{4})")
            .ok()
            .and_then(|re| re.captures(slug))
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string());

        results.push(DCInfiniteSeries {
            id: series_id,
            title,
            description: String::new(),
            cover_url,
            start_year: year.clone(),
            end_year: year,
            issue_count: None,
        });
    }

    tracing::info!("Found {} DC series for query: {}", results.len(), query);
    Ok(results)
}

/// Get detailed information about a specific DC comic.
#[tauri::command]
pub async fn get_dc_comic_details(
    comic_id: String,
    cookies: HashMap<String, String>,
) -> Result<DCInfiniteComic, String> {
    tracing::info!("Fetching DC comic details: {}", comic_id);

    let detail_url = format!(
        "https://www.dcuniverseinfinite.com/comics/book/comic/{}",
        comic_id
    );

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_dc_page_with_cookies(&detail_url, &cookies_clone, "img")
    })
    .await
    .map_err(|e| format!("DC detail render task join error: {:?}", e))?
    .map_err(|e| format!("DC detail render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);

    let title = document
        .select(&Selector::parse("h1, h2").unwrap())
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| format!("DC Comic {}", &comic_id[..8]));

    let source_selector = Selector::parse("source[srcset]").unwrap();
    let img_selector = Selector::parse("img").unwrap();

    let cover_url = document
        .select(&source_selector)
        .next()
        .and_then(|source| source.value().attr("srcset"))
        .or_else(|| {
            document
                .select(&img_selector)
                .filter(|img| {
                    let src = img.value().attr("src").unwrap_or("");
                    let alt = img.value().attr("alt").unwrap_or("");
                    src.contains("imgix-media.wbdndc.net")
                        || src.contains("dcuniverseinfinite")
                        || (!alt.is_empty() && alt.len() > 5)
                })
                .next()
                .and_then(|img| {
                    img.value()
                        .attr("srcset")
                        .or_else(|| img.value().attr("src"))
                        .or_else(|| img.value().attr("data-src"))
                })
        })
        .map(|url| {
            url.split(',')
                .next()
                .unwrap_or(url)
                .split_whitespace()
                .next()
                .unwrap_or(url)
                .to_string()
        })
        .unwrap_or_default();

    let desc_selector = Selector::parse("p, [class*='description'], [class*='synopsis']").unwrap();
    let description = document
        .select(&desc_selector)
        .filter(|el| {
            let text = el.text().collect::<String>();
            text.len() > 50
        })
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let issue_number = extract_dc_issue_number(&title);

    let series_title = if !issue_number.is_empty() {
        title
            .replace(&format!(" #{}", issue_number), "")
            .trim()
            .to_string()
    } else {
        title.clone()
    };

    Ok(DCInfiniteComic {
        id: comic_id,
        title,
        issue_number,
        description,
        cover_url,
        series_id: None,
        series_title: Some(series_title),
        creators: None,
        publish_date: None,
        page_count: None,
        rating: None,
        format: Some("Comic".to_string()),
        price: None,
    })
}

/// Get comics in a DC Infinite series.
#[tauri::command]
pub async fn get_dc_series_comics(
    series_id: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<DCInfiniteComic>, String> {
    tracing::info!("Fetching comics for DC series: {}", series_id);

    let series_url = format!(
        "https://www.dcuniverseinfinite.com/comics/series/series/{}",
        series_id
    );

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_dc_page_with_cookies(&series_url, &cookies_clone, "a[href*='/comics/book/']")
    })
    .await
    .map_err(|e| format!("DC series render task join error: {:?}", e))?
    .map_err(|e| format!("DC series render error: {}", e))?;

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

        if title.is_empty() || comic_id.is_empty() {
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
            series_id: Some(series_id.clone()),
            series_title: None,
            creators: None,
            publish_date: None,
            page_count: None,
            rating: None,
            format: None,
            price: None,
        });
    }

    tracing::info!("Found {} comics in DC series {}", results.len(), series_id);
    Ok(results)
}

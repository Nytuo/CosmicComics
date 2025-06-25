use scraper::{Html, Selector};

use super::models::{GetComicsDetail, GetComicsDownloadLink, GetComicsPost};
use super::{build_client, classify_link, extract_post_id, parse_year_size, GETCOMICS_BASE};

/// Parse articles from an HTML document (works for both home page and search results).
pub(super) fn parse_articles(document: &Html) -> Vec<GetComicsPost> {
    let article_selector = Selector::parse("article").unwrap();
    let title_selector = Selector::parse("h1.post-title a").unwrap();
    let img_selector = Selector::parse("div.post-header-image img").unwrap();
    let category_selector = Selector::parse("a.post-category").unwrap();
    let excerpt_selector = Selector::parse("p.post-excerpt").unwrap();
    let date_selector = Selector::parse("time").unwrap();

    let mut results: Vec<GetComicsPost> = Vec::new();

    for article in document.select(&article_selector) {
        let article_id = article.value().attr("id").unwrap_or("").to_string();
        let id = extract_post_id(&article_id);

        let class = article.value().attr("class").unwrap_or("");
        if !class.contains("type-post") {
            continue;
        }

        let (title, post_url) = match article.select(&title_selector).next() {
            Some(el) => {
                let t = el.text().collect::<String>().trim().to_string();
                let u = el.value().attr("href").unwrap_or("").to_string();
                (t, u)
            }
            None => continue,
        };

        let cover_url = article
            .select(&img_selector)
            .next()
            .and_then(|el| {
                el.value()
                    .attr("src")
                    .or_else(|| el.value().attr("data-src"))
            })
            .unwrap_or("")
            .to_string();

        let category = article
            .select(&category_selector)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let description = article
            .select(&excerpt_selector)
            .next()
            .map(|el| el.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let date = article
            .select(&date_selector)
            .next()
            .and_then(|el| el.value().attr("datetime"))
            .map(|s| s.to_string());

        let full_text = article.text().collect::<String>();
        let (year, size) = parse_year_size(&full_text);

        results.push(GetComicsPost {
            id,
            title,
            description,
            cover_url,
            post_url,
            category,
            year,
            size,
            date,
        });
    }

    results
}

/// Search for comics on GetComics.
#[tauri::command]
pub async fn search_getcomics(query: String) -> Result<Vec<GetComicsPost>, String> {
    tracing::info!("Searching GetComics: {}", query);

    let client = build_client()?;
    let url = format!("{}/?s={}", GETCOMICS_BASE, urlencoding::encode(&query));

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Search request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Search failed ({}): {}", status, body));
    }

    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let document = Html::parse_document(&html);
    let results = parse_articles(&document);

    tracing::info!("Found {} search results", results.len());
    Ok(results)
}

/// Get latest comics from the GetComics home page.
#[tauri::command]
pub async fn get_getcomics_latest() -> Result<Vec<GetComicsPost>, String> {
    tracing::info!("Fetching GetComics latest comics");

    let client = build_client()?;

    let resp = client
        .get(GETCOMICS_BASE)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Failed ({}): {}", status, body));
    }

    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let document = Html::parse_document(&html);
    let results = parse_articles(&document);

    tracing::info!("Found {} latest comics", results.len());
    Ok(results)
}

/// Get detail page with download links for a specific post.
#[tauri::command]
pub async fn get_getcomics_detail(post_url: String) -> Result<GetComicsDetail, String> {
    tracing::info!("Fetching GetComics detail: {}", post_url);

    let client = build_client()?;

    let resp = client
        .get(&post_url)
        .send()
        .await
        .map_err(|e| format!("Detail request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Detail failed ({}): {}", status, body));
    }

    let html = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let document = Html::parse_document(&html);

    let title_selector = Selector::parse("h1.post-title, h1.entry-title, article h1").unwrap();
    let title = document
        .select(&title_selector)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let img_selector =
        Selector::parse("div.post-header-image img, section.post-contents img").unwrap();
    let cover_url = document
        .select(&img_selector)
        .next()
        .and_then(|el| {
            el.value()
                .attr("src")
                .or_else(|| el.value().attr("data-src"))
        })
        .unwrap_or("")
        .to_string();

    let cat_selector = Selector::parse("a.post-category").unwrap();
    let category = document
        .select(&cat_selector)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let article_selector = Selector::parse("article").unwrap();
    let id = document
        .select(&article_selector)
        .next()
        .and_then(|el| el.value().attr("id"))
        .map(|s| extract_post_id(s))
        .unwrap_or_default();

    let content_selector = Selector::parse("section.post-contents p").unwrap();
    let mut description_parts: Vec<String> = Vec::new();
    let mut year: Option<String> = None;
    let mut size: Option<String> = None;
    let mut language: Option<String> = None;
    let mut format: Option<String> = None;

    for p in document.select(&content_selector) {
        let text = p.text().collect::<String>().trim().to_string();
        if text.is_empty() {
            continue;
        }

        if text.contains("Year :") || text.contains("Year:") || text.contains("Size :") {
            let (y, s) = parse_year_size(&text);
            if y.is_some() {
                year = y;
            }
            if s.is_some() {
                size = s;
            }
            for part in text.split('|') {
                let part = part.trim();
                if let Some(l) = part
                    .strip_prefix("Language :")
                    .or_else(|| part.strip_prefix("Language:"))
                {
                    language = Some(l.trim().to_string());
                } else if let Some(f) = part
                    .strip_prefix("Image Format :")
                    .or_else(|| part.strip_prefix("Format:"))
                {
                    format = Some(f.trim().to_string());
                }
            }
        } else if !text.starts_with("•")
            && !text.contains("how-to download")
            && !text.contains("reader apps")
            && !text.contains("7-Zip")
            && !text.contains("broken links")
            && !text.contains("comic list")
        {
            description_parts.push(text);
        }
    }

    let description = description_parts.join("\n\n");

    let tag_selector = Selector::parse("footer a[rel='tag'], .post-info a[rel='tag']").unwrap();
    let tags: Vec<String> = document
        .select(&tag_selector)
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();

    let link_selector = Selector::parse(
        "section.post-contents a[class*='aio-'], section.post-contents div a[class*='aio-']",
    )
    .unwrap();

    let mut download_links: Vec<GetComicsDownloadLink> = Vec::new();

    for link_el in document.select(&link_selector) {
        let href = match link_el.value().attr("href") {
            Some(h) if !h.is_empty() => h.to_string(),
            _ => continue,
        };

        let label = link_el.text().collect::<String>().trim().to_string();
        let class = link_el.value().attr("class").unwrap_or("");
        let link_type = classify_link(class, &label, &href);

        if download_links.iter().any(|l| l.url == href) {
            continue;
        }

        download_links.push(GetComicsDownloadLink {
            label: if label.is_empty() {
                link_type.clone().to_uppercase()
            } else {
                label
            },
            url: href,
            link_type,
        });
    }

    tracing::info!(
        "Found {} download links for '{}'",
        download_links.len(),
        title
    );

    Ok(GetComicsDetail {
        id,
        title,
        description,
        cover_url,
        post_url,
        category,
        year,
        size,
        language,
        format,
        download_links,
        tags: if tags.is_empty() { None } else { Some(tags) },
    })
}

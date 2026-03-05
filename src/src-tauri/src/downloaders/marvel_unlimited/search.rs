use scraper::{Html, Selector};
use std::collections::HashMap;

use super::models::{MarvelUnlimitedComic, MarvelUnlimitedSeries};
use super::{
    extract_comic_id, extract_issue_number, extract_series_id, parse_year_range,
    render_search_page_with_cookies,
};

/// Search for comics in Marvel Unlimited — always render via headless_chrome (persistent browser).
#[tauri::command]
pub async fn search_marvel_unlimited_comics(
    query: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<MarvelUnlimitedComic>, String> {
    tracing::info!("Searching Marvel comics (headless): {}", query);

    let search_url = format!(
        "https://www.marvel.com/search?content_type=comics&offset=0&query={}",
        urlencoding::encode(&query)
    );

    tracing::debug!("Headless fetching URL: {}", search_url);

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_search_page_with_cookies(&search_url, &cookies_clone)
    })
    .await
    .map_err(|e| format!("Headless render task join error: {:?}", e))?
    .map_err(|e| format!("Headless render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);

    tracing::debug!("Rendered HTML length: {} chars", rendered_html.len());
    if rendered_html.len() > 0 {
        let preview = if rendered_html.len() > 500 {
            &rendered_html[0..500]
        } else {
            &rendered_html
        };
        tracing::debug!("HTML preview: {}", preview);
    }

    let search_container_selector = Selector::parse("ul.SearchList__Cards").unwrap();
    let card_selector = Selector::parse(".FeedCard").unwrap();
    let link_selector = Selector::parse("a.FeedCard__Thumbnail").unwrap();
    let img_selector = Selector::parse("img.FeedCard__Thumbnail__Image").unwrap();
    let category_selector = Selector::parse("p.FeedCard__Meta__Category").unwrap();
    let headline_selector = Selector::parse("p.FeedCard__Meta__Headline a").unwrap();
    let year_selector = Selector::parse("p.FeedCard__Meta__SecondaryText").unwrap();

    let mut results = Vec::new();

    let container_opt = document.select(&search_container_selector).next();

    if container_opt.is_none() {
        tracing::warn!("SearchList__Cards container not found in rendered DOM");
        let all_lists: Vec<_> = document.select(&Selector::parse("ul").unwrap()).collect();
        tracing::debug!("Found {} ul elements in document", all_lists.len());
        return Ok(results);
    }

    let container = container_opt.unwrap();
    tracing::debug!("Found search container, processing cards...");

    for card in container.select(&card_selector) {
        tracing::debug!(
            "Processing a search result card: inner_html length = {}",
            card.inner_html().len()
        );

        let category = card
            .select(&category_selector)
            .next()
            .map(|p| p.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        tracing::debug!("Card category: '{}'", category);

        if category != "comic-issue" {
            tracing::debug!("Skipping non-comic-issue card: {}", category);
            continue;
        }

        let link = card
            .select(&link_selector)
            .next()
            .and_then(|a| a.value().attr("href"))
            .unwrap_or("");

        let comic_id = extract_comic_id(link);
        let series_id = extract_series_id(link);

        let cover_url = card
            .select(&img_selector)
            .next()
            .and_then(|img| {
                let src = img.value().attr("src");
                tracing::debug!("Comic image src: {:?}", src);
                src
            })
            .filter(|s| !s.is_empty() && *s != "about:blank")
            .unwrap_or_else(|| {
                tracing::warn!("No valid image src found for comic, using default");
                "https://cdn.marvel.com/content/1x/default/media-no-img.jpg"
            })
            .to_string();

        let title = card
            .select(&headline_selector)
            .next()
            .map(|a| a.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let year = card
            .select(&year_selector)
            .next()
            .map(|p| p.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let issue_number = extract_issue_number(&title);

        let id = if !comic_id.is_empty() {
            comic_id.clone()
        } else {
            series_id.clone()
        };

        if title.is_empty() || id.is_empty() {
            tracing::debug!("Skipping card - missing title or ID");
            continue;
        }

        tracing::debug!(
            "Adding comic: {} (ID: {}, Issue: {})",
            title,
            id,
            issue_number
        );

        results.push(MarvelUnlimitedComic {
            id,
            title: title.clone(),
            issue_number,
            description: category.clone(),
            cover_url: cover_url.clone(),
            series_id: if !series_id.is_empty() {
                Some(series_id)
            } else {
                None
            },
            series_title: Some(title),
            creators: None,
            publish_date: Some(year),
            page_count: None,
            rating: None,
            format: None,
            upc: None,
            foc_date: None,
            price: None,
            extended_credits: None,
        });
    }

    tracing::info!("Found {} results for query: {}", results.len(), query);

    Ok(results)
}

/// Search for series in Marvel Unlimited — always render via headless_chrome (persistent browser).
#[tauri::command]
pub async fn search_marvel_unlimited_series(
    query: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<MarvelUnlimitedSeries>, String> {
    tracing::info!("Searching Marvel series (headless): {}", query);

    let search_url = format!(
        "https://www.marvel.com/search?content_type=comics&offset=0&query={}",
        urlencoding::encode(&query)
    );

    tracing::debug!("Headless fetching URL: {}", search_url);

    let cookies_clone = cookies.clone();
    let rendered_html = tokio::task::spawn_blocking(move || {
        render_search_page_with_cookies(&search_url, &cookies_clone)
    })
    .await
    .map_err(|e| format!("Headless render task join error: {:?}", e))?
    .map_err(|e| format!("Headless render error: {}", e))?;

    let document = Html::parse_document(&rendered_html);

    tracing::debug!(
        "Series search - Rendered HTML length: {} chars",
        rendered_html.len()
    );
    if rendered_html.len() > 0 {
        let preview = if rendered_html.len() > 500 {
            &rendered_html[0..500]
        } else {
            &rendered_html
        };
        tracing::debug!("HTML preview: {}", preview);
    }

    let search_container_selector = Selector::parse("ul.SearchList__Cards").unwrap();
    let card_selector = Selector::parse(".FeedCard").unwrap();
    let link_selector = Selector::parse("a.FeedCard__Thumbnail").unwrap();
    let img_selector = Selector::parse("img.FeedCard__Thumbnail__Image").unwrap();
    let category_selector = Selector::parse("p.FeedCard__Meta__Category").unwrap();
    let headline_selector = Selector::parse("p.FeedCard__Meta__Headline a").unwrap();
    let year_selector = Selector::parse("p.FeedCard__Meta__SecondaryText").unwrap();

    let mut results = Vec::new();

    let search_container = document.select(&search_container_selector).next();

    if search_container.is_none() {
        tracing::warn!("SearchList__Cards container not found in rendered response");
        let all_lists: Vec<_> = document.select(&Selector::parse("ul").unwrap()).collect();
        tracing::debug!("Found {} ul elements in document", all_lists.len());
        return Ok(results);
    }

    let container = search_container.unwrap();
    tracing::debug!("Found series search container, processing cards...");

    let all_cards: Vec<_> = container.select(&card_selector).collect();
    tracing::debug!("Found {} total cards in series search", all_cards.len());

    for card in all_cards {
        let category = card
            .select(&category_selector)
            .next()
            .map(|p| p.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        tracing::debug!("Card category: '{}'", category);

        if category != "comic-series" {
            tracing::debug!("Skipping non-series card: {}", category);
            continue;
        }

        let link = card
            .select(&link_selector)
            .next()
            .and_then(|a| a.value().attr("href"))
            .unwrap_or("");

        let series_id = extract_series_id(link);

        let cover_url = card
            .select(&img_selector)
            .next()
            .and_then(|img| {
                let src = img.value().attr("src");
                tracing::debug!("Series image src: {:?}", src);
                src
            })
            .filter(|s| !s.is_empty() && *s != "about:blank")
            .unwrap_or_else(|| {
                tracing::warn!("No valid image src found for series, using default");
                "https://cdn.marvel.com/content/1x/default/media-no-img.jpg"
            })
            .to_string();

        let title = card
            .select(&headline_selector)
            .next()
            .map(|a| a.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let year_text = card
            .select(&year_selector)
            .next()
            .map(|p| p.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let (start_year, end_year) = parse_year_range(&year_text);

        if title.is_empty() || series_id.is_empty() {
            tracing::debug!("Skipping series card - missing title or ID");
            continue;
        }

        tracing::debug!("Adding series: {} (ID: {})", title, series_id);

        results.push(MarvelUnlimitedSeries {
            id: series_id,
            title,
            description: category,
            cover_url,
            start_year,
            end_year,
            issue_count: None,
        });
    }

    tracing::info!(
        "Found {} series results for query: {}",
        results.len(),
        query
    );

    Ok(results)
}

/// Get detailed information about a specific comic.
#[tauri::command]
pub async fn get_marvel_comic_details(
    comic_id: String,
    cookies: HashMap<String, String>,
) -> Result<MarvelUnlimitedComic, String> {
    tracing::info!("Fetching details for Marvel comic: {}", comic_id);

    let comic_url = format!("https://www.marvel.com/comics/issue/{}/", comic_id);

    tracing::debug!("Fetching comic URL: {}", comic_url);

    let cookie_header = cookies
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("; ");

    tracing::debug!(
        "Cookie header: {}",
        if cookie_header.is_empty() {
            "(empty)"
        } else {
            &cookie_header
        }
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client
        .get(&comic_url)
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        )
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Referer", "https://www.marvel.com/")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "same-origin");

    if !cookie_header.is_empty() {
        request = request.header("Cookie", cookie_header);
        tracing::debug!("Added {} cookies to comic details request", cookies.len());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch comic page: {}", e))?;

    let html_content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let document = Html::parse_document(&html_content);

    tracing::debug!("HTML content length: {} bytes", html_content.len());

    let title_selector = Selector::parse("div.ComicMasthead__Title h1").unwrap();
    let title = document
        .select(&title_selector)
        .next()
        .map(|h1| h1.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    tracing::debug!("Extracted title: '{}'", title);

    let mut cover_url = String::new();

    let cover_selector = Selector::parse("div.ComicMasthead__ImageWrapper img").unwrap();
    if let Some(img) = document.select(&cover_selector).next() {
        if let Some(src) = img.value().attr("src") {
            cover_url = src.to_string();
        }
    }

    if cover_url.is_empty() {
        let fallback_selector = Selector::parse("div.ComicMasthead img").unwrap();
        if let Some(img) = document.select(&fallback_selector).next() {
            if let Some(src) = img.value().attr("src") {
                cover_url = src.to_string();
            }
        }
    }

    if cover_url.is_empty() {
        cover_url = "https://cdn.marvel.com/content/1x/default/media-no-img.jpg".to_string();
    }

    tracing::debug!("Extracted cover URL: {}", cover_url);

    let issue_number = extract_issue_number(&title);
    tracing::debug!("Extracted issue number: {}", issue_number);

    let series_title = if !issue_number.is_empty() {
        title
            .replace(&format!(" #{}", issue_number), "")
            .trim()
            .to_string()
    } else {
        title.clone()
    };
    tracing::debug!("Extracted series title: '{}'", series_title);

    let date_selector = Selector::parse("li.ComicMasthead__Meta_Item").unwrap();
    tracing::debug!("Looking for published date...");
    let mut publish_date = None;
    for item in document.select(&date_selector) {
        let headline_selector = Selector::parse("p.ComicMasthead__Meta_Headline").unwrap();
        let text_selector = Selector::parse("p.ComicMasthead__Meta_Text").unwrap();

        if let Some(headline) = item.select(&headline_selector).next() {
            let headline_text = headline.text().collect::<String>();
            if headline_text.contains("Published") {
                if let Some(date_elem) = item.select(&text_selector).next() {
                    publish_date = Some(date_elem.text().collect::<String>().trim().to_string());
                    tracing::debug!("Found publish date: {:?}", publish_date);
                    break;
                }
            }
        }
    }

    if publish_date.is_none() {
        tracing::warn!("No publish date found");
    }

    let creators_selector = Selector::parse("ul.ComicMasthead__Meta[data-testid='comic_masthead_creators_list'] li.ComicMasthead__Meta_Item").unwrap();
    let mut creators_map: HashMap<String, Vec<String>> = HashMap::new();

    for item in document.select(&creators_selector) {
        let role_selector = Selector::parse("p.ComicMasthead__Meta_Headline").unwrap();
        let creator_link_selector = Selector::parse("a.ComicMasthead__Meta_Creator_Link").unwrap();

        if let Some(role_elem) = item.select(&role_selector).next() {
            let role = role_elem.text().collect::<String>().trim().to_string();
            let names: Vec<String> = item
                .select(&creator_link_selector)
                .map(|a| a.text().collect::<String>().trim().to_string())
                .collect();

            if !names.is_empty() {
                creators_map
                    .entry(role)
                    .or_insert_with(Vec::new)
                    .extend(names);
            }
        }
    }

    let creators: Vec<String> = creators_map
        .iter()
        .map(|(role, names)| format!("{}: {}", role, names.join(", ")))
        .collect();

    let desc_selector = Selector::parse("span.ComicMasthead__Description").unwrap();
    let description = document
        .select(&desc_selector)
        .next()
        .map(|span| span.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let mut rating: Option<String> = None;
    let mut format: Option<String> = None;
    let mut upc: Option<String> = None;
    let mut foc_date: Option<String> = None;
    let mut price: Option<String> = None;
    let mut page_count_extracted: Option<u32> = None;
    let mut extended_credits: Vec<String> = Vec::new();

    let details_selector = Selector::parse("div.ComicIssueMoreDetails__List").unwrap();

    let details_count = document.select(&details_selector).count();
    tracing::debug!(
        "Found {} ComicIssueMoreDetails__List sections",
        details_count
    );

    for list in document.select(&details_selector) {
        let list_items_selector = Selector::parse("ul li").unwrap();

        for item in list.select(&list_items_selector) {
            let direct_spans_selector = Selector::parse("li > span").unwrap();
            let direct_spans: Vec<_> = item.select(&direct_spans_selector).collect();

            if direct_spans.len() >= 2 {
                let label = direct_spans[0]
                    .text()
                    .collect::<String>()
                    .trim()
                    .to_string();

                let creator_span_selector =
                    Selector::parse("span.ComicIssueMoreDetails__List_Creator").unwrap();
                let creator_link_selector =
                    Selector::parse("a.ComicIssueMoreDetails__List_Link").unwrap();

                let creators_in_value: Vec<String> = direct_spans[1]
                    .select(&creator_span_selector)
                    .filter_map(|creator_span| {
                        creator_span
                            .select(&creator_link_selector)
                            .next()
                            .map(|link| link.text().collect::<String>().trim().to_string())
                    })
                    .collect();

                let value = if !creators_in_value.is_empty() {
                    creators_in_value.join(", ")
                } else {
                    direct_spans[1]
                        .text()
                        .collect::<String>()
                        .trim()
                        .to_string()
                };

                tracing::debug!("Found detail: {} = {}", label, value);

                match label.as_str() {
                    "Rating:" => rating = Some(value),
                    "Format:" => format = Some(value),
                    "UPC:" => upc = Some(value),
                    "FOC Date:" => foc_date = Some(value),
                    "Price:" => price = Some(value),
                    "Page Count:" => {
                        if let Ok(count) = value.parse::<u32>() {
                            page_count_extracted = Some(count);
                            tracing::debug!("Parsed page count: {}", count);
                        }
                    }
                    "Writer:" | "Penciller:" | "Inker:" | "Colorist:" | "Letterer:" | "Editor:"
                    | "Cover Artist:" | "Colorist (Cover):" => {
                        extended_credits.push(format!("{} {}", label, value));
                    }
                    _ => {}
                }
            }
        }
    }

    tracing::debug!("Extended credits count: {}", extended_credits.len());
    tracing::debug!("Extracted metadata - Rating: {:?}, Format: {:?}, UPC: {:?}, FOC Date: {:?}, Price: {:?}, Page Count: {:?}",
        rating, format, upc, foc_date, price, page_count_extracted);

    if page_count_extracted.is_none() {
        tracing::warn!("Page count was not extracted from ComicIssueMoreDetails");
    }
    if series_title.is_empty() || series_title == title {
        tracing::warn!("Series title extraction may have failed");
    }

    let comic = MarvelUnlimitedComic {
        id: comic_id.clone(),
        title,
        issue_number,
        description,
        cover_url,
        series_id: None,
        series_title: Some(series_title),
        creators: if creators.is_empty() {
            None
        } else {
            Some(creators)
        },
        publish_date,
        page_count: page_count_extracted,
        rating,
        format,
        upc,
        foc_date,
        price,
        extended_credits: if extended_credits.is_empty() {
            None
        } else {
            Some(extended_credits)
        },
    };

    tracing::info!("Successfully fetched details for comic {}", comic_id);

    Ok(comic)
}

/// Get all comics in a series.
#[tauri::command]
pub async fn get_marvel_series_comics(
    series_id: String,
    cookies: HashMap<String, String>,
) -> Result<Vec<MarvelUnlimitedComic>, String> {
    tracing::info!("Fetching comics for Marvel series: {}", series_id);

    let series_url = format!("https://www.marvel.com/comics/series/{}/", series_id);

    tracing::debug!("Fetching series URL: {}", series_url);

    let cookie_header = cookies
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<_>>()
        .join("; ");

    tracing::debug!(
        "Cookie header: {}",
        if cookie_header.is_empty() {
            "(empty)"
        } else {
            &cookie_header
        }
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client
        .get(&series_url)
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        )
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Referer", "https://www.marvel.com/")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "same-origin");

    if !cookie_header.is_empty() {
        request = request.header("Cookie", cookie_header);
        tracing::debug!("Added {} cookies to series request", cookies.len());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch series page: {}", e))?;

    let html_content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let document = Html::parse_document(&html_content);

    let card_selector = Selector::parse("div.ComicCard").unwrap();
    let link_selector = Selector::parse("a.ComicCard__Image, a.ComicCard__Link").unwrap();
    let img_selector = Selector::parse("img").unwrap();
    let title_selector = Selector::parse("p.ComicCard__Meta__Title a").unwrap();
    let creators_selector = Selector::parse("ul.ComicCard__Meta__Creators_List li a").unwrap();

    let mut results = Vec::new();

    for card in document.select(&card_selector) {
        let issue_link = card
            .select(&link_selector)
            .next()
            .and_then(|a| a.value().attr("href"))
            .unwrap_or("");

        let comic_id = extract_comic_id(issue_link);

        let cover_url = card
            .select(&link_selector)
            .next()
            .and_then(|link| link.select(&img_selector).next())
            .and_then(|img| img.value().attr("src"))
            .unwrap_or("https://cdn.marvel.com/content/1x/default/media-no-img.jpg")
            .to_string();

        let title = card
            .select(&title_selector)
            .next()
            .map(|a| a.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        let issue_number = extract_issue_number(&title);

        let creators: Vec<String> = card
            .select(&creators_selector)
            .map(|a| a.text().collect::<String>().trim().to_string())
            .collect();

        if title.is_empty() || comic_id.is_empty() {
            continue;
        }

        results.push(MarvelUnlimitedComic {
            id: comic_id,
            title: title.clone(),
            issue_number,
            description: String::new(),
            cover_url,
            series_id: Some(series_id.clone()),
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

    tracing::info!("Found {} comics in series {}", results.len(), series_id);

    Ok(results)
}

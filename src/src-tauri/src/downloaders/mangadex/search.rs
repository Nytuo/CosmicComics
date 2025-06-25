use super::models::{MangaDexChapter, MangaDexManga};
use super::{build_client, build_cover_url, extract_description, extract_title, MANGADEX_API};

/// Parse a manga item from the API response.
pub(super) fn parse_manga(item: &serde_json::Value) -> Option<MangaDexManga> {
    let id = item.get("id")?.as_str()?.to_string();
    let attrs = item.get("attributes")?;

    let title = extract_title(attrs.get("title").unwrap_or(&serde_json::Value::Null));
    let description =
        extract_description(attrs.get("description").unwrap_or(&serde_json::Value::Null));

    let status = attrs
        .get("status")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let year = attrs.get("year").and_then(|v| v.as_u64()).map(|y| y as u32);
    let content_rating = attrs
        .get("contentRating")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let original_language = attrs
        .get("originalLanguage")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let last_chapter = attrs
        .get("lastChapter")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let last_volume = attrs
        .get("lastVolume")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let demographic_target = attrs
        .get("publicationDemographic")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let tags: Option<Vec<String>> = attrs.get("tags").and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|t| {
                    t.get("attributes")
                        .and_then(|a| a.get("name"))
                        .and_then(|n| n.get("en"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                })
                .collect()
        })
    });

    let alt_titles: Option<Vec<String>> = attrs.get("altTitles").and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|t| {
                    t.as_object().and_then(|obj| {
                        obj.values()
                            .next()
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    })
                })
                .collect()
        })
    });

    let relationships = item.get("relationships").and_then(|v| v.as_array());
    let mut authors: Vec<String> = Vec::new();
    let mut artists: Vec<String> = Vec::new();
    let mut cover_filename: Option<String> = None;

    if let Some(rels) = relationships {
        for rel in rels {
            let rel_type = rel.get("type").and_then(|v| v.as_str()).unwrap_or("");
            match rel_type {
                "author" => {
                    if let Some(name) = rel
                        .get("attributes")
                        .and_then(|a| a.get("name"))
                        .and_then(|v| v.as_str())
                    {
                        authors.push(name.to_string());
                    }
                }
                "artist" => {
                    if let Some(name) = rel
                        .get("attributes")
                        .and_then(|a| a.get("name"))
                        .and_then(|v| v.as_str())
                    {
                        artists.push(name.to_string());
                    }
                }
                "cover_art" => {
                    if let Some(fname) = rel
                        .get("attributes")
                        .and_then(|a| a.get("fileName"))
                        .and_then(|v| v.as_str())
                    {
                        cover_filename = Some(fname.to_string());
                    }
                }
                _ => {}
            }
        }
    }

    let cover_url = cover_filename
        .map(|f| build_cover_url(&id, &f))
        .unwrap_or_default();

    Some(MangaDexManga {
        id,
        title,
        alt_titles,
        description,
        cover_url,
        status,
        year,
        content_rating,
        tags,
        authors: if authors.is_empty() {
            None
        } else {
            Some(authors)
        },
        artists: if artists.is_empty() {
            None
        } else {
            Some(artists)
        },
        original_language,
        last_chapter,
        last_volume,
        demographic_target,
    })
}

/// Search for manga on MangaDex.
#[tauri::command]
pub async fn search_mangadex_manga(query: String) -> Result<Vec<MangaDexManga>, String> {
    tracing::info!("Searching MangaDex manga: {}", query);

    let client = build_client()?;

    let url = format!(
        "{}/manga?title={}&limit=20&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[relevance]=desc",
        MANGADEX_API,
        urlencoding::encode(&query)
    );

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

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse search response: {}", e))?;

    let data = body
        .get("data")
        .and_then(|v| v.as_array())
        .ok_or("No data in response")?;

    let results: Vec<MangaDexManga> = data.iter().filter_map(|item| parse_manga(item)).collect();

    tracing::info!("Found {} manga results", results.len());
    Ok(results)
}

/// Get detailed info about a specific manga.
#[tauri::command]
pub async fn get_mangadex_manga_details(manga_id: String) -> Result<MangaDexManga, String> {
    tracing::info!("Getting MangaDex manga details: {}", manga_id);

    let client = build_client()?;

    let url = format!(
        "{}/manga/{}?includes[]=cover_art&includes[]=author&includes[]=artist",
        MANGADEX_API, manga_id
    );

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Details request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Details failed ({}): {}", status, body));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse details response: {}", e))?;

    let item = body.get("data").ok_or("No data in response")?;
    parse_manga(item).ok_or_else(|| "Failed to parse manga details".to_string())
}

/// Get chapters for a manga.
#[tauri::command]
pub async fn get_mangadex_chapters(
    manga_id: String,
    language: Option<String>,
) -> Result<Vec<MangaDexChapter>, String> {
    tracing::info!("Getting MangaDex chapters for manga: {}", manga_id);

    let client = build_client()?;
    let lang = language.unwrap_or_else(|| "en".to_string());

    let mut all_chapters: Vec<MangaDexChapter> = Vec::new();
    let mut offset: u32 = 0;
    let limit: u32 = 100;

    loop {
        let url = format!(
            "{}/manga/{}/feed?translatedLanguage[]={}&limit={}&offset={}&order[chapter]=asc&includes[]=scanlation_group",
            MANGADEX_API, manga_id, lang, limit, offset
        );

        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Chapters request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Chapters failed ({}): {}", status, body));
        }

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse chapters response: {}", e))?;

        let data = body
            .get("data")
            .and_then(|v| v.as_array())
            .ok_or("No data in response")?;

        if data.is_empty() {
            break;
        }

        for item in data {
            let id = item
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let attrs = match item.get("attributes") {
                Some(a) => a,
                None => continue,
            };

            let title = attrs
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let volume = attrs
                .get("volume")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let chapter = attrs
                .get("chapter")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let pages = attrs.get("pages").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            let translated_language = attrs
                .get("translatedLanguage")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let publish_at = attrs
                .get("publishAt")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let readable_at = attrs
                .get("readableAt")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let external_url = attrs
                .get("externalUrl")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let scanlation_group = item
                .get("relationships")
                .and_then(|v| v.as_array())
                .and_then(|rels| {
                    rels.iter().find_map(|rel| {
                        if rel.get("type").and_then(|v| v.as_str()) == Some("scanlation_group") {
                            rel.get("attributes")
                                .and_then(|a| a.get("name"))
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                        } else {
                            None
                        }
                    })
                });

            all_chapters.push(MangaDexChapter {
                id,
                title,
                volume,
                chapter,
                pages,
                translated_language,
                scanlation_group,
                publish_at,
                readable_at,
                external_url,
            });
        }

        let total = body.get("total").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

        offset += limit;
        if offset >= total {
            break;
        }
    }

    tracing::info!("Found {} chapters", all_chapters.len());
    Ok(all_chapters)
}

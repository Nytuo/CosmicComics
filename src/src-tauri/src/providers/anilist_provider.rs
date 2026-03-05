use anyhow::Result;
use async_trait::async_trait;
use serde_json::json;

use std::collections::HashMap;

use super::provider_trait::{ApiCredentials, Provider, ProviderKind, SearchCandidate};
use crate::models::{BookRecord, DisplayCharacter, DisplayCreator, SeriesRecord};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::anilist_service;

pub struct AnilistProvider;

#[async_trait]
impl Provider for AnilistProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::Anilist
    }

    fn can_search_series(&self) -> bool {
        true
    }
    fn can_search_books(&self) -> bool {
        false
    }
    fn can_insert_series(&self) -> bool {
        true
    }
    fn can_refresh_series_meta(&self) -> bool {
        true
    }

    async fn search_series(
        &self,
        name: &str,
        _year: Option<i32>,
        _creds: &ApiCredentials,
    ) -> Result<Vec<SearchCandidate>> {
        let result = anilist_service::api_anilist_get_search(name)
            .await
            .map_err(|e| anyhow::anyhow!("Anilist search error: {}", e))?;

        let mut candidates = Vec::new();

        if let Some(map) = result {
            if let Some(base) = map.get("base") {
                if let Some(media_array) = base.as_array() {
                    for item in media_array.iter().take(5) {
                        let id = item["id"]
                            .as_i64()
                            .map(|i| i.to_string())
                            .unwrap_or_default();

                        let title = if let Some(english) = item["title"]["english"].as_str() {
                            english.to_string()
                        } else if let Some(romaji) = item["title"]["romaji"].as_str() {
                            romaji.to_string()
                        } else {
                            continue;
                        };

                        let cover_url = item["coverImage"]["large"].as_str().map(|s| s.to_string());
                        let description = item["description"].as_str().map(|s| s.to_string());
                        let chapters = item["chapters"].as_u64().map(|c| c as u32);

                        candidates.push(SearchCandidate {
                            provider_id: ProviderKind::Anilist,
                            external_id: id,
                            title,
                            description,
                            cover_url,
                            year: _year,
                            page_count: chapters,
                            authors: None,
                            confidence_score: 0.0,
                            metadata: item.clone(),
                        });
                    }
                }
            }
        }

        Ok(candidates)
    }

    async fn build_book_record(
        &self,
        name: &str,
        path: &str,
        _year: Option<&str>,
        _creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        let data = anilist_service::api_anilist_get(name)
            .await
            .map_err(|e| anyhow::anyhow!("Anilist API error: {}", e))?;

        if data.is_none() {
            return Ok(BookRecord {
                external_id: format!("manual_{}", name.replace(' ', "_")),
                provider_id: self.kind().id(),
                provider_name: self.kind().name().into(),
                title: name.into(),
                path: path.into(),
                ..Default::default()
            });
        }

        let data = data.unwrap();
        let base = &data["base"];

        let id = base["id"].as_i64().unwrap_or(0).to_string();
        let title = base["title"]["english"]
            .as_str()
            .or(base["title"]["romaji"].as_str())
            .unwrap_or(name)
            .to_string();
        let cover_url = base["coverImage"]["large"].as_str().map(|s| s.to_string());
        let description = base["description"].as_str().map(|s| s.to_string());
        let page_count = base["chapters"].as_i64().unwrap_or(0);

        let staff: Vec<DisplayCreator> = base["staff"]["nodes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|s| {
                        s["name"]["full"].as_str().map(|n| DisplayCreator {
                            name: n.to_string(),
                            role: None,
                            image_url: s["image"]["medium"].as_str().map(|i| i.to_string()),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = base["characters"]["nodes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| {
                        c["name"]["full"].as_str().map(|n| DisplayCharacter {
                            name: n.to_string(),
                            role: None,
                            image_url: c["image"]["medium"].as_str().map(|i| i.to_string()),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("title_romaji".into(), json!(base["title"]["romaji"]));
        extra.insert("title_native".into(), json!(base["title"]["native"]));
        extra.insert("title_english".into(), json!(base["title"]["english"]));
        extra.insert("status".into(), json!(base["status"]));
        extra.insert("genres".into(), json!(base["genres"]));
        extra.insert("mean_score".into(), json!(base["meanScore"]));
        extra.insert("site_url".into(), json!(base["siteUrl"]));
        extra.insert("banner_image".into(), json!(base["bannerImage"]));
        extra.insert("trending".into(), json!(base["trending"]));

        Ok(BookRecord {
            external_id: id,
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url,
            description,
            page_count,
            creators: staff,
            characters,
            extra,
            ..Default::default()
        })
    }

    async fn build_series_record(
        &self,
        name: &str,
        path: &str,
        _creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        let data = anilist_service::api_anilist_get(name)
            .await
            .map_err(|e| anyhow::anyhow!("Anilist API error: {}", e))?;

        if data.is_none() {
            return Ok(SeriesRecord {
                external_id: format!("manual_{}", name.replace(' ', "_")),
                provider_id: self.kind().id(),
                provider_name: self.kind().name().into(),
                title: name.into(),
                path: path.into(),
                ..Default::default()
            });
        }

        let data = data.unwrap();
        let base = &data["base"];

        let id = base["id"].as_i64().unwrap_or(0).to_string();
        let title_en = base["title"]["english"].as_str();
        let title_ro = base["title"]["romaji"].as_str();
        let title = title_en.or(title_ro).unwrap_or(name).to_string();
        let cover_url = base["coverImage"]["large"].as_str().map(|s| s.to_string());
        let bg_url = base["bannerImage"].as_str().map(|s| s.to_string());
        let description = base["description"].as_str().map(|s| s.to_string());
        let status = base["status"].as_str().map(|s| s.to_string());
        let start_date = base["startDate"].as_object().map(|d| {
            format!(
                "{}-{}-{}",
                d.get("year").and_then(|v| v.as_i64()).unwrap_or(0),
                d.get("month").and_then(|v| v.as_i64()).unwrap_or(0),
                d.get("day").and_then(|v| v.as_i64()).unwrap_or(0),
            )
        });
        let end_date = base["endDate"].as_object().map(|d| {
            format!(
                "{}-{}-{}",
                d.get("year").and_then(|v| v.as_i64()).unwrap_or(0),
                d.get("month").and_then(|v| v.as_i64()).unwrap_or(0),
                d.get("day").and_then(|v| v.as_i64()).unwrap_or(0),
            )
        });
        let score = base["meanScore"].as_i64().unwrap_or(0);
        let genres: Vec<String> = base["genres"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        let volumes = base["volumes"].as_i64();
        let chapters = base["chapters"].as_i64();

        let staff: Vec<DisplayCreator> = base["staff"]["nodes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|s| {
                        s["name"]["full"].as_str().map(|n| DisplayCreator {
                            name: n.to_string(),
                            role: None,
                            image_url: s["image"]["medium"].as_str().map(|i| i.to_string()),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = base["characters"]["nodes"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| {
                        c["name"]["full"].as_str().map(|n| DisplayCharacter {
                            name: n.to_string(),
                            role: None,
                            image_url: c["image"]["medium"].as_str().map(|i| i.to_string()),
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("title_romaji".into(), json!(base["title"]["romaji"]));
        extra.insert("title_native".into(), json!(base["title"]["native"]));
        extra.insert("title_english".into(), json!(base["title"]["english"]));
        extra.insert("trending".into(), json!(base["trending"]));
        extra.insert("site_url".into(), json!(base["siteUrl"]));

        if let Some(relations_data) = data.get("relations") {
            let mut relations_array = Vec::new();

            if let Some(nodes) = relations_data.get("nodes").and_then(|n| n.as_array()) {
                let edges = relations_data.get("edges").and_then(|e| e.as_array());

                for (i, node) in nodes.iter().enumerate() {
                    let relation_type = edges
                        .and_then(|e| e.get(i))
                        .and_then(|edge| edge.get("relationType"))
                        .and_then(|rt| rt.as_str())
                        .unwrap_or("")
                        .to_string();

                    let id = node.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                    let title_obj = node.get("title");
                    let title_str = title_obj
                        .and_then(|t| t.get("english").and_then(|v| v.as_str()))
                        .or_else(|| {
                            title_obj.and_then(|t| t.get("romaji").and_then(|v| v.as_str()))
                        })
                        .or_else(|| {
                            title_obj.and_then(|t| t.get("native").and_then(|v| v.as_str()))
                        })
                        .unwrap_or("Unknown")
                        .to_string();

                    let cover_image = node
                        .get("coverImage")
                        .and_then(|ci| ci.get("large"))
                        .and_then(|l| l.as_str())
                        .map(|s| s.to_string());

                    relations_array.push(json!({
                        "id": id,
                        "name": title_str,
                        "title": node.get("title"),
                        "coverImage": node.get("coverImage"),
                        "image": cover_image,
                        "relationType": relation_type,
                        "description": relation_type,
                        "type": node.get("type"),
                        "format": node.get("format"),
                        "siteUrl": format!("https://anilist.co/manga/{}", id),
                    }));
                }
            }
            extra.insert("relations".into(), json!(relations_array));
        }

        Ok(SeriesRecord {
            external_id: id,
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url,
            bg_url,
            description,
            status,
            start_date,
            end_date,
            score,
            genres,
            volumes,
            chapters,
            staff,
            characters,
            extra,
            ..Default::default()
        })
    }

    async fn build_series_record_from_id(
        &self,
        external_id: &str,
        path: &str,
        _creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        let media = anilist_service::api_anilist_get_by_id(external_id)
            .await
            .map_err(|e| anyhow::anyhow!("Anilist API error: {}", e))?;

        if media.is_none() {
            return Err(anyhow::anyhow!("Series not found for ID: {}", external_id));
        }

        let media = media.unwrap();

        let cover_url = media.cover_image.as_ref().and_then(|c| c.large.clone());
        let bg_url = media.banner_image.clone();
        let description = media.description.clone();
        let status = media.status.clone();

        let start_date = media.start_date.as_ref().map(|d| {
            format!(
                "{}-{}-{}",
                d.year.unwrap_or(0),
                d.month.unwrap_or(0),
                d.day.unwrap_or(0),
            )
        });

        let end_date = media.end_date.as_ref().map(|d| {
            format!(
                "{}-{}-{}",
                d.year.unwrap_or(0),
                d.month.unwrap_or(0),
                d.day.unwrap_or(0),
            )
        });

        let score = media.mean_score.unwrap_or(0) as i64;
        let genres = media.genres.clone().unwrap_or_default();
        let volumes = media.volumes.map(|v| v as i64);
        let chapters = media.chapters.map(|c| c as i64);

        let staff: Vec<DisplayCreator> = media
            .staff
            .nodes
            .iter()
            .map(|s| DisplayCreator {
                name: s.name.full.clone().unwrap_or_default(),
                role: None,
                image_url: s.image.as_ref().and_then(|i| i.medium.clone()),
            })
            .collect();

        let characters: Vec<DisplayCharacter> = media
            .characters
            .nodes
            .iter()
            .map(|c| DisplayCharacter {
                name: c.name.full.clone().unwrap_or_default(),
                role: None,
                image_url: c.image.as_ref().and_then(|i| i.medium.clone()),
            })
            .collect();

        let title = media
            .title
            .english
            .clone()
            .or(media.title.romaji.clone())
            .unwrap_or_else(|| format!("Anilist {}", external_id));

        let mut extra = HashMap::new();
        extra.insert("title_romaji".into(), json!(media.title.romaji));
        extra.insert("title_native".into(), json!(media.title.native));
        extra.insert("title_english".into(), json!(media.title.english));
        extra.insert("trending".into(), json!(media.trending));
        extra.insert("site_url".into(), json!(media.site_url));

        let mut relations_array = Vec::new();
        for (i, node) in media.relations.nodes.iter().enumerate() {
            let relation_type = media
                .relations
                .edges
                .get(i)
                .and_then(|edge| edge.relation_type.clone())
                .unwrap_or_default();

            let title_str = node
                .title
                .english
                .clone()
                .or_else(|| node.title.romaji.clone())
                .or_else(|| node.title.native.clone())
                .unwrap_or_else(|| format!("Relation {}", node.id));

            relations_array.push(json!({
                "id": node.id,
                "name": title_str,
                "title": {
                    "romaji": node.title.romaji,
                    "english": node.title.english,
                    "native": node.title.native,
                },
                "coverImage": node.cover_image,
                "image": node.cover_image.as_ref().and_then(|img| img.large.clone()),
                "relationType": relation_type,
                "description": relation_type,
                "type": node.r#type,
                "format": node.format,
                "siteUrl": format!("https://anilist.co/manga/{}", node.id),
            }));
        }
        extra.insert("relations".into(), json!(relations_array));

        Ok(SeriesRecord {
            external_id: external_id.to_string(),
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url,
            bg_url,
            description,
            status,
            start_date,
            end_date,
            score,
            genres,
            volumes,
            chapters,
            staff,
            characters,
            extra,
            ..Default::default()
        })
    }

    async fn refresh_series_meta_surreal(
        &self,
        db: &SurrealRepo,
        series_id: &str,
        _creds: &ApiCredentials,
    ) -> Result<()> {
        let series = db
            .get_series_by_id(series_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Series not found: {}", series_id))?;

        let res = anilist_service::api_anilist_get_by_id(&series.external_id)
            .await
            .map_err(|e| anyhow::anyhow!("Anilist API error: {}", e))?;

        let media = res.ok_or_else(|| anyhow::anyhow!("No media found for ID: {}", series_id))?;

        let raw_cover = media.cover_image.as_ref().and_then(|c| c.large.clone());
        let cover = if let Some(ref url) = raw_cover {
            match crate::services::archive_service::download_image_to_disk(
                url,
                &db.covers_dir,
                &format!("anilist_s_{}", series_id),
            )
            .await
            {
                Ok(path) => Some(path),
                Err(_) => raw_cover.clone(),
            }
        } else {
            None
        };
        let bg = media.banner_image.clone();

        let staff: Vec<DisplayCreator> = media
            .staff
            .nodes
            .iter()
            .map(|s| DisplayCreator {
                name: s.name.full.clone().unwrap_or_default(),
                role: None,
                image_url: s.image.as_ref().and_then(|i| i.medium.clone()),
            })
            .collect();

        let characters: Vec<DisplayCharacter> = media
            .characters
            .nodes
            .iter()
            .map(|c| DisplayCharacter {
                name: c.name.full.clone().unwrap_or_default(),
                role: None,
                image_url: c.image.as_ref().and_then(|i| i.medium.clone()),
            })
            .collect();

        let genres: Vec<String> = media.genres.unwrap_or_default();

        let title = media
            .title
            .english
            .clone()
            .or_else(|| media.title.romaji.clone())
            .or_else(|| media.title.native.clone())
            .unwrap_or_else(|| format!("Anilist {}", series_id));

        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(title));
        fields.insert("cover_url".into(), json!(cover));
        fields.insert("bg_url".into(), json!(bg));
        fields.insert("description".into(), json!(media.description));
        fields.insert("status".into(), json!(media.status));
        fields.insert("score".into(), json!(media.mean_score.unwrap_or(0)));
        fields.insert("genres".into(), serde_json::to_value(&genres)?);
        fields.insert("volumes".into(), json!(media.volumes));
        fields.insert("chapters".into(), json!(media.chapters));
        fields.insert("staff".into(), serde_json::to_value(&staff)?);
        fields.insert("characters".into(), serde_json::to_value(&characters)?);
        fields.insert("extra.trending".into(), json!(media.trending));
        fields.insert("extra.site_url".into(), json!(media.site_url));

        db.update_series_fields(series_id, fields).await?;
        Ok(())
    }
}

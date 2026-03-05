use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::collections::HashMap;

use super::provider_trait::{ApiCredentials, Provider, ProviderKind, SearchCandidate};
use crate::models::{BookRecord, DisplayCharacter, DisplayCreator, SeriesRecord};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::marvel_service;

pub struct MarvelProvider;

#[async_trait]
impl Provider for MarvelProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::Marvel
    }

    fn can_search_series(&self) -> bool {
        true
    }
    fn can_search_books(&self) -> bool {
        true
    }
    fn can_insert_series(&self) -> bool {
        true
    }
    fn can_refresh_book_meta(&self) -> bool {
        true
    }
    fn can_refresh_series_meta(&self) -> bool {
        true
    }

    async fn search_series(
        &self,
        name: &str,
        year: Option<i32>,
        creds: &ApiCredentials,
    ) -> Result<Vec<SearchCandidate>> {
        let result = marvel_service::get_marvel_api_search(
            name,
            year.map(|y| y.to_string()),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await?;

        let mut candidates = Vec::new();

        if let Some(results) = result["data"]["results"].as_array() {
            for item in results.iter().take(5) {
                let id = item["id"]
                    .as_u64()
                    .map(|i| i.to_string())
                    .unwrap_or_default();
                let title = item["title"].as_str().unwrap_or("").to_string();
                let description = item["description"].as_str().map(|s| s.to_string());
                let cover_url = if let (Some(path), Some(ext)) = (
                    item["thumbnail"]["path"].as_str(),
                    item["thumbnail"]["extension"].as_str(),
                ) {
                    Some(format!("{}.{}", path, ext))
                } else {
                    None
                };
                let start_year = item["startYear"].as_i64().map(|y| y as i32);

                candidates.push(SearchCandidate {
                    provider_id: ProviderKind::Marvel,
                    external_id: id,
                    title,
                    description,
                    cover_url,
                    year: start_year,
                    page_count: None,
                    authors: None,
                    confidence_score: 0.0,
                    metadata: item.clone(),
                });
            }
        }

        Ok(candidates)
    }

    async fn search_books(
        &self,
        name: &str,
        year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<Value> {
        marvel_service::get_marvel_api_search(
            name,
            year.map(|y| y.to_string()),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
    }

    async fn build_book_record(
        &self,
        name: &str,
        path: &str,
        year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        let data = marvel_service::get_marvel_api_search(
            name,
            year.map(|y| y.to_string()),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await?;

        let item = data["data"]["results"]
            .as_array()
            .and_then(|a| a.first())
            .cloned()
            .unwrap_or(Value::Null);

        if item.is_null() {
            return Ok(BookRecord {
                external_id: format!("manual_{}", name.replace(' ', "_")),
                provider_id: self.kind().id(),
                provider_name: self.kind().name().into(),
                title: name.into(),
                path: path.into(),
                ..Default::default()
            });
        }

        let id = item["id"].as_u64().unwrap_or(0).to_string();
        let title = item["title"].as_str().unwrap_or(name).to_string();
        let cover_url = item["thumbnail"]["path"]
            .as_str()
            .zip(item["thumbnail"]["extension"].as_str())
            .map(|(p, e)| format!("{}/detail.{}", p, e));
        let description = item["description"].as_str().map(|s| s.to_string());
        let issue_number = item["issueNumber"].as_f64().map(|n| n.to_string());
        let format = item["format"].as_str().map(|s| s.to_string());
        let page_count = item["pageCount"].as_i64().unwrap_or(0);

        let creators = item["creators"]["items"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| {
                        c["name"].as_str().map(|name| DisplayCreator {
                            name: name.to_string(),
                            role: c["role"].as_str().map(|r| r.to_string()),
                            image_url: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters = item["characters"]["items"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| {
                        c["name"].as_str().map(|name| DisplayCharacter {
                            name: name.to_string(),
                            role: c["role"].as_str().map(|r| r.to_string()),
                            image_url: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("urls".into(), item["urls"].clone());
        extra.insert("dates".into(), item["dates"].clone());
        extra.insert("prices".into(), item["prices"].clone());
        extra.insert("series".into(), item["series"].clone());
        extra.insert("variants".into(), item["variants"].clone());
        extra.insert("collections".into(), item["collections"].clone());
        extra.insert("collected_issues".into(), item["collectedIssues"].clone());
        extra.insert("events".into(), item["events"].clone());
        extra.insert("stories".into(), item["stories"].clone());
        extra.insert("isbn".into(), json!(item["isbn"]));
        extra.insert("upc".into(), json!(item["upc"]));
        extra.insert("diamond_code".into(), json!(item["diamondCode"]));
        extra.insert("digital_id".into(), json!(item["digitalId"]));

        Ok(BookRecord {
            external_id: id,
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url,
            description,
            issue_number,
            format,
            page_count,
            creators,
            characters,
            extra,
            ..Default::default()
        })
    }

    async fn build_series_record(
        &self,
        name: &str,
        path: &str,
        creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        let data = marvel_service::api_marvel_get(
            name,
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await?;

        let total = data["data"]["total"].as_str();
        if total == Some("0")
            || data["data"]["results"]
                .as_array()
                .map(|a| a.is_empty())
                .unwrap_or(true)
        {
            return Ok(SeriesRecord {
                external_id: format!("manual_{}", name.replace(' ', "_")),
                provider_id: self.kind().id(),
                provider_name: self.kind().name().into(),
                title: name.into(),
                path: path.into(),
                ..Default::default()
            });
        }

        let item = &data["data"]["results"][0];
        let id = item["id"].as_u64().unwrap_or(0).to_string();
        let title = item["title"].as_str().unwrap_or(name).to_string();
        let cover_url = item["thumbnail"]["path"]
            .as_str()
            .zip(item["thumbnail"]["extension"].as_str())
            .map(|(p, e)| format!("{}.{}", p, e));
        let description = item["description"].as_str().map(|s| s.to_string());
        let start_date = item["startYear"].as_i64().map(|y| y.to_string());
        let end_date = item["endYear"].as_i64().map(|y| y.to_string());
        let chapters = item["comics"]["available"].as_i64();

        let staff = item["creators"]["items"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| {
                        c["name"].as_str().map(|n| DisplayCreator {
                            name: n.to_string(),
                            role: c["role"].as_str().map(|r| r.to_string()),
                            image_url: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters = item["characters"]["items"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| {
                        c["name"].as_str().map(|n| DisplayCharacter {
                            name: n.to_string(),
                            role: None,
                            image_url: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("urls".into(), item["urls"].clone());
        extra.insert("rating".into(), item["rating"].clone());
        extra.insert("comics_items".into(), item["comics"]["items"].clone());

        let raw_id = item["id"]
            .as_u64()
            .map(|i| i.to_string())
            .unwrap_or_default();
        if let Ok(creators_data) = marvel_service::get_marvel_api_creators(
            &raw_id,
            Some("series"),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
        {
            extra.insert(
                "full_creators".into(),
                creators_data["data"]["results"].clone(),
            );
        }
        if let Ok(characters_data) = marvel_service::get_marvel_api_characters(
            &raw_id,
            Some("series"),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
        {
            extra.insert(
                "full_characters".into(),
                characters_data["data"]["results"].clone(),
            );
        }
        if let Ok(relations_data) = marvel_service::get_marvel_api_relations(
            &raw_id,
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
        {
            extra.insert(
                "relations".into(),
                relations_data["data"]["results"].clone(),
            );
        }

        Ok(SeriesRecord {
            external_id: id,
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url: cover_url.clone(),
            bg_url: cover_url,
            description,
            start_date,
            end_date,
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
        creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        let series = marvel_service::get_marvel_api_series_by_id(
            external_id,
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await?;

        let id = series.id.to_string();
        let title = series.title.clone();
        let cover_url = series
            .thumbnail
            .as_ref()
            .map(|t| format!("{}.{}", t.path, t.extension));
        let description = series.description.clone();
        let start_date = Some(series.start_year.to_string());
        let end_date = Some(series.end_year.to_string());
        let chapters = Some(series.comics.available as i64);

        let staff = series
            .creators
            .items
            .iter()
            .map(|c| DisplayCreator {
                name: c.name.clone(),
                role: None,
                image_url: None,
            })
            .collect();

        let characters = series
            .characters
            .items
            .iter()
            .map(|c| DisplayCharacter {
                name: c.name.clone(),
                role: None,
                image_url: None,
            })
            .collect();

        let mut extra = HashMap::new();
        extra.insert("urls".into(), json!(series.urls));
        extra.insert("rating".into(), json!(series.rating));
        extra.insert("comics_items".into(), json!(series.comics.items));

        if let Ok(creators_data) = marvel_service::get_marvel_api_creators(
            external_id,
            Some("series"),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
        {
            extra.insert(
                "full_creators".into(),
                creators_data["data"]["results"].clone(),
            );
        }
        if let Ok(characters_data) = marvel_service::get_marvel_api_characters(
            external_id,
            Some("series"),
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
        {
            extra.insert(
                "full_characters".into(),
                characters_data["data"]["results"].clone(),
            );
        }
        if let Ok(relations_data) = marvel_service::get_marvel_api_relations(
            external_id,
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await
        {
            extra.insert(
                "relations".into(),
                relations_data["data"]["results"].clone(),
            );
        }

        Ok(SeriesRecord {
            external_id: id,
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url: cover_url.clone(),
            bg_url: cover_url,
            description,
            start_date,
            end_date,
            chapters,
            staff,
            characters,
            extra,
            ..Default::default()
        })
    }

    async fn refresh_book_meta_surreal(
        &self,
        db: &SurrealRepo,
        book_id: &str,
        creds: &ApiCredentials,
    ) -> Result<()> {
        let book = db
            .get_book_by_id(book_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Book not found: {}", book_id))?;

        let result = marvel_service::get_marvel_api_comics_by_id(
            &book.external_id,
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await?;

        let raw_cover_url = format!(
            "{}/detail.{}",
            result.thumbnail.path, result.thumbnail.extension
        );
        let cover_url = crate::services::archive_service::download_image_to_disk(
            &raw_cover_url,
            &db.covers_dir,
            &format!("marvel_{}", book.external_id),
        )
        .await
        .unwrap_or_else(|_| raw_cover_url);

        let creators: Vec<DisplayCreator> = result
            .creators
            .items
            .iter()
            .map(|c| DisplayCreator {
                name: c.name.clone(),
                role: None,
                image_url: None,
            })
            .collect();

        let characters: Vec<DisplayCharacter> = result
            .characters
            .items
            .iter()
            .map(|c| DisplayCharacter {
                name: c.name.clone(),
                role: None,
                image_url: None,
            })
            .collect();

        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(result.title));
        fields.insert("cover_url".into(), json!(cover_url));
        fields.insert("description".into(), json!(result.description));
        fields.insert(
            "issue_number".into(),
            json!(result.issue_number.to_string()),
        );
        fields.insert("format".into(), json!(result.format));
        fields.insert("page_count".into(), json!(result.page_count));
        fields.insert("creators".into(), serde_json::to_value(&creators)?);
        fields.insert("characters".into(), serde_json::to_value(&characters)?);
        // Extra fields
        fields.insert("extra.urls".into(), json!(result.urls));
        fields.insert("extra.dates".into(), json!(result.dates));
        fields.insert("extra.prices".into(), json!(result.prices));
        fields.insert("extra.series".into(), json!(result.series));
        fields.insert("extra.variants".into(), json!(result.variants));
        fields.insert("extra.collections".into(), json!(result.collections));
        fields.insert(
            "extra.collected_issues".into(),
            json!(result.collected_issues),
        );

        db.update_book_fields(book_id, fields).await?;
        Ok(())
    }

    async fn refresh_series_meta_surreal(
        &self,
        db: &SurrealRepo,
        series_id: &str,
        creds: &ApiCredentials,
    ) -> Result<()> {
        let series = db
            .get_series_by_id(series_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Series not found: {}", series_id))?;

        let res = marvel_service::get_marvel_api_series_by_id(
            &series.external_id,
            &creds.marvel_private_key,
            &creds.marvel_public_key,
        )
        .await?;

        let raw_cover = res
            .thumbnail
            .as_ref()
            .map(|t| format!("{}.{}", t.path, t.extension));
        let cover = if let Some(ref url) = raw_cover {
            match crate::services::archive_service::download_image_to_disk(
                url,
                &db.covers_dir,
                &format!("marvel_s_{}", series.external_id),
            )
            .await
            {
                Ok(path) => Some(path),
                Err(_) => raw_cover.clone(),
            }
        } else {
            None
        };

        let staff: Vec<DisplayCreator> = res
            .creators
            .items
            .iter()
            .map(|c| DisplayCreator {
                name: c.name.clone(),
                role: None,
                image_url: None,
            })
            .collect();

        let characters: Vec<DisplayCharacter> = res
            .characters
            .items
            .iter()
            .map(|c| DisplayCharacter {
                name: c.name.clone(),
                role: None,
                image_url: None,
            })
            .collect();

        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(res.title));
        fields.insert("cover_url".into(), json!(cover));
        fields.insert("bg_url".into(), json!(cover));
        fields.insert("description".into(), json!(res.description));
        fields.insert("start_date".into(), json!(res.start_year.to_string()));
        fields.insert("end_date".into(), json!(res.end_year.to_string()));
        fields.insert("chapters".into(), json!(res.comics.available));
        fields.insert("staff".into(), serde_json::to_value(&staff)?);
        fields.insert("characters".into(), serde_json::to_value(&characters)?);
        fields.insert("extra.urls".into(), json!(res.urls));
        fields.insert("extra.rating".into(), json!(res.rating));

        db.update_series_fields(series_id, fields).await?;
        Ok(())
    }
}

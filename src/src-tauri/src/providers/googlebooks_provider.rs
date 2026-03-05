use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};

use std::collections::HashMap;

use super::provider_trait::{ApiCredentials, Provider, ProviderKind, SearchCandidate};
use crate::models::{BookRecord, DisplayCreator};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::googlebooks_service;

pub struct GoogleBooksProvider;

#[async_trait]
impl Provider for GoogleBooksProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::GoogleBooks
    }

    fn can_search_series(&self) -> bool {
        false
    }
    fn can_search_books(&self) -> bool {
        true
    }
    fn can_refresh_book_meta(&self) -> bool {
        true
    }

    async fn search_series(
        &self,
        name: &str,
        _year: Option<i32>,
        creds: &ApiCredentials,
    ) -> Result<Vec<SearchCandidate>> {
        let result = googlebooks_service::search_gbapi_comics_by_name(
            name,
            creds.google_books_api_key.clone(),
        )
        .await?;

        let mut candidates = Vec::new();

        if let Some(items) = result["items"].as_array() {
            for item in items.iter().take(5) {
                let id = item["id"].as_str().unwrap_or("").to_string();
                let vol_info = &item["volumeInfo"];
                let title = vol_info["title"].as_str().unwrap_or("").to_string();
                let description = vol_info["description"].as_str().map(|s| s.to_string());
                let page_count = vol_info["pageCount"].as_u64().map(|p| p as u32);
                let cover_url = vol_info["imageLinks"]["thumbnail"]
                    .as_str()
                    .map(|s| s.to_string());
                let pub_year = vol_info["publishedDate"]
                    .as_str()
                    .and_then(|date| date.split('-').next())
                    .and_then(|y| y.parse::<i32>().ok());
                let authors = vol_info["authors"].as_array().map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                });

                candidates.push(SearchCandidate {
                    provider_id: ProviderKind::GoogleBooks,
                    external_id: id,
                    title,
                    description,
                    cover_url,
                    year: pub_year,
                    page_count,
                    authors,
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
        _year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<Value> {
        googlebooks_service::search_gbapi_comics_by_name(name, creds.google_books_api_key.clone())
            .await
    }

    async fn build_book_record(
        &self,
        name: &str,
        path: &str,
        _year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        let data = googlebooks_service::search_gbapi_comics_by_name(
            name,
            creds.google_books_api_key.clone(),
        )
        .await?;

        let item = data["items"]
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

        let id = item["id"].as_str().unwrap_or("").to_string();
        let vol = &item["volumeInfo"];
        let title = vol["title"].as_str().unwrap_or(name).to_string();
        let cover_url = vol["imageLinks"]["large"]
            .as_str()
            .or(vol["imageLinks"]["thumbnail"].as_str())
            .map(|s| s.to_string());
        let description = vol["description"].as_str().map(|s| s.to_string());
        let page_count = vol["pageCount"].as_i64().unwrap_or(0);
        let format = vol["printType"].as_str().map(|s| s.to_string());

        let creators: Vec<DisplayCreator> = vol["authors"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|a| {
                        a.as_str().map(|n| DisplayCreator {
                            name: n.to_string(),
                            role: Some("Author".into()),
                            image_url: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("publisher".into(), json!(vol["publisher"]));
        extra.insert("published_date".into(), json!(vol["publishedDate"]));
        extra.insert("language".into(), json!(vol["language"]));
        extra.insert("categories".into(), json!(vol["categories"]));
        extra.insert("average_rating".into(), json!(vol["averageRating"]));
        extra.insert("ratings_count".into(), json!(vol["ratingsCount"]));
        extra.insert("info_link".into(), json!(vol["infoLink"]));
        extra.insert("maturity_rating".into(), json!(vol["maturityRating"]));
        extra.insert("sale_info".into(), item["saleInfo"].clone());

        Ok(BookRecord {
            external_id: id,
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url,
            description,
            page_count,
            format,
            creators,
            extra,
            ..Default::default()
        })
    }

    async fn refresh_book_meta_surreal(
        &self,
        db: &SurrealRepo,
        book_id: &str,
        _creds: &ApiCredentials,
    ) -> Result<()> {
        let book = db
            .get_book_by_id(book_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Book not found: {}", book_id))?;

        let res = googlebooks_service::get_gbapi_comics_by_id(&book.external_id).await?;

        let raw_cover = res
            .volume_info
            .image_links
            .as_ref()
            .and_then(|links| links.large.clone().or_else(|| links.thumbnail.clone()));
        let cover = if let Some(ref url) = raw_cover {
            match crate::services::archive_service::download_image_to_disk(
                url,
                &db.covers_dir,
                &format!("gb_{}", book.external_id),
            )
            .await
            {
                Ok(path) => Some(path),
                Err(_) => raw_cover.clone(),
            }
        } else {
            None
        };

        let creators: Vec<DisplayCreator> = res
            .volume_info
            .authors
            .as_ref()
            .map(|arr| {
                arr.iter()
                    .map(|n| DisplayCreator {
                        name: n.clone(),
                        role: Some("Author".into()),
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let price = res
            .sale_info
            .as_ref()
            .and_then(|s| s.retail_price.as_ref())
            .map(|p| p.amount)
            .unwrap_or(0.0);

        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(res.volume_info.title));
        fields.insert("cover_url".into(), json!(cover));
        fields.insert("description".into(), json!(res.volume_info.description));
        fields.insert("format".into(), json!(res.volume_info.print_type));
        fields.insert(
            "page_count".into(),
            json!(res.volume_info.page_count.unwrap_or(0)),
        );
        fields.insert("creators".into(), serde_json::to_value(&creators)?);
        fields.insert("extra.publisher".into(), json!(res.volume_info.publisher));
        fields.insert(
            "extra.published_date".into(),
            json!(res.volume_info.published_date),
        );
        fields.insert("extra.language".into(), json!(res.volume_info.language));
        fields.insert("extra.info_link".into(), json!(res.volume_info.info_link));
        fields.insert("extra.price".into(), json!(price));

        db.update_book_fields(book_id, fields).await?;
        Ok(())
    }
}

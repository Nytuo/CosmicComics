use anyhow::Result;
use async_trait::async_trait;
use serde_json::{json, Value};

use std::collections::HashMap;

use super::provider_trait::{ApiCredentials, Provider, ProviderKind, SearchCandidate};
use crate::models::{BookRecord, DisplayCreator};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::openlibrary_service;

pub struct OpenLibraryProvider;

#[async_trait]
impl Provider for OpenLibraryProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::OpenLibrary
    }

    fn can_search_series(&self) -> bool {
        true
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
        _creds: &ApiCredentials,
    ) -> Result<Vec<SearchCandidate>> {
        let result = openlibrary_service::get_olapi_search(name).await?;

        let mut candidates = Vec::new();

        for doc in result.docs.iter().take(5) {
            if let Some(key) = &doc.key {
                let id = key.replace("/works/", "");
                let title = doc.title.clone().unwrap_or_default();
                let cover_url = doc
                    .cover_i
                    .map(|i| format!("https://covers.openlibrary.org/b/id/{}-L.jpg", i));
                let pub_year = doc.first_publish_year.map(|y| y as i32);
                let authors = doc.author_name.clone();

                candidates.push(SearchCandidate {
                    provider_id: ProviderKind::OpenLibrary,
                    external_id: id,
                    title,
                    description: None,
                    cover_url,
                    year: pub_year,
                    page_count: None,
                    authors,
                    confidence_score: 0.0,
                    metadata: serde_json::to_value(doc).unwrap_or(Value::Null),
                });
            }
        }

        Ok(candidates)
    }

    async fn search_books(
        &self,
        name: &str,
        _year: Option<&str>,
        _creds: &ApiCredentials,
    ) -> Result<Value> {
        let result = openlibrary_service::get_olapi_search(name).await?;
        Ok(serde_json::to_value(result).unwrap_or(Value::Null))
    }

    async fn build_book_record(
        &self,
        name: &str,
        path: &str,
        _year: Option<&str>,
        _creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        let search = openlibrary_service::get_olapi_search(name).await?;

        let doc = match search.docs.first() {
            Some(d) => d,
            None => {
                return Ok(BookRecord {
                    external_id: format!("manual_{}", name.replace(' ', "_")),
                    provider_id: self.kind().id(),
                    provider_name: self.kind().name().into(),
                    title: name.into(),
                    path: path.into(),
                    ..Default::default()
                });
            }
        };

        let key = doc.key.as_deref().unwrap_or("").replace("/works/", "");
        let title = doc.title.clone().unwrap_or_else(|| name.to_string());
        let cover_url = doc
            .cover_i
            .map(|i| format!("https://covers.openlibrary.org/b/id/{}-L.jpg", i));

        let creators: Vec<DisplayCreator> = doc
            .author_name
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

        let mut description = None;
        let mut page_count = 0i64;
        let mut format = None;
        let mut extra = HashMap::new();

        if let Ok(book) = openlibrary_service::get_olapi_comics_by_id(&key).await {
            description = book.details.description.clone();
            page_count = book.details.number_of_pages.unwrap_or(0) as i64;
            format = book.details.physical_format.clone();
            extra.insert("publish_date".into(), json!(book.details.publish_date));
            extra.insert("info_url".into(), json!(book.details.info_url));
            if let Some(thumb) = &book.thumbnail_url {
                extra.insert("thumbnail_url".into(), json!(thumb.replace("-S", "-L")));
            }
        }

        extra.insert("first_publish_year".into(), json!(doc.first_publish_year));
        extra.insert("edition_count".into(), json!(doc.edition_count));

        Ok(BookRecord {
            external_id: key,
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

        let res = openlibrary_service::get_olapi_comics_by_id(&book.external_id).await?;
        let details = &res.details;

        let cover_search = openlibrary_service::get_olapi_search(&details.title).await?;
        let cover_id = cover_search
            .docs
            .first()
            .and_then(|d| d.cover_i)
            .unwrap_or(0);
        let fallback_cover = format!("https://covers.openlibrary.org/b/id/{}-L.jpg", cover_id);

        let raw_cover = res
            .thumbnail_url
            .as_ref()
            .map(|u| u.replace("-S", "-L"))
            .unwrap_or(fallback_cover);
        let cover = crate::services::archive_service::download_image_to_disk(
            &raw_cover,
            &db.covers_dir,
            &format!("ol_{}", book.external_id),
        )
        .await
        .unwrap_or_else(|_| raw_cover);

        let creators: Vec<DisplayCreator> = details
            .authors
            .as_ref()
            .map(|arr| {
                arr.iter()
                    .map(|a| DisplayCreator {
                        name: a.name.clone(),
                        role: Some("Author".into()),
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(details.title));
        fields.insert("cover_url".into(), json!(cover));
        fields.insert("description".into(), json!(details.description));
        fields.insert("format".into(), json!(details.physical_format));
        fields.insert(
            "page_count".into(),
            json!(details.number_of_pages.unwrap_or(0)),
        );
        fields.insert("creators".into(), serde_json::to_value(&creators)?);
        fields.insert("extra.publish_date".into(), json!(details.publish_date));
        fields.insert("extra.info_url".into(), json!(details.info_url));

        db.update_book_fields(book_id, fields).await?;
        Ok(())
    }
}

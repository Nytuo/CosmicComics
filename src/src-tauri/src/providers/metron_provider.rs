use anyhow::Result;
use async_trait::async_trait;
use futures::future::join_all;
use serde_json::{json, Value};

use std::collections::HashMap;
use tracing::info;

use super::provider_trait::{ApiCredentials, Provider, ProviderKind, SearchCandidate};
use crate::models::{BookRecord, DisplayCharacter, DisplayCreator, SeriesRecord};
use crate::repositories::surreal_repo::SurrealRepo;
use crate::services::metron_service::{self, MetronCredentials};

pub struct MetronProvider;

/// Strip a trailing year like " (2019)" from the Metron list-endpoint series string.
fn strip_year(s: &str) -> String {
    if let Some(pos) = s.rfind(" (") {
        let suffix = &s[pos..];
        if suffix.len() == 7
            && suffix.ends_with(')')
            && suffix[2..6].chars().all(|c| c.is_ascii_digit())
        {
            return s[..pos].to_string();
        }
    }
    s.to_string()
}

impl MetronProvider {
    fn creds_from_api(creds: &ApiCredentials) -> MetronCredentials {
        MetronCredentials {
            username: creds.metron_username.clone(),
            password: creds.metron_password.clone(),
        }
    }
}

fn map_metron_status(status: &str) -> &str {
    match status.to_lowercase().as_str() {
        "continuing" | "ongoing" => "RELEASING",
        "completed" => "FINISHED",
        "cancelled" | "canceled" => "CANCELLED",
        "hiatus" => "HIATUS",
        _ => status,
    }
}

#[async_trait]
impl Provider for MetronProvider {
    fn kind(&self) -> ProviderKind {
        ProviderKind::Metron
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
        _year: Option<i32>,
        creds: &ApiCredentials,
    ) -> Result<Vec<SearchCandidate>> {
        let metron_creds = Self::creds_from_api(creds);
        let result = metron_service::search_series(name, &metron_creds).await?;

        let enriched = join_all(result.results.iter().take(10).map(|item| {
            let creds_clone = metron_creds.clone();
            let id = item.id;
            async move {
                let (detail, first_issue) = tokio::join!(
                    metron_service::get_series_detail(id, &creds_clone),
                    metron_service::get_series_first_issue(id, &creds_clone),
                );
                (detail.ok(), first_issue)
            }
        }))
        .await;

        let mut candidates = Vec::new();
        for (item, (detail, first_issue)) in result.results.iter().take(10).zip(enriched) {
            let description = detail
                .as_ref()
                .and_then(|d| d.desc.clone())
                .filter(|s| !s.is_empty());
            let cover_url = first_issue.as_ref().and_then(|i| i.image.clone());
            let authors = first_issue
                .as_ref()
                .and_then(|i| i.credits.as_ref())
                .map(|credits| {
                    credits
                        .iter()
                        .filter_map(|c| c.creator.clone())
                        .collect::<Vec<_>>()
                })
                .filter(|v| !v.is_empty());
            let title = detail
                .as_ref()
                .map(|d| d.name.clone())
                .unwrap_or_else(|| strip_year(&item.series));
            candidates.push(SearchCandidate {
                provider_id: ProviderKind::Metron,
                external_id: item.id.to_string(),
                title,
                description,
                cover_url,
                year: item.year_began.map(|y| y as i32),
                page_count: None,
                authors,
                confidence_score: 0.0,
                metadata: serde_json::to_value(&item).unwrap_or(Value::Null),
            });
        }

        Ok(candidates)
    }

    async fn search_books(
        &self,
        name: &str,
        year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<Value> {
        let metron_creds = Self::creds_from_api(creds);
        metron_service::search_issues_by_series_and_year(name, year, &metron_creds).await
    }

    async fn build_book_record(
        &self,
        name: &str,
        path: &str,
        _year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        let metron_creds = Self::creds_from_api(creds);
        let search = metron_service::search_issues(name, &metron_creds).await?;

        let issue_item = match search.results.first() {
            Some(item) => item,
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

        let detail = metron_service::get_issue_detail(issue_item.id, &metron_creds).await?;

        let series_name = detail
            .series
            .as_ref()
            .map(|s| s.name.clone())
            .unwrap_or_default();
        let issue_number = detail.number.clone().unwrap_or_else(|| "0".into());
        let title = format!("{} #{}", series_name, issue_number);

        let creators: Vec<DisplayCreator> = detail
            .credits
            .as_ref()
            .map(|creds| {
                creds
                    .iter()
                    .map(|c| {
                        let roles: Vec<String> = c
                            .role
                            .as_ref()
                            .map(|r| r.iter().filter_map(|role| role.name.clone()).collect())
                            .unwrap_or_default();
                        DisplayCreator {
                            name: c.creator.clone().unwrap_or_default(),
                            role: if roles.is_empty() {
                                None
                            } else {
                                Some(roles.join(", "))
                            },
                            image_url: None,
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = detail
            .characters
            .as_ref()
            .map(|chars| {
                chars
                    .iter()
                    .map(|c| DisplayCharacter {
                        name: c.name.clone(),
                        role: None,
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("cover_date".into(), json!(detail.cover_date));
        extra.insert("store_date".into(), json!(detail.store_date));
        extra.insert("price".into(), json!(detail.price));
        extra.insert("sku".into(), json!(detail.sku));
        extra.insert("isbn".into(), json!(detail.isbn));
        extra.insert("upc".into(), json!(detail.upc));
        extra.insert("rating".into(), json!(detail.rating));
        extra.insert("arcs".into(), json!(detail.arcs));
        extra.insert("teams".into(), json!(detail.teams));
        extra.insert("universes".into(), json!(detail.universes));
        extra.insert("variants".into(), json!(detail.variants));
        extra.insert("reprints".into(), json!(detail.reprints));
        extra.insert("resource_url".into(), json!(detail.resource_url));
        extra.insert("series_ref".into(), json!(detail.series));

        Ok(BookRecord {
            external_id: detail.id.to_string(),
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title,
            path: path.into(),
            cover_url: detail.image.clone(),
            description: detail.desc.clone(),
            issue_number: Some(issue_number),
            format: Some("Comic".into()),
            page_count: detail.page_count.map(|p| p as i64).unwrap_or(0),
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
        let metron_creds = Self::creds_from_api(creds);
        let search = metron_service::search_series(name, &metron_creds).await?;

        let series_item = match search.results.first() {
            Some(item) => item,
            None => {
                return Ok(SeriesRecord {
                    external_id: format!("manual_{}", name.replace(' ', "_")),
                    provider_id: self.kind().id(),
                    provider_name: self.kind().name().into(),
                    title: name.into(),
                    path: path.into(),
                    ..Default::default()
                });
            }
        };

        let (detail_res, first_issue) = tokio::join!(
            metron_service::get_series_detail(series_item.id, &metron_creds),
            metron_service::get_series_first_issue(series_item.id, &metron_creds),
        );
        let detail = detail_res?;

        let genres: Vec<String> = detail
            .genres
            .as_ref()
            .map(|g| {
                g.iter()
                    .filter_map(|v| {
                        v.get("name")
                            .and_then(|n| n.as_str())
                            .map(|s| s.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default();

        let status =
            Some(map_metron_status(detail.status.as_deref().unwrap_or_default()).to_string());
        let cover_url = first_issue.as_ref().and_then(|i| i.image.clone());

        let staff: Vec<DisplayCreator> = first_issue
            .as_ref()
            .and_then(|i| i.credits.as_ref())
            .map(|credits| {
                credits
                    .iter()
                    .map(|c| {
                        let roles: Vec<String> = c
                            .role
                            .as_ref()
                            .map(|r| r.iter().filter_map(|role| role.name.clone()).collect())
                            .unwrap_or_default();
                        DisplayCreator {
                            name: c.creator.clone().unwrap_or_default(),
                            role: if roles.is_empty() {
                                None
                            } else {
                                Some(roles.join(", "))
                            },
                            image_url: None,
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = first_issue
            .as_ref()
            .and_then(|i| i.characters.as_ref())
            .map(|chars| {
                chars
                    .iter()
                    .map(|c| DisplayCharacter {
                        name: c.name.clone(),
                        role: None,
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("publisher".into(), json!(detail.publisher));
        extra.insert("series_type".into(), json!(detail.series_type));
        extra.insert("sort_name".into(), json!(detail.sort_name));
        extra.insert("volume".into(), json!(detail.volume));
        extra.insert("imprint".into(), json!(detail.imprint));
        extra.insert("associated".into(), json!(detail.associated));
        extra.insert("resource_url".into(), json!(detail.resource_url));
        extra.insert("cv_id".into(), json!(detail.cv_id));
        extra.insert("gcd_id".into(), json!(detail.gcd_id));

        Ok(SeriesRecord {
            external_id: detail.id.to_string(),
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title: detail.name.clone(),
            path: path.into(),
            cover_url: cover_url.clone(),
            bg_url: cover_url,
            description: detail.desc.clone(),
            status,
            start_date: detail.year_began.map(|y| y.to_string()),
            end_date: detail.year_end.map(|y| y.to_string()),
            genres,
            chapters: detail.issue_count.map(|c| c as i64),
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
        let metron_creds = Self::creds_from_api(creds);
        let series_id = external_id
            .parse::<u64>()
            .map_err(|_| anyhow::anyhow!("Invalid Metron series ID: {}", external_id))?;

        let (detail_res, first_issue) = tokio::join!(
            metron_service::get_series_detail(series_id, &metron_creds),
            metron_service::get_series_first_issue(series_id, &metron_creds),
        );
        let detail = detail_res?;

        let genres: Vec<String> = detail
            .genres
            .as_ref()
            .map(|g| {
                g.iter()
                    .filter_map(|v| {
                        v.get("name")
                            .and_then(|n| n.as_str())
                            .map(|s| s.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default();

        let status =
            Some(map_metron_status(detail.status.as_deref().unwrap_or_default()).to_string());
        let cover_url = first_issue.as_ref().and_then(|i| i.image.clone());

        let staff: Vec<DisplayCreator> = first_issue
            .as_ref()
            .and_then(|i| i.credits.as_ref())
            .map(|credits| {
                credits
                    .iter()
                    .map(|c| {
                        let roles: Vec<String> = c
                            .role
                            .as_ref()
                            .map(|r| r.iter().filter_map(|role| role.name.clone()).collect())
                            .unwrap_or_default();
                        DisplayCreator {
                            name: c.creator.clone().unwrap_or_default(),
                            role: if roles.is_empty() {
                                None
                            } else {
                                Some(roles.join(", "))
                            },
                            image_url: None,
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = first_issue
            .as_ref()
            .and_then(|i| i.characters.as_ref())
            .map(|chars| {
                chars
                    .iter()
                    .map(|c| DisplayCharacter {
                        name: c.name.clone(),
                        role: None,
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut extra = HashMap::new();
        extra.insert("publisher".into(), json!(detail.publisher));
        extra.insert("series_type".into(), json!(detail.series_type));
        extra.insert("sort_name".into(), json!(detail.sort_name));
        extra.insert("volume".into(), json!(detail.volume));
        extra.insert("imprint".into(), json!(detail.imprint));
        extra.insert("associated".into(), json!(detail.associated));
        extra.insert("resource_url".into(), json!(detail.resource_url));
        extra.insert("cv_id".into(), json!(detail.cv_id));
        extra.insert("gcd_id".into(), json!(detail.gcd_id));

        Ok(SeriesRecord {
            external_id: detail.id.to_string(),
            provider_id: self.kind().id(),
            provider_name: self.kind().name().into(),
            title: detail.name.clone(),
            path: path.into(),
            cover_url: cover_url.clone(),
            bg_url: cover_url,
            description: detail.desc.clone(),
            status,
            start_date: detail.year_began.map(|y| y.to_string()),
            end_date: detail.year_end.map(|y| y.to_string()),
            genres,
            chapters: detail.issue_count.map(|c| c as i64),
            staff,
            characters,
            extra,
            ..Default::default()
        })
    }

    async fn insert_series_surreal(
        &self,
        db: &SurrealRepo,
        name: &str,
        path: &str,
        creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        let metron_creds = Self::creds_from_api(creds);
        let mut record = self.build_series_record(name, path, creds).await?;
        if let Some(url) = record.cover_url.clone() {
            if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
                if let Ok(disk_path) = crate::services::archive_service::download_image_to_disk(
                    &url,
                    &db.covers_dir,
                    &format!("metron_s_{}", record.external_id),
                )
                .await
                {
                    if record.bg_url.as_deref() == Some(&url) {
                        record.bg_url = Some(disk_path.clone());
                    }
                    record.cover_url = Some(disk_path);
                }
            }
        }
        let series = db.upsert_series(record).await?;

        let series_id = series.external_id.parse::<u64>().unwrap_or(0);
        if series_id > 0 {
            if let Ok(issue_list) =
                metron_service::get_series_issues(series_id, &metron_creds).await
            {
                for issue in &issue_list.results {
                    let series_display = issue
                        .series
                        .as_ref()
                        .map(|s| s.name.clone())
                        .unwrap_or_else(|| series.title.clone());
                    let number = issue.number.as_deref().unwrap_or("0");
                    let title = format!("{} #{}", series_display, number);

                    let mut placeholder = BookRecord {
                        external_id: issue.id.to_string(),
                        provider_id: self.kind().id(),
                        provider_name: self.kind().name().into(),
                        title,
                        path: String::new(),
                        cover_url: issue.image.clone(),
                        issue_number: Some(number.to_string()),
                        format: Some("Comic".into()),
                        series_id: series.id.as_ref().map(|v| v.to_string()),
                        extra: {
                            let mut e = HashMap::new();
                            e.insert("cover_date".into(), json!(issue.cover_date));
                            e.insert("store_date".into(), json!(issue.store_date));
                            e.insert("series_ref".into(), json!(issue.series));
                            e
                        },
                        ..Default::default()
                    };
                    if let Some(ref url) = placeholder.cover_url {
                        if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
                            if let Ok(path) =
                                crate::services::archive_service::download_image_to_disk(
                                    url,
                                    &db.covers_dir,
                                    &format!("metron_{}", issue.id),
                                )
                                .await
                            {
                                placeholder.cover_url = Some(path);
                            }
                        }
                    }

                    let _ = db.upsert_book(placeholder).await;
                }
                info!(
                    "Inserted {} issue placeholders for Metron series {} ({})",
                    issue_list.results.len(),
                    series_id,
                    series.title
                );
            }
        }

        Ok(series)
    }

    async fn refresh_book_meta_surreal(
        &self,
        db: &SurrealRepo,
        book_id: &str,
        creds: &ApiCredentials,
    ) -> Result<()> {
        let metron_creds = Self::creds_from_api(creds);
        let book = db
            .get_book_by_id(book_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Book not found: {}", book_id))?;

        let numeric_id = book.external_id.parse::<u64>().unwrap_or(0);
        if numeric_id == 0 {
            return Ok(());
        }

        let issue = metron_service::get_issue_detail(numeric_id, &metron_creds).await?;

        let series_name = issue
            .series
            .as_ref()
            .map(|s| s.name.clone())
            .unwrap_or_default();
        let issue_number = issue.number.clone().unwrap_or_else(|| "0".into());
        let title = format!("{} #{}", series_name, issue_number);

        let creators: Vec<DisplayCreator> = issue
            .credits
            .as_ref()
            .map(|creds| {
                creds
                    .iter()
                    .map(|c| {
                        let roles: Vec<String> = c
                            .role
                            .as_ref()
                            .map(|r| r.iter().filter_map(|role| role.name.clone()).collect())
                            .unwrap_or_default();
                        DisplayCreator {
                            name: c.creator.clone().unwrap_or_default(),
                            role: if roles.is_empty() {
                                None
                            } else {
                                Some(roles.join(", "))
                            },
                            image_url: None,
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = issue
            .characters
            .as_ref()
            .map(|chars| {
                chars
                    .iter()
                    .map(|c| DisplayCharacter {
                        name: c.name.clone(),
                        role: None,
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let cover = if let Some(ref url) = issue.image {
            match crate::services::archive_service::download_image_to_disk(
                url,
                &db.covers_dir,
                &format!("metron_{}", book.external_id),
            )
            .await
            {
                Ok(path) => Some(path),
                Err(_) => issue.image.clone(),
            }
        } else {
            None
        };
        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(title));
        fields.insert("cover_url".into(), json!(cover));
        fields.insert("description".into(), json!(issue.desc));
        fields.insert("issue_number".into(), json!(issue_number));
        fields.insert("format".into(), json!("Comic"));
        fields.insert("page_count".into(), json!(issue.page_count.unwrap_or(0)));
        fields.insert("creators".into(), serde_json::to_value(&creators)?);
        fields.insert("characters".into(), serde_json::to_value(&characters)?);
        fields.insert("extra.cover_date".into(), json!(issue.cover_date));
        fields.insert("extra.store_date".into(), json!(issue.store_date));
        fields.insert("extra.price".into(), json!(issue.price));
        fields.insert("extra.variants".into(), json!(issue.variants));
        fields.insert("extra.resource_url".into(), json!(issue.resource_url));
        fields.insert("extra.series_ref".into(), json!(issue.series));

        db.update_book_fields(book_id, fields).await?;
        Ok(())
    }

    async fn refresh_series_meta_surreal(
        &self,
        db: &SurrealRepo,
        series_id: &str,
        creds: &ApiCredentials,
    ) -> Result<()> {
        let metron_creds = Self::creds_from_api(creds);
        let series = db
            .get_series_by_id(series_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Series not found: {}", series_id))?;

        let numeric_id = series.external_id.parse::<u64>().unwrap_or(0);
        if numeric_id == 0 {
            return Ok(());
        }

        let (detail_res, first_issue) = tokio::join!(
            metron_service::get_series_detail(numeric_id, &metron_creds),
            metron_service::get_series_first_issue(numeric_id, &metron_creds),
        );
        let detail = detail_res?;

        let genres: Vec<String> = detail
            .genres
            .as_ref()
            .map(|g| {
                g.iter()
                    .filter_map(|v| {
                        v.get("name")
                            .and_then(|n| n.as_str())
                            .map(|s| s.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default();

        let status = map_metron_status(detail.status.as_deref().unwrap_or_default()).to_string();
        let cover = first_issue.as_ref().and_then(|i| i.image.clone());

        let staff: Vec<DisplayCreator> = first_issue
            .as_ref()
            .and_then(|i| i.credits.as_ref())
            .map(|credits| {
                credits
                    .iter()
                    .map(|c| {
                        let roles: Vec<String> = c
                            .role
                            .as_ref()
                            .map(|r| r.iter().filter_map(|role| role.name.clone()).collect())
                            .unwrap_or_default();
                        DisplayCreator {
                            name: c.creator.clone().unwrap_or_default(),
                            role: if roles.is_empty() {
                                None
                            } else {
                                Some(roles.join(", "))
                            },
                            image_url: None,
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        let characters: Vec<DisplayCharacter> = first_issue
            .as_ref()
            .and_then(|i| i.characters.as_ref())
            .map(|chars| {
                chars
                    .iter()
                    .map(|c| DisplayCharacter {
                        name: c.name.clone(),
                        role: None,
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut fields = HashMap::new();
        fields.insert("title".into(), json!(detail.name));
        fields.insert("cover_url".into(), json!(cover));
        fields.insert("bg_url".into(), json!(cover));
        fields.insert("description".into(), json!(detail.desc));
        fields.insert("status".into(), json!(status));
        fields.insert(
            "start_date".into(),
            json!(detail.year_began.map(|y| y.to_string())),
        );
        fields.insert(
            "end_date".into(),
            json!(detail.year_end.map(|y| y.to_string())),
        );
        fields.insert("genres".into(), serde_json::to_value(&genres)?);
        fields.insert("chapters".into(), json!(detail.issue_count));
        fields.insert("staff".into(), serde_json::to_value(&staff)?);
        fields.insert("characters".into(), serde_json::to_value(&characters)?);
        fields.insert("extra.publisher".into(), json!(detail.publisher));
        fields.insert("extra.resource_url".into(), json!(detail.resource_url));

        if let Some(ref url) = cover {
            if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
                if let Ok(path) = crate::services::archive_service::download_image_to_disk(
                    url,
                    &db.covers_dir,
                    &format!("metron_s_{}", series.external_id),
                )
                .await
                {
                    fields.insert("cover_url".into(), json!(path.clone()));
                    fields.insert("bg_url".into(), json!(path));
                }
            }
        }

        db.update_series_fields(series_id, fields).await?;

        if let Ok(issue_list) = metron_service::get_series_issues(numeric_id, &metron_creds).await {
            for issue in &issue_list.results {
                let series_display = issue
                    .series
                    .as_ref()
                    .map(|s| s.name.clone())
                    .unwrap_or_else(|| detail.name.clone());
                let number = issue.number.as_deref().unwrap_or("0");
                let title = format!("{} #{}", series_display, number);

                let mut placeholder = BookRecord {
                    external_id: issue.id.to_string(),
                    provider_id: self.kind().id(),
                    provider_name: self.kind().name().into(),
                    title,
                    path: String::new(),
                    cover_url: issue.image.clone(),
                    issue_number: Some(number.to_string()),
                    format: Some("Comic".into()),
                    series_id: Some(series_id.to_string()),
                    extra: {
                        let mut e = HashMap::new();
                        e.insert("cover_date".into(), json!(issue.cover_date));
                        e.insert("store_date".into(), json!(issue.store_date));
                        e
                    },
                    ..Default::default()
                };
                if let Some(ref url) = placeholder.cover_url {
                    if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
                        if let Ok(path) = crate::services::archive_service::download_image_to_disk(
                            url,
                            &db.covers_dir,
                            &format!("metron_{}", issue.id),
                        )
                        .await
                        {
                            placeholder.cover_url = Some(path);
                        }
                    }
                }

                let _ = db.upsert_book(placeholder).await;
            }
        }

        Ok(())
    }
}

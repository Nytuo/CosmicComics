use super::common::{
    serialize_record_id_as_string, DisplayCharacter, DisplayCreator, ReadingProgress,
};
use crate::providers::ProviderKind;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use surrealdb::RecordId;

/// The unified book document.
/// Each book has common fields + a flexible `extra` map for provider-specific data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookRecord {
    #[serde(
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_record_id_as_string"
    )]
    pub id: Option<RecordId>,
    pub external_id: String,
    pub provider_id: u8,
    pub provider_name: String,

    pub title: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    pub page_count: i64,

    pub creators: Vec<DisplayCreator>,
    pub characters: Vec<DisplayCharacter>,

    pub read: bool,
    pub reading: bool,
    pub unread: bool,
    pub favorite: bool,
    pub last_page: i64,
    pub folder: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<i64>,
    pub lock: bool,

    #[serde(default)]
    pub extra: HashMap<String, Value>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub series_id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl Default for BookRecord {
    fn default() -> Self {
        Self {
            id: None,
            external_id: String::new(),
            provider_id: ProviderKind::Manual.id(),
            provider_name: ProviderKind::Manual.name().to_string(),
            title: String::new(),
            path: String::new(),
            cover_url: None,
            description: None,
            issue_number: None,
            format: None,
            page_count: 0,
            creators: vec![],
            characters: vec![],
            read: false,
            reading: false,
            unread: true,
            favorite: false,
            last_page: 0,
            folder: false,
            note: None,
            lock: false,
            extra: HashMap::new(),
            series_id: None,
            created_at: None,
            updated_at: None,
        }
    }
}

/// The pre-parsed, display-ready book sent to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayBook {
    pub id: String,
    pub external_id: String,
    pub provider_id: u8,
    pub provider_name: String,

    pub title: String,
    pub path: String,
    pub cover_url: String,
    pub description: String,
    pub issue_number: String,
    pub format: String,
    pub page_count: i64,
    pub creators: Vec<DisplayCreator>,
    pub characters: Vec<DisplayCharacter>,

    pub read: bool,
    pub reading: bool,
    pub unread: bool,
    pub favorite: bool,
    pub note: Option<i64>,
    pub lock: bool,

    pub reading_progress: ReadingProgress,

    pub extra: HashMap<String, Value>,

    pub series_id: Option<String>,
}

impl From<BookRecord> for DisplayBook {
    fn from(r: BookRecord) -> Self {
        let pct = if r.page_count > 0 {
            ((r.last_page as f64) / (r.page_count as f64) * 100.0)
                .min(100.0)
                .round()
        } else {
            0.0
        };

        let id_str = match &r.id {
            Some(rid) => rid.to_string(),
            None => format!("{}_{}", r.external_id, r.provider_id),
        };

        DisplayBook {
            id: id_str,
            external_id: r.external_id,
            provider_id: r.provider_id,
            provider_name: r.provider_name,
            title: r.title,
            path: r.path,
            cover_url: r.cover_url.unwrap_or_default(),
            description: r.description.unwrap_or_default(),
            issue_number: r.issue_number.unwrap_or_default(),
            format: r.format.unwrap_or_default(),
            page_count: r.page_count,
            creators: r.creators,
            characters: r.characters,
            read: r.read,
            reading: r.reading,
            unread: r.unread,
            favorite: r.favorite,
            note: r.note,
            lock: r.lock,
            reading_progress: ReadingProgress {
                last_page: r.last_page,
                page_count: r.page_count,
                percentage: pct,
            },
            extra: r.extra,
            series_id: r.series_id,
        }
    }
}

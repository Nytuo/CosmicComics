use super::common::{DisplayCharacter, DisplayCreator};
use crate::providers::ProviderKind;
use serde::de::{self, Visitor};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;
use std::collections::HashMap;
use std::fmt;
use surrealdb::RecordId;

fn deserialize_flexible_title<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    struct TitleVisitor;

    impl<'de> Visitor<'de> for TitleVisitor {
        type Value = String;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a string or an Anilist title object")
        }

        fn visit_str<E: de::Error>(self, v: &str) -> Result<String, E> {
            Ok(v.to_owned())
        }

        fn visit_string<E: de::Error>(self, v: String) -> Result<String, E> {
            Ok(v)
        }

        fn visit_map<A: de::MapAccess<'de>>(self, mut map: A) -> Result<String, A::Error> {
            let mut english: Option<String> = None;
            let mut romaji: Option<String> = None;
            let mut native: Option<String> = None;

            while let Some(key) = map.next_key::<String>()? {
                match key.as_str() {
                    "english" => english = map.next_value()?,
                    "romaji" => romaji = map.next_value()?,
                    "native" => native = map.next_value()?,
                    _ => {
                        map.next_value::<Value>()?;
                    }
                }
            }

            Ok(english
                .or(romaji)
                .or(native)
                .unwrap_or_else(|| "Unknown".into()))
        }
    }

    deserializer.deserialize_any(TitleVisitor)
}

fn serialize_record_id_as_string<S>(id: &Option<RecordId>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match id {
        Some(rid) => serializer.serialize_str(&rid.to_string()),
        None => serializer.serialize_none(),
    }
}

/// The unified series document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesRecord {
    #[serde(
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_record_id_as_string"
    )]
    pub id: Option<RecordId>,
    pub external_id: String,
    pub provider_id: u8,
    pub provider_name: String,

    #[serde(deserialize_with = "deserialize_flexible_title")]
    pub title: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bg_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_date: Option<String>,
    pub score: i64,
    pub genres: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub volumes: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chapters: Option<i64>,

    pub characters: Vec<DisplayCharacter>,
    pub staff: Vec<DisplayCreator>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<i64>,
    pub favorite: bool,
    pub lock: bool,

    #[serde(default)]
    pub extra: HashMap<String, Value>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl Default for SeriesRecord {
    fn default() -> Self {
        Self {
            id: None,
            external_id: String::new(),
            provider_id: ProviderKind::Manual.id(),
            provider_name: ProviderKind::Manual.name().to_string(),
            title: String::new(),
            path: String::new(),
            cover_url: None,
            bg_url: None,
            description: None,
            status: None,
            start_date: None,
            end_date: None,
            score: 0,
            genres: vec![],
            volumes: None,
            chapters: None,
            characters: vec![],
            staff: vec![],
            note: None,
            favorite: false,
            lock: false,
            extra: HashMap::new(),
            created_at: None,
            updated_at: None,
        }
    }
}

/// Display-ready series sent to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplaySeries {
    pub id: String,
    pub external_id: String,
    pub provider_id: u8,
    pub provider_name: String,

    pub title: String,
    pub path: String,
    pub cover_url: String,
    pub bg_url: String,
    pub description: String,

    pub status: String,
    pub start_date: String,
    pub end_date: String,
    pub score: i64,
    pub genres: Vec<String>,
    pub volumes: Option<i64>,
    pub chapters: Option<i64>,

    pub characters: Vec<DisplayCharacter>,
    pub staff: Vec<DisplayCreator>,

    pub note: Option<i64>,
    pub favorite: bool,
    pub lock: bool,

    pub book_count: i64,
    pub read_count: i64,
    pub read_progress_text: String,

    pub extra: HashMap<String, Value>,
}

impl SeriesRecord {
    /// Convert to DisplaySeries with computed stats.
    pub fn into_display(self, book_count: i64, read_count: i64) -> DisplaySeries {
        let id_str = match &self.id {
            Some(rid) => rid.to_string(),
            None => format!("{}_{}", self.external_id, self.provider_id),
        };

        let progress_text = format!("{} / {} volumes read", read_count, book_count);

        DisplaySeries {
            id: id_str,
            external_id: self.external_id,
            provider_id: self.provider_id,
            provider_name: self.provider_name,
            title: self.title,
            path: self.path,
            cover_url: self.cover_url.unwrap_or_default(),
            bg_url: self.bg_url.unwrap_or_default(),
            description: self.description.unwrap_or_default(),
            status: self.status.unwrap_or_else(|| "Unknown".into()),
            start_date: self.start_date.unwrap_or_else(|| "?".into()),
            end_date: self.end_date.unwrap_or_else(|| "?".into()),
            score: self.score,
            genres: self.genres,
            volumes: self.volumes,
            chapters: self.chapters,
            characters: self.characters,
            staff: self.staff,
            note: self.note,
            favorite: self.favorite,
            lock: self.lock,
            book_count,
            read_count,
            read_progress_text: progress_text,
            extra: self.extra,
        }
    }
}

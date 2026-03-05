use serde::{Deserialize, Serialize, Serializer};
use surrealdb::RecordId;

pub(crate) fn serialize_record_id_as_string<S>(
    id: &Option<RecordId>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match id {
        Some(rid) => serializer.serialize_str(&rid.to_string()),
        None => serializer.serialize_none(),
    }
}

/// A creator (staff) with parsed, display-ready data.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DisplayCreator {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

/// A character with parsed, display-ready data.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DisplayCharacter {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
}

/// Reading progress.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ReadingProgress {
    pub last_page: i64,
    pub page_count: i64,
    pub percentage: f64,
}

/// A scan path record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanPathRecord {
    #[serde(
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_record_id_as_string"
    )]
    pub id: Option<RecordId>,
    pub name: String,
    pub path: String,
}

/// A bookmark record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkRecord {
    #[serde(
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_record_id_as_string"
    )]
    pub id: Option<RecordId>,
    pub book_id: String,
    pub path: String,
    pub page: i64,
}

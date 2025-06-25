use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::models::{BookRecord, SeriesRecord};
use crate::repositories::surreal_repo::SurrealRepo;

/// Credentials required by providers that need API keys.
#[derive(Debug, Clone, Default)]
pub struct ApiCredentials {
    pub marvel_public_key: String,
    pub marvel_private_key: String,
    pub google_books_api_key: String,
    pub open_library_api_key: String,
    pub metron_username: String,
    pub metron_password: String,
}

/// A candidate search result returned by a provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCandidate {
    pub provider_id: ProviderKind,
    pub external_id: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub year: Option<i32>,
    pub page_count: Option<u32>,
    pub authors: Option<Vec<String>>,
    pub confidence_score: f64,
    pub metadata: Value,
}

/// Enumeration of all provider kinds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum ProviderKind {
    Manual = 0,
    Marvel = 1,
    Anilist = 2,
    OpenLibrary = 3,
    GoogleBooks = 4,
    MarvelUnlimited = 5,
    Metron = 6,
    MangaDex = 7,
    GetComics = 8,
    DCInfinite = 9,
    VIZ = 10,
}

impl ProviderKind {
    pub fn from_id(id: u8) -> Option<Self> {
        match id {
            0 => Some(Self::Manual),
            1 => Some(Self::Marvel),
            2 => Some(Self::Anilist),
            3 => Some(Self::OpenLibrary),
            4 => Some(Self::GoogleBooks),
            5 => Some(Self::MarvelUnlimited),
            6 => Some(Self::Metron),
            7 => Some(Self::MangaDex),
            8 => Some(Self::GetComics),
            9 => Some(Self::DCInfinite),
            10 => Some(Self::VIZ),
            _ => None,
        }
    }

    pub fn id(&self) -> u8 {
        *self as u8
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Manual => "Manual",
            Self::Marvel => "Marvel",
            Self::Anilist => "Anilist",
            Self::OpenLibrary => "OpenLibrary",
            Self::GoogleBooks => "Google Books",
            Self::MarvelUnlimited => "Marvel Unlimited",
            Self::Metron => "Metron",
            Self::MangaDex => "MangaDex",
            Self::GetComics => "GetComics",
            Self::DCInfinite => "DC Comics Infinite",
            Self::VIZ => "VIZ Media",
        }
    }

    pub fn api_id_str(&self) -> &'static str {
        match self {
            Self::Manual => "0",
            Self::Marvel => "1",
            Self::Anilist => "2",
            Self::OpenLibrary => "3",
            Self::GoogleBooks => "4",
            Self::MarvelUnlimited => "5",
            Self::Metron => "6",
            Self::MangaDex => "7",
            Self::GetComics => "8",
            Self::DCInfinite => "9",
            Self::VIZ => "10",
        }
    }
}

impl std::fmt::Display for ProviderKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// The main provider trait. Each API provider implements this once.
#[async_trait]
pub trait Provider: Send + Sync {
    /// The kind of this provider.
    fn kind(&self) -> ProviderKind;

    /// Can this provider search for series?
    fn can_search_series(&self) -> bool {
        false
    }
    /// Can this provider search for books/comics?
    fn can_search_books(&self) -> bool {
        false
    }
    /// Can this provider insert a series into the DB from its API?
    fn can_insert_series(&self) -> bool {
        false
    }
    /// Can this provider refresh book metadata?
    fn can_refresh_book_meta(&self) -> bool {
        false
    }
    /// Can this provider refresh series metadata?
    fn can_refresh_series_meta(&self) -> bool {
        false
    }

    /// Search for series by name. Returns candidates for the matching engine.
    async fn search_series(
        &self,
        _name: &str,
        _year: Option<i32>,
        _creds: &ApiCredentials,
    ) -> Result<Vec<SearchCandidate>> {
        Ok(vec![])
    }

    /// Search for books/comics by name.
    async fn search_books(
        &self,
        _name: &str,
        _year: Option<&str>,
        _creds: &ApiCredentials,
    ) -> Result<Value> {
        Ok(Value::Null)
    }

    /// Build a BookRecord from the provider's raw API data for a given book name/path.
    /// Returns a fully-parsed, display-ready BookRecord with all provider-specific
    /// fields stored in `extra`.
    async fn build_book_record(
        &self,
        _name: &str,
        _path: &str,
        _year: Option<&str>,
        _creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        Ok(BookRecord {
            external_id: rand::random::<u32>().to_string(),
            provider_id: self.kind().id(),
            provider_name: self.kind().name().to_string(),
            title: _name.to_string(),
            path: _path.to_string(),
            ..Default::default()
        })
    }

    /// Build a SeriesRecord from the provider's raw API data.
    async fn build_series_record(
        &self,
        _name: &str,
        _path: &str,
        _creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        Ok(SeriesRecord {
            external_id: rand::random::<u32>().to_string(),
            provider_id: self.kind().id(),
            provider_name: self.kind().name().to_string(),
            title: _name.to_string(),
            path: _path.to_string(),
            ..Default::default()
        })
    }

    /// Build a SeriesRecord from an external_id (e.g., from a search result).
    /// This should fetch full details including characters, staff, etc.
    async fn build_series_record_from_id(
        &self,
        _external_id: &str,
        _path: &str,
        _creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        self.build_series_record(_external_id, _path, _creds).await
    }

    /// Insert a series into DB using this provider's API data.
    /// Downloads cover image.
    async fn insert_series_surreal(
        &self,
        db: &SurrealRepo,
        name: &str,
        path: &str,
        creds: &ApiCredentials,
    ) -> Result<SeriesRecord> {
        let mut record = self.build_series_record(name, path, creds).await?;
        if let Some(url) = record.cover_url.clone() {
            if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
                let filename = format!("{}_s_{}", self.kind().id(), record.external_id);
                if let Ok(disk_path) = crate::services::archive_service::download_image_to_disk(
                    &url,
                    &db.covers_dir,
                    &filename,
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
        db.upsert_series(record).await
    }

    /// Insert a book into DB using this provider's API data.
    /// Downloads cover image.
    async fn insert_book_surreal(
        &self,
        db: &SurrealRepo,
        name: &str,
        path: &str,
        year: Option<&str>,
        creds: &ApiCredentials,
    ) -> Result<BookRecord> {
        let mut record = self.build_book_record(name, path, year, creds).await?;
        if let Some(url) = record.cover_url.clone() {
            if !url.is_empty() && !url.starts_with('/') && !url.starts_with("data:") {
                let filename = format!("{}_b_{}", self.kind().id(), record.external_id);
                if let Ok(disk_path) = crate::services::archive_service::download_image_to_disk(
                    &url,
                    &db.covers_dir,
                    &filename,
                )
                .await
                {
                    record.cover_url = Some(disk_path);
                }
            }
        }
        db.upsert_book(record).await
    }

    /// Refresh book metadata in DB.
    async fn refresh_book_meta_surreal(
        &self,
        _db: &SurrealRepo,
        _book_id: &str,
        _creds: &ApiCredentials,
    ) -> Result<()> {
        Ok(())
    }

    /// Refresh series metadata in DB.
    async fn refresh_series_meta_surreal(
        &self,
        _db: &SurrealRepo,
        _series_id: &str,
        _creds: &ApiCredentials,
    ) -> Result<()> {
        Ok(())
    }
}

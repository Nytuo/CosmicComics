use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use surrealdb::engine::local::{Db, RocksDb};
use surrealdb::Surreal;
use tracing::{debug, error, info};

use crate::models::{
    BookRecord, BookmarkRecord, DisplayBook, DisplaySeries, ScanPathRecord, SeriesRecord,
};

/// Wrapper around the SurrealDB embedded instance.
#[derive(Clone)]
pub struct SurrealRepo {
    db: Surreal<Db>,
    pub covers_dir: String,
}

impl SurrealRepo {
    pub async fn open(base_path: &str) -> Result<Self> {
        let db_path = format!("{}/cosmiccomics_surreal", base_path);
        debug!("[SurrealRepo::open] creating dir at {}", db_path);
        std::fs::create_dir_all(Path::new(&db_path))?;

        debug!("[SurrealRepo::open] connecting to RocksDb at {}", db_path);
        let db = Surreal::new::<RocksDb>(&db_path).await?;
        debug!("[SurrealRepo::open] connected, selecting ns=cosmiccomics db=main");
        db.use_ns("cosmiccomics").use_db("main").await?;
        info!("[SurrealRepo::open] SurrealDB opened at {}", db_path);

        let covers_dir = format!("{}/covers", base_path);
        std::fs::create_dir_all(&covers_dir)?;

        let repo = SurrealRepo { db, covers_dir };
        debug!("[SurrealRepo::open] calling ensure_schema");
        repo.ensure_schema().await?;
        info!("[SurrealRepo::open] schema ensured, repo ready");
        Ok(repo)
    }

    async fn ensure_schema(&self) -> Result<()> {
        debug!("[ensure_schema] defining tables...");
        self.db
            .query("DEFINE TABLE IF NOT EXISTS book SCHEMALESS")
            .await?
            .check()
            .map_err(|e| {
                error!("[ensure_schema] DEFINE TABLE book failed: {}", e);
                e
            })?;
        debug!("[ensure_schema] table 'book' OK");
        self.db
            .query("DEFINE TABLE IF NOT EXISTS series SCHEMALESS")
            .await?
            .check()
            .map_err(|e| {
                error!("[ensure_schema] DEFINE TABLE series failed: {}", e);
                e
            })?;
        debug!("[ensure_schema] table 'series' OK");
        self.db
            .query("DEFINE TABLE IF NOT EXISTS scan_path SCHEMALESS")
            .await?
            .check()
            .map_err(|e| {
                error!("[ensure_schema] DEFINE TABLE scan_path failed: {}", e);
                e
            })?;
        debug!("[ensure_schema] table 'scan_path' OK");
        self.db
            .query("DEFINE TABLE IF NOT EXISTS bookmark SCHEMALESS")
            .await?
            .check()
            .map_err(|e| {
                error!("[ensure_schema] DEFINE TABLE bookmark failed: {}", e);
                e
            })?;
        debug!("[ensure_schema] table 'bookmark' OK");

        info!("[ensure_schema] all 4 tables defined");

        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_book_provider ON TABLE book COLUMNS provider_id")
            .await?
            .check()?;
        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_book_path ON TABLE book COLUMNS path")
            .await?
            .check()?;
        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_book_title ON TABLE book COLUMNS title")
            .await?
            .check()?;
        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_book_series ON TABLE book COLUMNS series_id")
            .await?
            .check()?;

        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_series_provider ON TABLE series COLUMNS provider_id")
            .await?
            .check()?;
        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_series_path ON TABLE series COLUMNS path")
            .await?
            .check()?;
        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_series_title ON TABLE series COLUMNS title")
            .await?
            .check()?;

        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_scanpath_path ON TABLE scan_path COLUMNS path")
            .await?
            .check()?;

        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_bookmark_book ON TABLE bookmark COLUMNS book_id")
            .await?
            .check()?;

        self.db
            .query("DEFINE TABLE IF NOT EXISTS api_credential SCHEMALESS")
            .await?
            .check()
            .map_err(|e| {
                error!("[ensure_schema] DEFINE TABLE api_credential failed: {}", e);
                e
            })?;
        self.db
            .query("DEFINE INDEX IF NOT EXISTS idx_api_cred_key ON TABLE api_credential COLUMNS key UNIQUE")
            .await?
            .check()?;

        info!("SurrealDB indexes ensured");
        Ok(())
    }

    /// Insert a new book. Returns the created record.
    pub async fn create_book(&self, book: BookRecord) -> Result<BookRecord> {
        debug!(
            "[SurrealRepo::create_book] Creating book: title='{}', characters={}, creators={}",
            book.title,
            book.characters.len(),
            book.creators.len()
        );
        let result: Option<BookRecord> = self.db.create("book").content(book).await?;
        let created = result.ok_or_else(|| anyhow::anyhow!("Failed to create book"))?;
        debug!(
            "[SurrealRepo::create_book] Created book with id={:?}, characters={}, creators={}",
            created.id,
            created.characters.len(),
            created.creators.len()
        );
        Ok(created)
    }

    /// Upsert a book by external_id + provider_id. If it exists and is not locked, update it.
    pub async fn upsert_book(&self, book: BookRecord) -> Result<BookRecord> {
        let eid = book.external_id.clone();
        let pid = book.provider_id;
        let existing: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM book WHERE external_id = $eid AND provider_id = $pid LIMIT 1")
            .bind(("eid", eid.clone()))
            .bind(("pid", pid))
            .await?
            .check()?
            .take(0)?;

        if let Some(existing_book) = existing.into_iter().next() {
            if existing_book.lock {
                info!("Book {} is locked, skipping update", eid);
                return Ok(existing_book);
            }
            let id_str = existing_book
                .id
                .as_ref()
                .map(|v| v.to_string().trim_matches('"').to_string())
                .unwrap_or_default();

            let updated: Option<BookRecord> = self
                .db
                .query("UPDATE type::thing($table, $id) MERGE $data")
                .bind(("table", "book".to_string()))
                .bind(("id", id_str))
                .bind(("data", serde_json::to_value(&book)?))
                .await?
                .check()?
                .take(0)?;
            updated.ok_or_else(|| anyhow::anyhow!("Failed to update book"))
        } else {
            self.create_book(book).await
        }
    }

    /// Get all books, ordered by title.
    pub async fn get_all_books(&self) -> Result<Vec<BookRecord>> {
        let books: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM book ORDER BY title ASC")
            .await?
            .check()?
            .take(0)?;
        Ok(books)
    }

    /// Get all books as display-ready objects.
    pub async fn get_all_display_books(&self) -> Result<Vec<DisplayBook>> {
        let books = self.get_all_books().await?;
        Ok(books.into_iter().map(DisplayBook::from).collect())
    }

    /// Get a single book by its SurrealDB record ID string.
    pub async fn get_book_by_id(&self, id: &str) -> Result<Option<BookRecord>> {
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        let books: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM type::thing('book', $id)")
            .bind(("id", id_part.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(books.into_iter().next())
    }

    /// Get a book by external_id + provider_id.
    pub async fn get_book_by_external_id(
        &self,
        external_id: &str,
        provider_id: u8,
    ) -> Result<Option<BookRecord>> {
        let books: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM book WHERE external_id = $eid AND provider_id = $pid LIMIT 1")
            .bind(("eid", external_id.to_string()))
            .bind(("pid", provider_id))
            .await?
            .check()?
            .take(0)?;
        Ok(books.into_iter().next())
    }

    /// Get books by path prefix (all books in a given folder).
    pub async fn get_books_by_path(&self, path: &str) -> Result<Vec<BookRecord>> {
        debug!(
            "[SurrealRepo::get_books_by_path] Querying for path: '{}'",
            path
        );

        let all_books: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM book LIMIT 10")
            .await?
            .check()?
            .take(0)?;
        if !all_books.is_empty() {
            debug!("[SurrealRepo::get_books_by_path] Sample of paths in DB:");
            for (i, book) in all_books.iter().take(5).enumerate() {
                debug!("  [{}] path='{}', title='{}'", i, book.path, book.title);
            }
        } else {
            debug!("[SurrealRepo::get_books_by_path] WARNING: Database is empty!");
        }

        let books: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM book WHERE path = $path OR string::starts_with(path, $prefix) ORDER BY title ASC")
            .bind(("path", path.to_string()))
            .bind(("prefix", format!("{}/", path)))
            .await?
            .check()?
            .take(0)?;
        debug!(
            "[SurrealRepo::get_books_by_path] Query returned {} books for path '{}'",
            books.len(),
            path
        );
        if !books.is_empty() {
            debug!("[SurrealRepo::get_books_by_path] First book: title='{}', characters={}, creators={}",
                books[0].title, books[0].characters.len(), books[0].creators.len());
        }
        Ok(books)
    }

    /// Get books linked to a series.
    pub async fn get_books_by_series(&self, series_id: &str) -> Result<Vec<BookRecord>> {
        let books: Vec<BookRecord> = self
            .db
            .query("SELECT * FROM book WHERE series_id = $sid ORDER BY title ASC")
            .bind(("sid", series_id.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(books)
    }

    /// Search books by title (partial match).
    pub async fn search_books(&self, query: &str) -> Result<Vec<BookRecord>> {
        let books: Vec<BookRecord> = self
            .db
            .query(
                "SELECT * FROM book WHERE string::lowercase(title) CONTAINS string::lowercase($q) ORDER BY title ASC",
            )
            .bind(("q", query.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(books)
    }

    /// Update specific fields on a book.
    pub async fn update_book_fields(&self, id: &str, fields: HashMap<String, Value>) -> Result<()> {
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        let mut query_str = String::from("UPDATE type::thing('book', $id) SET ");
        let mut bindings: Vec<(String, Value)> = vec![("id".into(), Value::String(id_part.into()))];
        let mut first = true;

        for (key, value) in &fields {
            if !first {
                query_str.push_str(", ");
            }
            let bind_key = format!("f_{}", key);
            query_str.push_str(&format!("{} = ${}", key, bind_key));
            bindings.push((bind_key, value.clone()));
            first = false;
        }

        query_str.push_str(", updated_at = time::now()");

        let mut q = self.db.query(&query_str);
        for (k, v) in bindings {
            q = q.bind((k, v));
        }
        q.await?.check()?;
        Ok(())
    }

    /// Update reading status for a book.
    pub async fn update_reading_status(
        &self,
        id: &str,
        read: bool,
        reading: bool,
        unread: bool,
    ) -> Result<()> {
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        self.db
            .query("UPDATE type::thing('book', $id) SET read = $read, reading = $reading, unread = $unread, updated_at = time::now()")
            .bind(("id", id_part.to_string()))
            .bind(("read", read))
            .bind(("reading", reading))
            .bind(("unread", unread))
            .await?
            .check()?;
        Ok(())
    }

    /// Update reading progress (last page).
    pub async fn update_reading_progress(&self, id: &str, last_page: i64) -> Result<()> {
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        self.db
            .query("UPDATE type::thing('book', $id) SET last_page = $lp, updated_at = time::now()")
            .bind(("id", id_part.to_string()))
            .bind(("lp", last_page))
            .await?
            .check()?;
        Ok(())
    }

    /// Delete a book by ID.
    pub async fn delete_book(&self, id: &str) -> Result<()> {
        debug!("[SurrealRepo::delete_book] input id='{}'", id);
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        self.db
            .query("DELETE FROM book WHERE id = type::thing('book', $id)")
            .bind(("id", id_part.to_string()))
            .await?
            .check()?;
        debug!("[SurrealRepo::delete_book] Successfully deleted book");
        Ok(())
    }

    /// Delete a book by external_id + provider_id.
    pub async fn delete_book_by_external(&self, external_id: &str, provider_id: u8) -> Result<()> {
        self.db
            .query("DELETE FROM book WHERE external_id = $eid AND provider_id = $pid")
            .bind(("eid", external_id.to_string()))
            .bind(("pid", provider_id))
            .await?
            .check()?;
        Ok(())
    }

    /// Count books.
    pub async fn count_books(&self) -> Result<i64> {
        let result: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM book GROUP ALL")
            .await?
            .check()?
            .take(0)?;
        let count = result
            .first()
            .and_then(|r| r.get("total"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        Ok(count)
    }

    pub async fn create_series(&self, series: SeriesRecord) -> Result<SeriesRecord> {
        debug!("[SurrealRepo::create_series] Creating series: title='{}', volumes={:?}, chapters={:?}, characters={}, staff={}",
            series.title, series.volumes, series.chapters, series.characters.len(), series.staff.len());
        let result: Option<SeriesRecord> = self.db.create("series").content(series).await?;
        let created = result.ok_or_else(|| anyhow::anyhow!("Failed to create series"))?;
        debug!("[SurrealRepo::create_series] Created series with id={:?}, volumes={:?}, characters={}, staff={}",
            created.id, created.volumes, created.characters.len(), created.staff.len());
        Ok(created)
    }

    pub async fn upsert_series(&self, series: SeriesRecord) -> Result<SeriesRecord> {
        let eid = series.external_id.clone();
        let pid = series.provider_id;
        let existing: Vec<SeriesRecord> = self
            .db
            .query("SELECT * FROM series WHERE external_id = $eid AND provider_id = $pid LIMIT 1")
            .bind(("eid", eid.clone()))
            .bind(("pid", pid))
            .await?
            .check()?
            .take(0)?;

        if let Some(existing_series) = existing.into_iter().next() {
            if existing_series.lock {
                info!("Series {} is locked, skipping update", eid);
                return Ok(existing_series);
            }
            let id_str = existing_series
                .id
                .as_ref()
                .map(|v| v.to_string().trim_matches('"').to_string())
                .unwrap_or_default();

            let updated: Option<SeriesRecord> = self
                .db
                .query("UPDATE type::thing($table, $id) MERGE $data")
                .bind(("table", "series".to_string()))
                .bind(("id", id_str))
                .bind(("data", serde_json::to_value(&series)?))
                .await?
                .check()?
                .take(0)?;
            updated.ok_or_else(|| anyhow::anyhow!("Failed to update series"))
        } else {
            self.create_series(series).await
        }
    }

    pub async fn get_all_series(&self) -> Result<Vec<SeriesRecord>> {
        let series: Vec<SeriesRecord> = self
            .db
            .query("SELECT * FROM series ORDER BY title ASC")
            .await?
            .check()?
            .take(0)?;
        Ok(series)
    }

    /// Get all series as display-ready objects (with computed book/read counts).
    pub async fn get_all_display_series(&self) -> Result<Vec<DisplaySeries>> {
        let all_series = self.get_all_series().await?;
        let mut result = Vec::with_capacity(all_series.len());

        for s in all_series {
            let series_id =
                s.id.as_ref()
                    .map(|v| v.to_string().trim_matches('"').to_string())
                    .unwrap_or_default();

            let book_count = self.count_books_in_series(&series_id).await.unwrap_or(0);
            let read_count = self
                .count_read_books_in_series(&series_id)
                .await
                .unwrap_or(0);
            result.push(s.into_display(book_count, read_count));
        }

        Ok(result)
    }

    pub async fn get_series_by_id(&self, id: &str) -> Result<Option<SeriesRecord>> {
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        let series: Vec<SeriesRecord> = self
            .db
            .query("SELECT * FROM type::thing('series', $id)")
            .bind(("id", id_part.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(series.into_iter().next())
    }

    pub async fn get_series_by_external_id(
        &self,
        external_id: &str,
        provider_id: u8,
    ) -> Result<Option<SeriesRecord>> {
        let series: Vec<SeriesRecord> = self
            .db
            .query("SELECT * FROM series WHERE external_id = $eid AND provider_id = $pid LIMIT 1")
            .bind(("eid", external_id.to_string()))
            .bind(("pid", provider_id))
            .await?
            .check()?
            .take(0)?;
        Ok(series.into_iter().next())
    }

    pub async fn get_series_by_path(&self, path: &str) -> Result<Option<SeriesRecord>> {
        let series: Vec<SeriesRecord> = self
            .db
            .query("SELECT * FROM series WHERE path = $path LIMIT 1")
            .bind(("path", path.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(series.into_iter().next())
    }

    pub async fn search_series(&self, query: &str) -> Result<Vec<SeriesRecord>> {
        let series: Vec<SeriesRecord> = self
            .db
            .query(
                "SELECT * FROM series WHERE string::lowercase(title) CONTAINS string::lowercase($q) ORDER BY title ASC",
            )
            .bind(("q", query.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(series)
    }

    pub async fn update_series_fields(
        &self,
        id: &str,
        fields: HashMap<String, Value>,
    ) -> Result<()> {
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        let mut query_str = String::from("UPDATE type::thing('series', $id) SET ");
        let mut bindings: Vec<(String, Value)> = vec![("id".into(), Value::String(id_part.into()))];
        let mut first = true;

        for (key, value) in &fields {
            if !first {
                query_str.push_str(", ");
            }
            let bind_key = format!("f_{}", key);
            query_str.push_str(&format!("{} = ${}", key, bind_key));
            bindings.push((bind_key, value.clone()));
            first = false;
        }

        query_str.push_str(", updated_at = time::now()");

        let mut q = self.db.query(&query_str);
        for (k, v) in bindings {
            q = q.bind((k, v));
        }
        q.await?.check()?;
        Ok(())
    }

    pub async fn delete_series(&self, id: &str) -> Result<()> {
        debug!("[SurrealRepo::delete_series] input id='{}'", id);
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        self.db
            .query("DELETE FROM book WHERE series_id = $sid")
            .bind(("sid", id.to_string()))
            .await?
            .check()?;
        self.db
            .query("DELETE FROM series WHERE id = type::thing('series', $id)")
            .bind(("id", id_part.to_string()))
            .await?
            .check()?;
        debug!("[SurrealRepo::delete_series] Successfully deleted series");
        Ok(())
    }

    pub async fn count_series(&self) -> Result<i64> {
        let result: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM series GROUP ALL")
            .await?
            .check()?
            .take(0)?;
        Ok(result
            .first()
            .and_then(|r| r.get("total"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0))
    }

    pub async fn count_books_in_series(&self, series_id: &str) -> Result<i64> {
        let result: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM book WHERE series_id = $sid GROUP ALL")
            .bind(("sid", series_id.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(result
            .first()
            .and_then(|r| r.get("total"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0))
    }

    /// Count books in a series that have a non-empty file path (i.e., real downloaded files).
    /// Used to decide whether a series rollback is safe: if this returns 0, all books are
    /// placeholders and the series can be safely deleted on failure.
    pub async fn count_books_with_real_path_in_series(&self, series_id: &str) -> Result<i64> {
        let result: Vec<HashMap<String, Value>> = self
            .db
            .query(
                "SELECT count() AS total FROM book \
                 WHERE series_id = $sid AND path != '' AND path != null GROUP ALL",
            )
            .bind(("sid", series_id.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(result
            .first()
            .and_then(|r| r.get("total"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0))
    }

    pub async fn count_read_books_in_series(&self, series_id: &str) -> Result<i64> {
        let result: Vec<HashMap<String, Value>> = self
            .db
            .query(
                "SELECT count() AS total FROM book WHERE series_id = $sid AND read = true GROUP ALL",
            )
            .bind(("sid", series_id.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(result
            .first()
            .and_then(|r| r.get("total"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0))
    }

    pub async fn create_scan_path(&self, name: &str, path: &str) -> Result<()> {
        debug!(
            "[SurrealRepo::create_scan_path] name='{}', path='{}'",
            name, path
        );
        let response = self
            .db
            .query("CREATE scan_path SET name = $name, path = $path")
            .bind(("name", name.to_string()))
            .bind(("path", path.to_string()))
            .await;
        debug!(
            "[SurrealRepo::create_scan_path] query .await result ok={}",
            response.is_ok()
        );
        let response = response?;
        debug!("[SurrealRepo::create_scan_path] calling .check()");
        let checked = response.check();
        debug!(
            "[SurrealRepo::create_scan_path] .check() result ok={}",
            checked.is_ok()
        );
        let mut response = checked?;

        let created: Result<Vec<ScanPathRecord>, _> = response.take(0);
        debug!(
            "[SurrealRepo::create_scan_path] created result: {:?}",
            created
        );

        Ok(())
    }

    pub async fn get_all_scan_paths(&self) -> Result<Vec<ScanPathRecord>> {
        debug!("[SurrealRepo::get_all_scan_paths] querying SELECT * FROM scan_path");
        let paths: Vec<ScanPathRecord> = self
            .db
            .query("SELECT * FROM scan_path")
            .await?
            .check()?
            .take(0)?;
        debug!(
            "[SurrealRepo::get_all_scan_paths] got {} results: {:?}",
            paths.len(),
            paths
        );
        Ok(paths)
    }

    pub async fn delete_scan_path(&self, id: &str) -> Result<()> {
        debug!("[SurrealRepo::delete_scan_path] input id='{}'", id);
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            debug!(
                "[SurrealRepo::delete_scan_path] extracted id_part='{}' from full record ID",
                id
            );
            id
        } else {
            debug!("[SurrealRepo::delete_scan_path] using full input as id_part");
            id
        };

        let result = self
            .db
            .query("DELETE FROM scan_path WHERE id = type::thing('scan_path', $id)")
            .bind(("id", id_part.to_string()))
            .await?;
        debug!("[SurrealRepo::delete_scan_path] DELETE query executed");

        let _checked = result.check()?;
        debug!("[SurrealRepo::delete_scan_path] DELETE query checked successfully");

        Ok(())
    }

    /// Update an existing scan path's name and path.
    pub async fn update_scan_path(&self, id: &str, name: &str, path: &str) -> Result<()> {
        debug!(
            "[SurrealRepo::update_scan_path] id='{}', name='{}', path='{}'",
            id, name, path
        );
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };

        self.db
            .query("UPDATE type::thing('scan_path', $id) SET name = $name, path = $path")
            .bind(("id", id_part.to_string()))
            .bind(("name", name.to_string()))
            .bind(("path", path.to_string()))
            .await?
            .check()?;

        debug!("[SurrealRepo::update_scan_path] UPDATE query executed successfully");
        Ok(())
    }

    pub async fn create_bookmark(&self, book_id: &str, path: &str, page: i64) -> Result<()> {
        self.db
            .query("CREATE bookmark SET book_id = $book_id, path = $path, page = $page")
            .bind(("book_id", book_id.to_string()))
            .bind(("path", path.to_string()))
            .bind(("page", page))
            .await?
            .check()?;
        Ok(())
    }

    pub async fn get_all_bookmarks(&self) -> Result<Vec<BookmarkRecord>> {
        let bookmarks: Vec<BookmarkRecord> = self
            .db
            .query("SELECT * FROM bookmark")
            .await?
            .check()?
            .take(0)?;
        Ok(bookmarks)
    }

    pub async fn get_bookmarks_by_book(&self, book_id: &str) -> Result<Vec<BookmarkRecord>> {
        let bookmarks: Vec<BookmarkRecord> = self
            .db
            .query("SELECT * FROM bookmark WHERE book_id = $book_id")
            .bind(("book_id", book_id.to_string()))
            .await?
            .check()?
            .take(0)?;
        Ok(bookmarks)
    }

    pub async fn delete_bookmark(&self, id: &str) -> Result<()> {
        debug!("[SurrealRepo::delete_bookmark] input id='{}'", id);
        let id_part = if let Some((_table, id)) = id.split_once(':') {
            id
        } else {
            id
        };
        self.db
            .query("DELETE FROM bookmark WHERE id = type::thing('bookmark', $id)")
            .bind(("id", id_part.to_string()))
            .await?
            .check()?;
        debug!("[SurrealRepo::delete_bookmark] Successfully deleted bookmark");
        Ok(())
    }

    pub async fn get_database_stats(&self) -> Result<Value> {
        let book_count = self.count_books().await?;
        let series_count = self.count_series().await?;

        let read_count: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM book WHERE read = true GROUP ALL")
            .await?
            .check()?
            .take(0)?;
        let reading_count: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM book WHERE reading = true GROUP ALL")
            .await?
            .check()?
            .take(0)?;
        let unread_count: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM book WHERE unread = true GROUP ALL")
            .await?
            .check()?
            .take(0)?;
        let favorite_count: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT count() AS total FROM book WHERE favorite = true GROUP ALL")
            .await?
            .check()?
            .take(0)?;

        let extract = |v: Vec<HashMap<String, Value>>| -> i64 {
            v.first()
                .and_then(|r| r.get("total"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
        };

        let pages_result: Vec<HashMap<String, Value>> = self
            .db
            .query("SELECT math::sum(last_page) AS total FROM book GROUP ALL")
            .await?
            .check()?
            .take(0)?;
        let total_pages_read = extract(pages_result);

        Ok(serde_json::json!({
            "book_count": book_count,
            "series_count": series_count,
            "read_count": extract(read_count),
            "reading_count": extract(reading_count),
            "unread_count": extract(unread_count),
            "favorite_count": extract(favorite_count),
            "total_pages_read": total_pages_read,
        }))
    }

    /// Export the full database as JSON for backup.
    pub async fn export_all(&self) -> Result<Value> {
        let books = self.get_all_books().await?;
        let series = self.get_all_series().await?;
        let scan_paths = self.get_all_scan_paths().await?;
        let bookmarks = self.get_all_bookmarks().await?;

        Ok(serde_json::json!({
            "books": books,
            "series": series,
            "scan_paths": scan_paths,
            "bookmarks": bookmarks,
            "exported_at": chrono::Utc::now().to_rfc3339(),
        }))
    }

    /// Return all stored credentials as a key → value map.
    pub async fn get_all_api_credentials(&self) -> Result<HashMap<String, String>> {
        #[derive(serde::Deserialize)]
        struct Row {
            key: String,
            value: String,
        }
        let rows: Vec<Row> = self.db.select("api_credential").await?;
        Ok(rows.into_iter().map(|r| (r.key, r.value)).collect())
    }

    /// Run an arbitrary SurrealQL query and return the first result set as JSON values.
    /// Used by legacy command passthrough.
    pub async fn raw_query(&self, query: &str) -> Result<Vec<Value>> {
        let mut response = self.db.query(query).await?;
        let result: Vec<Value> = response.take(0).unwrap_or_default();
        Ok(result)
    }

    /// Run a parameterised SurrealQL query and deserialise the first result set to `T`.
    pub async fn raw_query_typed<T: serde::de::DeserializeOwned>(
        &self,
        query: &str,
        bindings: Vec<(&str, Value)>,
    ) -> Result<Vec<T>> {
        let mut q = self.db.query(query);
        for (k, v) in bindings {
            // Convert the borrowed key to owned String to satisfy the 'static bound
            // required by the SurrealDB query builder before it is awaited.
            q = q.bind((k.to_owned(), v));
        }
        let mut response = q.await?;
        let result: Vec<T> = response.take(0).unwrap_or_default();
        Ok(result)
    }

    /// Insert or update a single credential by key.
    pub async fn upsert_api_credential(&self, key: &str, value: &str) -> Result<()> {
        let key_owned = key.to_string();
        let value_owned = value.to_string();
        self.db
            .query("UPSERT type::thing('api_credential', $key) MERGE { key: $key, value: $value }")
            .bind(("key", key_owned))
            .bind(("value", value_owned))
            .await?
            .check()?;
        Ok(())
    }
}

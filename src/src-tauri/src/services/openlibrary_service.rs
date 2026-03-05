use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tracing::{debug, error, info};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OpenLibraryResponse {
    #[serde(flatten)]
    pub books: HashMap<String, OpenLibraryBook>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OpenLibraryBook {
    pub details: BookDetails,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BookDetails {
    pub title: String,
    pub description: Option<String>,
    pub physical_format: Option<String>,
    pub number_of_pages: Option<u32>,
    pub publish_date: Option<String>,
    pub info_url: Option<String>,
    pub authors: Option<Vec<AuthorRef>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthorRef {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OpenLibrarySearchResponse {
    pub start: u32,
    pub num_found: u32,
    pub docs: Vec<SearchDoc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchDoc {
    pub cover_i: Option<u32>,
    pub has_fulltext: Option<bool>,
    pub edition_count: Option<u32>,
    pub title: Option<String>,
    pub author_name: Option<Vec<String>>,
    pub first_publish_year: Option<u32>,
    pub key: Option<String>,
    pub ia: Option<Vec<String>>,
    pub author_key: Option<Vec<String>>,
    pub public_scan_b: Option<bool>,
}

pub async fn get_olapi_comics_by_id(id: &str) -> Result<OpenLibraryBook> {
    let url = format!(
        "https://openlibrary.org/api/books?bibkeys=OLID:{}&jscmd=details&format=json",
        id.replace("_3", "")
    );
    info!("{}", url);

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    if data.get("error").is_some() {
        return Err(anyhow!("Error fetching data for ID: {}", id));
    }
    let book: OpenLibraryResponse = serde_json::from_value(data)?;
    if book.books.is_empty() {
        return Err(anyhow!("No book found for ID: {}", id));
    }
    let book_details = book
        .books
        .values()
        .next()
        .cloned()
        .ok_or_else(|| anyhow!("No book details found"))?;
    debug!("{:?}", book_details);
    Ok(book_details)
}

pub async fn get_olapi_search(name: &str) -> Result<OpenLibrarySearchResponse> {
    if name.is_empty() {
        error!("Name is empty");
        return Err(anyhow!("Name is empty"));
    }

    let mut sanitized_name = name.to_string();
    sanitized_name = sanitized_name.replace(&['(', ')', '[', ']', '{', '}', '#'][..], "");
    sanitized_name = sanitized_name.trim_end().to_string();

    info!("OL API: name: {}", sanitized_name);

    let url = format!(
        "https://openlibrary.org/search.json?q={}",
        urlencoding::encode(&sanitized_name)
    );

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    if data.get("error").is_some() {
        return Err(anyhow!("Error fetching data for name: {}", name));
    }
    let data: OpenLibrarySearchResponse = serde_json::from_value(data)?;
    if data.docs.is_empty() {
        return Err(anyhow!("No results found for name: {}", name));
    }
    debug!("{:?}", data);
    Ok(data)
}

pub async fn get_olapi_book(key: &str) -> Result<Value> {
    if key.is_empty() {
        error!("key is empty");
        return Err(anyhow!("Key is empty"));
    }

    info!("book: {}", key);

    let url = format!(
        "https://openlibrary.org/api/books?bibkeys=OLID:{}&jscmd=details&format=json",
        key
    );

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:?}", data);
    Ok(data)
}

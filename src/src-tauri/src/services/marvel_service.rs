use anyhow::{anyhow, Result};
use chrono::Utc;
use md5;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{debug, error, info};
use urlencoding::encode;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Url {
    pub r#type: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Image {
    pub path: String,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResourceList<T> {
    pub available: u32,
    pub returned: u32,
    #[serde(rename = "collectionURI")]
    pub collection_uri: String,
    pub items: Vec<T>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TextObject {
    pub r#type: String,
    pub language: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComicDate {
    pub r#type: String,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComicPrice {
    pub r#type: String,
    pub price: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComicSummary {
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SeriesSummary {
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventSummary {
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Character {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub modified: String,
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub urls: Vec<Url>,
    pub thumbnail: Image,
    pub comics: ResourceList<ComicSummary>,
    pub stories: ResourceList<ComicSummary>,
    pub events: ResourceList<ComicSummary>,
    pub series: ResourceList<SeriesSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Comic {
    pub id: u32,
    #[serde(rename = "digitalId")]
    pub digital_id: u32,
    pub title: String,
    #[serde(rename = "issueNumber")]
    pub issue_number: f32,
    #[serde(rename = "variantDescription")]
    pub variant_description: String,
    pub description: Option<String>,
    pub modified: String,
    pub isbn: String,
    pub upc: String,
    #[serde(rename = "diamondCode")]
    pub diamond_code: String,
    pub ean: String,
    pub issn: String,
    pub format: String,
    #[serde(rename = "pageCount")]
    pub page_count: u32,
    #[serde(rename = "textObjects")]
    pub text_objects: Vec<TextObject>,
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub urls: Vec<Url>,
    pub series: SeriesSummary,
    pub variants: Vec<ComicSummary>,
    pub collections: Vec<ComicSummary>,
    #[serde(rename = "collectedIssues")]
    pub collected_issues: Vec<ComicSummary>,
    pub dates: Vec<ComicDate>,
    pub prices: Vec<ComicPrice>,
    pub thumbnail: Image,
    pub images: Vec<Image>,
    pub creators: ResourceList<SeriesSummary>,
    pub characters: ResourceList<SeriesSummary>,
    pub stories: ResourceList<SeriesSummary>,
    pub events: ResourceList<SeriesSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Creator {
    pub id: u32,
    #[serde(rename = "firstName")]
    pub first_name: Option<String>,
    #[serde(rename = "middleName")]
    pub middle_name: Option<String>,
    #[serde(rename = "lastName")]
    pub last_name: Option<String>,
    pub suffix: Option<String>,
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub modified: String,
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub urls: Vec<Url>,
    pub thumbnail: Option<Image>,
    pub series: ResourceList<SeriesSummary>,
    pub stories: ResourceList<ComicSummary>,
    pub comics: ResourceList<ComicSummary>,
    pub events: ResourceList<EventSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Event {
    pub id: u32,
    pub title: String,
    pub description: Option<String>,
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub urls: Vec<Url>,
    pub modified: String,
    pub start: Option<String>,
    pub end: Option<String>,
    pub thumbnail: Option<Image>,
    pub comics: ResourceList<ComicSummary>,
    pub stories: ResourceList<ComicSummary>,
    pub series: ResourceList<SeriesSummary>,
    pub characters: ResourceList<SeriesSummary>,
    pub creators: ResourceList<SeriesSummary>,
    pub next: Option<EventSummary>,
    pub previous: Option<EventSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Series {
    pub id: u32,
    pub title: String,
    pub description: Option<String>,
    #[serde(rename = "resourceURI")]
    pub resource_uri: String,
    pub urls: Vec<Url>,
    #[serde(rename = "startYear")]
    pub start_year: u32,
    #[serde(rename = "endYear")]
    pub end_year: u32,
    pub rating: Option<String>,
    pub modified: String,
    pub thumbnail: Option<Image>,
    pub comics: ResourceList<ComicSummary>,
    pub stories: ResourceList<ComicSummary>,
    pub events: ResourceList<EventSummary>,
    pub characters: ResourceList<SeriesSummary>,
    pub creators: ResourceList<SeriesSummary>,
    pub next: Option<SeriesSummary>,
    pub previous: Option<SeriesSummary>,
}

fn recover_marvel_api_link(
    what: &str,
    id: &str,
    what2: &str,
    no_variants: Option<bool>,
    order_by: &str,
    element_type: Option<&str>,
    private_key: &str,
    public_key: &str,
) -> String {
    let base_url = "https://gateway.marvel.com:443/v1/public/";
    let no_variants_str = match no_variants {
        Some(true) => "true",
        Some(false) => "false",
        None => "true",
    };

    if let Some(t) = element_type {
        return format!(
            "{}{}?{}={}&{}",
            base_url,
            what,
            t,
            id,
            generate_marvel_api_auth(private_key, public_key)
        );
    }

    if what2.is_empty() {
        return format!(
            "{}{}/{}/?noVariants={}&orderBy={}&{}",
            base_url,
            what,
            id,
            no_variants_str,
            order_by,
            generate_marvel_api_auth(private_key, public_key)
        );
    }

    format!(
        "{}{}/{}/{}/?noVariants={}&orderBy={}&{}",
        base_url,
        what,
        id,
        what2,
        no_variants_str,
        order_by,
        generate_marvel_api_auth(private_key, public_key)
    )
}
fn generate_marvel_api_auth(marvel_private_key: &str, marvel_public_key: &str) -> String {
    let ts = Utc::now().timestamp().to_string();

    let hash_input = format!("{}{}{}", ts, marvel_public_key, marvel_private_key);
    let hash = format!("{:x}", md5::compute(hash_input));

    format!("&ts={}&hash={}&apikey={}", ts, hash, marvel_public_key)
}
pub async fn api_marvel_get(
    name: &str,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Value> {
    if name.is_empty() {
        error!("no name provided, aborting GETMARVELAPI");
        return Err(anyhow!("Name is empty"));
    }

    let mut date = String::new();
    let mut date_nb = 0;

    let date_from_name = name.replace(|c: char| !c.is_numeric(), "#");
    for element in date_from_name.split('#') {
        if date_nb == 0 && element.len() == 4 && element.chars().all(|c| c.is_numeric()) {
            date_nb += 1;
            date = element.to_string();
        }
    }

    let mut cleaned_name = name.replace(&['(', ')'][..], "");
    cleaned_name = cleaned_name.trim_end().to_string();
    let encoded_name = encode(&cleaned_name);

    let base_url = "https://gateway.marvel.com:443/v1/public/series";
    let url = if !date.is_empty() {
        format!(
            "{}?titleStartsWith={}&startYear={}{}",
            base_url,
            encoded_name,
            date,
            generate_marvel_api_auth(marvel_private_key, marvel_public_key)
        )
    } else {
        format!(
            "{}?titleStartsWith={}{}",
            base_url,
            encoded_name,
            generate_marvel_api_auth(marvel_private_key, marvel_public_key)
        )
    };

    let response = reqwest::get(&url).await?;
    let json = response.json::<Value>().await?;
    Ok(json)
}
pub async fn get_marvel_api_comics(
    name: &str,
    series_start_date: &str,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Value> {
    if name.is_empty() {
        error!("Name is empty");
        return Err(anyhow!("Name is empty"));
    }
    if series_start_date.is_empty() {
        error!("Series start date is empty");
        return Err(anyhow!("Series start date is empty"));
    }

    let mut issue_number = String::new();
    let inb_from_name = name.replace(|c: char| !c.is_numeric() && c != '#', "&");
    info!("inbFromName: {}", inb_from_name);

    for element in inb_from_name.split('&') {
        if element.starts_with('#') && element[1..].chars().all(|c| c.is_numeric()) {
            issue_number = element[1..].to_string();
        }
    }

    let cleaned_name = name
        .replace(&['(', ')', '[', ']', '{', '}', '#'][..], "")
        .trim_end()
        .to_string();

    info!("Name: {}", cleaned_name);
    info!("Issue Number: {}", issue_number);
    info!("Series Start Date: {}", series_start_date);

    let encoded_name = encode(&cleaned_name);
    let base_url = "https://gateway.marvel.com:443/v1/public/comics";
    let url = if !series_start_date.is_empty() && !issue_number.is_empty() {
        format!(
            "{}?titleStartsWith={}&startYear={}&issueNumber={}&noVariants=true{}",
            base_url,
            encoded_name,
            series_start_date,
            issue_number,
            generate_marvel_api_auth(marvel_private_key, marvel_public_key)
        )
    } else {
        format!(
            "{}?titleStartsWith={}&noVariants=true{}",
            base_url,
            encoded_name,
            generate_marvel_api_auth(marvel_private_key, marvel_public_key)
        )
    };

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:#?}", data);
    Ok(data)
}

pub async fn get_marvel_api_relations(
    id: &str,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Value> {
    let url = recover_marvel_api_link(
        "series",
        id,
        "comics",
        Some(true),
        "issueNumber",
        None,
        marvel_private_key,
        marvel_public_key,
    );
    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:#?}", data);
    Ok(data)
}
pub async fn get_marvel_api_characters(
    id: &str,
    element_type: Option<&str>,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Value> {
    let url = recover_marvel_api_link(
        "characters",
        id,
        "comics",
        Some(true),
        "issueNumber",
        element_type,
        marvel_private_key,
        marvel_public_key,
    );
    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:#?}", data);
    Ok(data)
}
pub async fn get_marvel_api_creators(
    id: &str,
    element_type: Option<&str>,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Value> {
    let url = recover_marvel_api_link(
        "creators",
        id,
        "comics",
        Some(true),
        "issueNumber",
        element_type,
        marvel_private_key,
        marvel_public_key,
    );
    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:#?}", data);
    Ok(data)
}
pub async fn get_marvel_api_comics_by_id(
    id: &str,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Comic> {
    let url = recover_marvel_api_link(
        "comics",
        id,
        "",
        Some(true),
        "issueNumber",
        None,
        marvel_private_key,
        marvel_public_key,
    );
    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    if let Some(comic) = data["data"]["results"]
        .as_array()
        .and_then(|arr| arr.first())
    {
        let comic: Comic = serde_json::from_value(comic.clone())?;
        debug!("{:#?}", comic);
        return Ok(comic);
    }
    Err(anyhow!("Comic not found or invalid response format"))
}
pub async fn get_marvel_api_series_by_id(
    id: &str,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Series> {
    let base_url = "https://gateway.marvel.com:443/v1/public/series";
    let url = format!(
        "{}?id={}{}",
        base_url,
        id,
        generate_marvel_api_auth(marvel_private_key, marvel_public_key)
    );

    info!("Generated URL: {}", url);

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    if let Some(series) = data["data"]["results"]
        .as_array()
        .and_then(|arr| arr.first())
    {
        let series: Series = serde_json::from_value(series.clone())?;
        debug!("{:#?}", series);
        return Ok(series);
    }
    Err(anyhow!("Series not found or invalid response format"))
}
pub async fn get_marvel_api_search(
    name: &str,
    date: Option<String>,
    marvel_private_key: &str,
    marvel_public_key: &str,
) -> Result<Value> {
    if name.is_empty() {
        error!("no name provided, aborting GETMARVELAPI");
        return Err(anyhow!("Name is empty"));
    }

    let cleaned_name = name.replace(&['(', ')'][..], "").trim_end().to_string();
    let encoded_name = encode(&cleaned_name);

    let base_url = "https://gateway.marvel.com:443/v1/public/series";
    let url = if let Some(date) = date {
        format!(
            "{}?titleStartsWith={}&startYear={}{}",
            base_url,
            encoded_name,
            date,
            generate_marvel_api_auth(marvel_private_key, marvel_public_key)
        )
    } else {
        format!(
            "{}?titleStartsWith={}{}",
            base_url,
            encoded_name,
            generate_marvel_api_auth(marvel_private_key, marvel_public_key)
        )
    };

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:#?}", data);
    Ok(data)
}

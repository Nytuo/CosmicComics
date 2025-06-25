use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{debug, error};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Volume {
    pub kind: String,
    pub id: String,
    pub etag: String,
    #[serde(rename = "selfLink")]
    pub self_link: String,
    #[serde(rename = "volumeInfo")]
    pub volume_info: VolumeInfo,
    #[serde(rename = "saleInfo")]
    pub sale_info: Option<SaleInfo>,
    #[serde(rename = "accessInfo")]
    pub access_info: Option<AccessInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VolumeInfo {
    pub title: String,
    pub authors: Option<Vec<String>>,
    pub publisher: Option<String>,
    #[serde(rename = "publishedDate")]
    pub published_date: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "pageCount")]
    pub page_count: Option<u32>,
    #[serde(rename = "printType")]
    pub print_type: Option<String>,
    #[serde(rename = "averageRating")]
    pub average_rating: Option<f32>,
    #[serde(rename = "ratingsCount")]
    pub ratings_count: Option<u32>,
    #[serde(rename = "imageLinks")]
    pub image_links: Option<ImageLinks>,
    #[serde(rename = "language")]
    pub language: Option<String>,
    #[serde(rename = "infoLink")]
    pub info_link: Option<String>,
    #[serde(rename = "canonicalVolumeLink")]
    pub canonical_volume_link: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndustryIdentifier {
    pub r#type: String,
    pub identifier: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dimensions {
    pub height: Option<String>,
    pub width: Option<String>,
    pub thickness: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageLinks {
    #[serde(rename = "smallThumbnail")]
    pub small_thumbnail: Option<String>,
    pub thumbnail: Option<String>,
    pub small: Option<String>,
    pub medium: Option<String>,
    pub large: Option<String>,
    #[serde(rename = "extraLarge")]
    pub extra_large: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SaleInfo {
    pub country: String,
    pub saleability: String,
    #[serde(rename = "isEbook")]
    pub is_ebook: bool,
    #[serde(rename = "listPrice")]
    pub list_price: Option<Price>,
    #[serde(rename = "retailPrice")]
    pub retail_price: Option<Price>,
    #[serde(rename = "buyLink")]
    pub buy_link: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Price {
    pub amount: f32,
    #[serde(rename = "currencyCode")]
    pub currency_code: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccessInfo {
    pub country: String,
    pub viewability: String,
    pub embeddable: bool,
    #[serde(rename = "publicDomain")]
    pub public_domain: bool,
    #[serde(rename = "textToSpeechPermission")]
    pub text_to_speech_permission: String,
    pub epub: Option<FormatAvailability>,
    pub pdf: Option<FormatAvailability>,
    #[serde(rename = "accessViewStatus")]
    pub access_view_status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FormatAvailability {
    #[serde(rename = "isAvailable")]
    pub is_available: bool,
    #[serde(rename = "acsTokenLink")]
    pub acs_token_link: Option<String>,
}

pub async fn get_gbapi_comics_by_id(id: &str) -> Result<Volume> {
    let url = format!("https://www.googleapis.com/books/v1/volumes/{}", id);
    debug!("{}", url);

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    if data.get("error").is_some() {
        return Err(anyhow!("Error fetching data for ID: {}", id));
    }
    let volume: Volume = serde_json::from_value(data)?;
    debug!("{:?}", volume);
    Ok(volume)
}
pub async fn search_gbapi_comics_by_name(name: &str, cred: String) -> Result<Value> {
    if name.is_empty() {
        error!("Name is empty");
        return Err(anyhow!("Name is empty"));
    }

    let sanitized_name = name
        .replace(
            |c: char| c == '(' || c == ')' || c == '[' || c == ']' || c == '{' || c == '}',
            "",
        )
        .replace("#", "")
        .trim()
        .to_string();

    let url = format!(
        "https://www.googleapis.com/books/v1/volumes?q={}&maxResults=1&key={}",
        urlencoding::encode(&sanitized_name),
        cred
    );

    debug!("URL: {}", url);

    let response = reqwest::get(&url).await?;
    let data = response.json::<Value>().await?;
    debug!("{:?}", data);

    Ok(data)
}

use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::VecDeque;
use std::time::Duration;
use tokio::sync::Mutex as AsyncMutex;
use tokio::time::{sleep, Instant};
use tracing::{debug, error, info, warn};

const METRON_BASE_URL: &str = "https://metron.cloud/api";

const BURST_LIMIT: usize = 20;
const BURST_WINDOW: Duration = Duration::from_secs(60);

const MAX_RATE_LIMIT_RETRIES: u32 = 3;
const DEFAULT_RATE_LIMIT_RETRY_SECS: u64 = 5;
const MAX_RATE_LIMIT_RETRY_SECS: u64 = 120;

static REQUEST_TIMESTAMPS: Lazy<AsyncMutex<VecDeque<Instant>>> =
    Lazy::new(|| AsyncMutex::new(VecDeque::with_capacity(BURST_LIMIT)));

async fn wait_for_rate_limit_slot() {
    loop {
        let wait = {
            let mut timestamps = REQUEST_TIMESTAMPS.lock().await;
            let now = Instant::now();
            while let Some(&oldest) = timestamps.front() {
                if now.duration_since(oldest) >= BURST_WINDOW {
                    timestamps.pop_front();
                } else {
                    break;
                }
            }

            if timestamps.len() < BURST_LIMIT {
                timestamps.push_back(now);
                None
            } else {
                Some(BURST_WINDOW - now.duration_since(timestamps[0]))
            }
        };

        match wait {
            None => return,
            Some(duration) => {
                debug!(
                    "Metron local rate limit reached, waiting {:.1}s before next request",
                    duration.as_secs_f64()
                );
                sleep(duration).await;
            }
        }
    }
}

fn parse_retry_after_from_body(body: &str) -> Option<u64> {
    let marker = "available in ";
    let idx = body.find(marker)?;
    let rest = &body[idx + marker.len()..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok()
}

async fn get_with_retry(
    client: &reqwest::Client,
    url: &str,
    creds: &MetronCredentials,
) -> Result<reqwest::Response> {
    let mut attempt = 0u32;
    loop {
        wait_for_rate_limit_slot().await;

        let response = client
            .get(url)
            .header("Authorization", creds.auth_header())
            .send()
            .await?;

        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS
            && attempt < MAX_RATE_LIMIT_RETRIES
        {
            let header_wait = response
                .headers()
                .get(reqwest::header::RETRY_AFTER)
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok());
            let body = response.text().await.unwrap_or_default();
            let wait = header_wait
                .or_else(|| parse_retry_after_from_body(&body))
                .unwrap_or(DEFAULT_RATE_LIMIT_RETRY_SECS)
                .min(MAX_RATE_LIMIT_RETRY_SECS);

            attempt += 1;
            warn!(
                "Metron API rate limited (attempt {}/{}), waiting {}s: {}",
                attempt, MAX_RATE_LIMIT_RETRIES, wait, body
            );
            sleep(Duration::from_secs(wait)).await;
            continue;
        }

        return Ok(response);
    }
}

/// Credentials for the Metron API — either a Bearer API token (preferred) or
/// HTTP Basic Auth (username/password).
#[derive(Debug, Clone, Default)]
pub struct MetronCredentials {
    pub api_key: String,
    pub username: String,
    pub password: String,
}

impl MetronCredentials {
    pub fn auth_header(&self) -> String {
        if !self.api_key.is_empty() {
            return format!("Bearer {}", self.api_key);
        }
        let encoded = STANDARD.encode(format!("{}:{}", self.username, self.password));
        format!("Basic {}", encoded)
    }

    pub fn is_valid(&self) -> bool {
        !self.api_key.is_empty() || (!self.username.is_empty() && !self.password.is_empty())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronPaginatedResponse<T> {
    pub count: u32,
    pub next: Option<String>,
    pub previous: Option<String>,
    pub results: Vec<T>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MetronIssueListItem {
    pub id: u64,
    #[serde(default)]
    pub series: Option<MetronSeriesRef>,
    #[serde(default)]
    pub number: Option<String>,
    #[serde(default)]
    pub cover_date: Option<String>,
    #[serde(default)]
    pub store_date: Option<String>,
    #[serde(default)]
    pub image: Option<String>,
    #[serde(default)]
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct MetronIssueDetail {
    pub id: u64,
    pub series: Option<MetronSeriesRef>,
    pub number: Option<String>,
    pub cover_date: Option<String>,
    pub store_date: Option<String>,
    pub image: Option<String>,
    pub desc: Option<String>,
    pub price: Option<String>,
    pub sku: Option<String>,
    pub isbn: Option<String>,
    pub upc: Option<String>,
    pub page_count: Option<u32>,
    pub rating: Option<Value>,
    pub arcs: Option<Vec<Value>>,
    pub characters: Option<Vec<MetronCharacterRef>>,
    pub teams: Option<Vec<Value>>,
    pub universes: Option<Vec<Value>>,
    pub credits: Option<Vec<MetronCredit>>,
    pub variants: Option<Vec<Value>>,
    pub reprints: Option<Vec<Value>>,
    pub cv_id: Option<u64>,
    pub resource_url: Option<String>,
    pub modified: Option<String>,
}

impl Default for MetronIssueDetail {
    fn default() -> Self {
        Self {
            id: 0,
            series: None,
            number: None,
            cover_date: None,
            store_date: None,
            image: None,
            desc: None,
            price: None,
            sku: None,
            isbn: None,
            upc: None,
            page_count: None,
            rating: None,
            arcs: None,
            characters: None,
            teams: None,
            universes: None,
            credits: None,
            variants: None,
            reprints: None,
            cv_id: None,
            resource_url: None,
            modified: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MetronSeriesRef {
    #[serde(default)]
    pub id: Option<u64>,
    pub name: String,
    #[serde(default)]
    pub volume: Option<u32>,
    #[serde(default)]
    pub year_began: Option<u32>,
    #[serde(default)]
    pub series_type: Option<MetronSeriesType>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronSeriesType {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronSeriesListItem {
    pub id: u64,
    pub series_type: Option<MetronSeriesType>,
    pub publisher: Option<MetronPublisherRef>,
    #[serde(alias = "name")]
    pub series: String,
    pub volume: Option<u32>,
    pub year_began: Option<u32>,
    pub year_end: Option<u32>,
    pub issue_count: Option<u32>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronSeriesDetail {
    pub id: u64,
    pub name: String,
    pub sort_name: Option<String>,
    pub volume: Option<u32>,
    pub series_type: Option<MetronSeriesType>,
    pub status: Option<String>,
    pub publisher: Option<MetronPublisherRef>,
    pub imprint: Option<Value>,
    pub year_began: Option<u32>,
    pub year_end: Option<u32>,
    pub desc: Option<String>,
    pub issue_count: Option<u32>,
    pub genres: Option<Vec<Value>>,
    pub associated: Option<Vec<Value>>,
    pub cv_id: Option<u64>,
    pub gcd_id: Option<u64>,
    pub resource_url: Option<String>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronPublisherRef {
    pub id: u64,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronCharacterRef {
    pub id: u64,
    pub name: String,
    #[serde(default)]
    pub slug: Option<String>,
    #[serde(default)]
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronCredit {
    #[serde(default)]
    pub id: Option<u64>,
    #[serde(default)]
    pub creator: Option<String>,
    #[serde(default)]
    pub role: Option<Vec<MetronRole>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetronRole {
    #[serde(default)]
    pub id: Option<u64>,
    #[serde(default)]
    pub name: Option<String>,
}

fn build_client(creds: &MetronCredentials) -> Result<reqwest::Client> {
    if !creds.is_valid() {
        return Err(anyhow!("Metron credentials not configured. Set METRON_API_KEY, or METRON_USERNAME and METRON_PASSWORD, environment variables."));
    }

    let client = reqwest::Client::builder()
        .user_agent("CosmicComics/1.0")
        .build()?;
    Ok(client)
}

/// Search for issues by series name.
pub async fn search_issues(
    name: &str,
    creds: &MetronCredentials,
) -> Result<MetronPaginatedResponse<MetronIssueListItem>> {
    if name.is_empty() {
        return Err(anyhow!("Search name is empty"));
    }

    let client = build_client(creds)?;
    let url = format!(
        "{}/issue/?series_name={}",
        METRON_BASE_URL,
        urlencoding::encode(name)
    );
    info!("Metron search issues: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: MetronPaginatedResponse<MetronIssueListItem> = response.json().await?;
    debug!("Metron issues found: {}", data.count);
    Ok(data)
}

/// Search for series by name.
pub async fn search_series(
    name: &str,
    creds: &MetronCredentials,
) -> Result<MetronPaginatedResponse<MetronSeriesListItem>> {
    if name.is_empty() {
        return Err(anyhow!("Search name is empty"));
    }

    let client = build_client(creds)?;
    let url = format!(
        "{}/series/?name={}",
        METRON_BASE_URL,
        urlencoding::encode(name)
    );
    info!("Metron search series: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: MetronPaginatedResponse<MetronSeriesListItem> = response.json().await?;
    debug!("Metron series found: {}", data.count);
    Ok(data)
}

/// Get issue details by ID.
pub async fn get_issue_detail(
    issue_id: u64,
    creds: &MetronCredentials,
) -> Result<MetronIssueDetail> {
    let client = build_client(creds)?;
    let url = format!("{}/issue/{}/", METRON_BASE_URL, issue_id);
    info!("Metron get issue: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: MetronIssueDetail = response.json().await?;
    debug!("Metron issue detail: {:?}", data.id);
    Ok(data)
}

/// Get series details by ID.
pub async fn get_series_detail(
    series_id: u64,
    creds: &MetronCredentials,
) -> Result<MetronSeriesDetail> {
    let client = build_client(creds)?;
    let url = format!("{}/series/{}/", METRON_BASE_URL, series_id);
    info!("Metron get series: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: MetronSeriesDetail = response.json().await?;
    debug!("Metron series detail: {:?}", data.id);
    Ok(data)
}

/// Fetch the full detail of the first issue of a series.
pub async fn get_series_first_issue(
    series_id: u64,
    creds: &MetronCredentials,
) -> Option<MetronIssueDetail> {
    let client = build_client(creds).ok()?;

    let list_url = format!(
        "{}/issue/?series_id={}&page_size=1",
        METRON_BASE_URL, series_id
    );
    debug!(
        "Metron get first issue for series {}: {}",
        series_id, list_url
    );

    let list_resp = get_with_retry(&client, &list_url, creds).await.ok()?;

    if !list_resp.status().is_success() {
        error!(
            "Metron issue list failed with status: {}",
            list_resp.status()
        );
        return None;
    }

    let list_text = list_resp.text().await.ok()?;
    debug!(
        "Metron issue list raw: {}",
        &list_text[..list_text.len().min(500)]
    );

    let list_data: MetronPaginatedResponse<MetronIssueListItem> =
        match serde_json::from_str(&list_text) {
            Ok(d) => d,
            Err(e) => {
                error!(
                    "Metron issue list parse error: {} | raw: {}",
                    e,
                    &list_text[..list_text.len().min(500)]
                );
                return None;
            }
        };

    let first_issue_id = list_data.results.into_iter().next()?.id;

    let detail_url = format!("{}/issue/{}/", METRON_BASE_URL, first_issue_id);
    debug!("Metron get issue detail for cover: {}", detail_url);

    let detail_resp = get_with_retry(&client, &detail_url, creds).await.ok()?;

    if !detail_resp.status().is_success() {
        error!(
            "Metron issue detail failed with status: {}",
            detail_resp.status()
        );
        return None;
    }

    let detail_text = detail_resp.text().await.ok()?;
    debug!(
        "Metron issue detail raw (first 500): {}",
        &detail_text[..detail_text.len().min(500)]
    );

    match serde_json::from_str::<MetronIssueDetail>(&detail_text) {
        Ok(d) => Some(d),
        Err(e) => {
            error!(
                "Metron issue detail parse error: {} | raw: {}",
                e,
                &detail_text[..detail_text.len().min(1000)]
            );
            None
        }
    }
}

/// Convenience wrapper: only the cover URL.
pub async fn get_series_cover(series_id: u64, creds: &MetronCredentials) -> Option<String> {
    get_series_first_issue(series_id, creds)
        .await
        .and_then(|i| i.image)
}

/// Get issues for a specific series.
pub async fn get_series_issues(
    series_id: u64,
    creds: &MetronCredentials,
) -> Result<MetronPaginatedResponse<MetronIssueListItem>> {
    let client = build_client(creds)?;
    let url = format!("{}/series/{}/issue_list/", METRON_BASE_URL, series_id);
    info!("Metron get series issues: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: MetronPaginatedResponse<MetronIssueListItem> = response.json().await?;
    debug!("Metron series issues found: {}", data.count);
    Ok(data)
}

/// Fetch the first issue matching a series ID + issue number via the Metron API.
/// Calls `GET /api/issue/?series_id={id}&number={num}`.
pub async fn get_issue_by_series_and_number(
    series_id: u64,
    number: &str,
    creds: &MetronCredentials,
) -> Result<Option<MetronIssueListItem>> {
    let client = build_client(creds)?;
    let url = format!(
        "{}/issue/?series_id={}&number={}",
        METRON_BASE_URL,
        series_id,
        urlencoding::encode(number)
    );
    info!("Metron get issue by series+number: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: MetronPaginatedResponse<MetronIssueListItem> = response.json().await?;
    debug!("Metron issue by series+number: count={}", data.count);
    Ok(data.results.into_iter().next())
}

/// Search for issues by series name and optional year filter.
pub async fn search_issues_by_series_and_year(
    name: &str,
    year: Option<&str>,
    creds: &MetronCredentials,
) -> Result<Value> {
    if name.is_empty() {
        return Err(anyhow!("Search name is empty"));
    }

    let client = build_client(creds)?;
    let mut url = format!(
        "{}/issue/?series_name={}",
        METRON_BASE_URL,
        urlencoding::encode(name)
    );
    if let Some(y) = year {
        if !y.is_empty() {
            url.push_str(&format!("&cover_year={}", y));
        }
    }
    info!("Metron search issues: {}", url);

    let response = get_with_retry(&client, &url, creds).await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Metron API error {}: {}", status, body);
        return Err(anyhow!("Metron API error {}: {}", status, body));
    }

    let data: Value = response.json().await?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_retry_after_from_throttle_body() {
        let body = r#"{"detail":"Request was throttled. Expected available in 18 seconds."}"#;
        assert_eq!(parse_retry_after_from_body(body), Some(18));
    }

    #[test]
    fn parses_retry_after_missing_when_not_throttled() {
        let body = r#"{"detail":"Not found."}"#;
        assert_eq!(parse_retry_after_from_body(body), None);
    }

    #[tokio::test]
    async fn burst_tracker_fills_up_to_the_cap_without_blocking() {
        {
            let mut timestamps = REQUEST_TIMESTAMPS.lock().await;
            timestamps.clear();
        }

        for _ in 0..BURST_LIMIT {
            wait_for_rate_limit_slot().await;
        }

        let timestamps = REQUEST_TIMESTAMPS.lock().await;
        assert_eq!(timestamps.len(), BURST_LIMIT);
    }
}

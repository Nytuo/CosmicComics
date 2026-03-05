pub mod auth;
pub mod db;
pub mod download;
pub mod latest;
pub mod models;
pub mod search;

pub use auth::*;
pub use db::*;
pub use download::*;
pub use latest::*;
#[allow(unused_imports)]
pub use models::*;
pub use search::*;

// ── Shared browser infrastructure ────────────────────────────────────────────

use headless_chrome::{Browser, LaunchOptionsBuilder};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

/// Global persistent headless browser instance. We keep it in a Mutex so multiple async tasks
/// can acquire it and create tabs without re-launching the browser each time.
static PERSISTENT_BROWSER: Lazy<Mutex<Option<Browser>>> = Lazy::new(|| Mutex::new(None));

/// Get the persistent browser, launching it if necessary.
pub(crate) fn get_persistent_browser(
) -> Result<std::sync::MutexGuard<'static, Option<Browser>>, String> {
    let mut guard = PERSISTENT_BROWSER
        .lock()
        .map_err(|e| format!("Browser mutex poisoned: {:?}", e))?;
    if guard.is_none() {
        let options = LaunchOptionsBuilder::default()
            .headless(true)
            .idle_browser_timeout(Duration::from_secs(120))
            .build()
            .map_err(|e| format!("Failed to build launch options: {}", e))?;
        let browser =
            Browser::new(options).map_err(|e| format!("Failed to launch browser: {}", e))?;
        *guard = Some(browser);
    }
    Ok(guard)
}

/// Render the given search URL with the persistent headless browser and return the rendered HTML.
/// Cookies (if provided) are injected via Chrome DevTools Protocol (CDP).
pub(crate) fn render_search_page_with_cookies(
    url: &str,
    cookies: &HashMap<String, String>,
) -> Result<String, String> {
    let guard = get_persistent_browser()?;
    let browser_ref = guard
        .as_ref()
        .ok_or_else(|| "Browser was not initialized".to_string())?;
    let tab = browser_ref
        .new_tab()
        .map_err(|e| format!("Failed to open new tab: {}", e))?;

    if !cookies.is_empty() {
        tracing::debug!(
            "Setting {} cookies via CDP Network.setCookie",
            cookies.len()
        );

        for (name, value) in cookies.iter() {
            if let Err(e) = tab.call_method(headless_chrome::protocol::cdp::Network::SetCookie {
                name: name.to_string(),
                value: value.to_string(),
                url: None,
                domain: Some(".marvel.com".to_string()),
                path: Some("/".to_string()),
                secure: Some(true),
                http_only: Some(false),
                same_site: Some(headless_chrome::protocol::cdp::Network::CookieSameSite::Lax),
                expires: None,
                priority: None,
                same_party: None,
                source_scheme: None,
                source_port: None,
                partition_key: None,
            }) {
                tracing::warn!("Failed to set cookie {} via CDP: {:?}", name, e);
            } else {
                tracing::debug!("Set cookie via CDP: {}", name);
            }
        }

        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    tab.navigate_to(url)
        .map_err(|e| format!("Failed to navigate to {}: {}", url, e))?;
    let _ = tab.wait_for_element("ul.SearchList__Cards");

    let wait_for_images_script = r#"
        (function() {
            window.scrollTo(0, document.body.scrollHeight);

            setTimeout(() => {
                window.scrollTo(0, 0);

                const images = document.querySelectorAll('img');
                let loadedCount = 0;
                const totalImages = images.length;

                images.forEach(img => {
                    if (img.complete || img.naturalWidth > 0) {
                        loadedCount++;
                    }
                });

                console.log('Images loaded: ' + loadedCount + '/' + totalImages);
            }, 300);
        })();
    "#;
    let _ = tab.evaluate(wait_for_images_script, false);

    std::thread::sleep(Duration::from_millis(3000));

    let content = tab
        .get_content()
        .map_err(|e| format!("Failed to capture rendered content: {}", e))?;

    if let Err(e) = tab.close(true) {
        tracing::warn!("Failed to close tab: {:?}", e);
    }

    Ok(content)
}

/// Extract series ID from a Marvel URL.
/// URL format: `/comics/series/43910/mortal_thor_(2025_-_present)`
pub(crate) fn extract_series_id(url: &str) -> String {
    if let Some(captures) = regex::Regex::new(r"/series/(\d+)/")
        .ok()
        .and_then(|re| re.captures(url))
    {
        if let Some(id) = captures.get(1) {
            return id.as_str().to_string();
        }
    }
    String::new()
}

/// Extract comic ID from a Marvel issue URL.
/// URL format: `/comics/issue/125653/godzilla_vs_thor_2025_1`
pub(crate) fn extract_comic_id(url: &str) -> String {
    if let Some(captures) = regex::Regex::new(r"/issue/(\d+)/")
        .ok()
        .and_then(|re| re.captures(url))
    {
        if let Some(id) = captures.get(1) {
            return id.as_str().to_string();
        }
    }
    String::new()
}

/// Extract issue number from a title string (e.g., `"GODZILLA VS. THOR (2025) #1"` → `"1"`).
pub(crate) fn extract_issue_number(title: &str) -> String {
    tracing::debug!("Extracting issue number from title: '{}'", title);

    if let Some(captures) = regex::Regex::new(r"#(\d+)")
        .ok()
        .and_then(|re| re.captures(title))
    {
        if let Some(num) = captures.get(1) {
            let issue_num = num.as_str().to_string();
            tracing::debug!("Successfully extracted issue number: '{}'", issue_num);
            return issue_num;
        }
    }

    tracing::warn!("Failed to extract issue number from title: '{}'", title);
    String::new()
}

/// Parse year range from text like `"2025"` or `"2020 - 2024"`.
pub(crate) fn parse_year_range(year_text: &str) -> (Option<String>, Option<String>) {
    let parts: Vec<&str> = year_text.split('-').map(|s| s.trim()).collect();

    match parts.len() {
        1 => {
            let year = parts[0].to_string();
            if year.to_lowercase().contains("present") {
                (None, None)
            } else {
                (Some(year.clone()), Some(year))
            }
        }
        2 => {
            let start = parts[0].to_string();
            let end = parts[1].to_string();
            (
                if start.is_empty() { None } else { Some(start) },
                if end.to_lowercase().contains("present") {
                    None
                } else {
                    Some(end)
                },
            )
        }
        _ => (None, None),
    }
}

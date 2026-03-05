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

// ── Browser Infrastructure ────────────────────────────────────────────────────

use headless_chrome::Browser;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

/// Global persistent headless browser for DC Infinite scraping.
static DC_PERSISTENT_BROWSER: Lazy<Mutex<Option<Browser>>> = Lazy::new(|| Mutex::new(None));

/// Get or launch the persistent browser for DC Infinite.
pub(crate) fn get_dc_persistent_browser(
) -> Result<std::sync::MutexGuard<'static, Option<Browser>>, String> {
    let mut guard = DC_PERSISTENT_BROWSER
        .lock()
        .map_err(|e| format!("DC browser mutex poisoned: {:?}", e))?;
    if guard.is_none() {
        let mut options = headless_chrome::LaunchOptionsBuilder::default()
            .headless(true)
            .idle_browser_timeout(Duration::from_secs(600))
            .build()
            .map_err(|e| format!("Failed to build launch options: {}", e))?;

        options.args.push(std::ffi::OsStr::new(
            "--disable-blink-features=AutomationControlled",
        ));

        let browser =
            Browser::new(options).map_err(|e| format!("Failed to launch browser: {}", e))?;
        *guard = Some(browser);
    }
    Ok(guard)
}

/// Render a DC Infinite page with cookie injection and return HTML.
///
/// Enables stealth mode and filters to only essential cookies to avoid HTTP 431 errors.
pub(crate) fn render_dc_page_with_cookies(
    url: &str,
    cookies: &HashMap<String, String>,
    wait_selector: &str,
) -> Result<String, String> {
    let guard = get_dc_persistent_browser()?;
    let browser_ref = guard
        .as_ref()
        .ok_or_else(|| "DC Browser was not initialized".to_string())?;
    let tab = browser_ref
        .new_tab()
        .map_err(|e| format!("Failed to open new tab: {}", e))?;

    if let Err(e) = tab.enable_stealth_mode() {
        tracing::warn!("Failed to enable stealth mode: {:?}", e);
    }

    if !cookies.is_empty() {
        tracing::debug!("Setting {} cookies via CDP for DC Infinite", cookies.len());

        let essential_cookie_prefixes = [
            "auth", "session", "token", "access", "refresh", "user", "identity",
        ];

        for (name, value) in cookies.iter() {
            let name_lower = name.to_lowercase();
            let is_essential = essential_cookie_prefixes
                .iter()
                .any(|prefix| name_lower.contains(prefix))
                || name_lower.len() < 20;

            if !is_essential {
                tracing::debug!("Skipping non-essential cookie: {}", name);
                continue;
            }

            if let Err(e) = tab.call_method(headless_chrome::protocol::cdp::Network::SetCookie {
                name: name.to_string(),
                value: value.to_string(),
                url: None,
                domain: Some(".dcuniverseinfinite.com".to_string()),
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
                tracing::warn!("Failed to set DC cookie {} via CDP: {:?}", name, e);
            } else {
                tracing::debug!("Set essential cookie: {}", name);
            }
        }
        std::thread::sleep(Duration::from_millis(100));
    }

    tracing::debug!("DC Infinite: Navigating to {}", url);
    tab.navigate_to(url)
        .map_err(|e| format!("Failed to navigate to {}: {}", url, e))?;

    std::thread::sleep(Duration::from_millis(5000));

    let current_url = tab.get_url();
    tracing::debug!("DC Infinite: Current URL after navigation: {}", current_url);
    let _ = tab.wait_for_element(wait_selector);

    let scroll_script = r#"
        (function() {
            window.scrollTo(0, document.body.scrollHeight);
            setTimeout(() => window.scrollTo(0, 0), 300);
        })();
    "#;
    let _ = tab.evaluate(scroll_script, false);

    std::thread::sleep(Duration::from_millis(3000));

    let content = tab
        .get_content()
        .map_err(|e| format!("Failed to capture rendered content: {}", e))?;

    if let Err(e) = tab.close(true) {
        tracing::warn!("Failed to close DC tab: {:?}", e);
    }

    Ok(content)
}

/// Extract a DC comic UUID from a URL path like `/comics/book/slug/UUID`.
pub(crate) fn extract_dc_comic_id(url: &str) -> String {
    let uuid_regex = regex::Regex::new(
        r"/comics/book/[^/]+/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    )
    .unwrap();
    uuid_regex
        .captures(url)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default()
}

/// Extract a DC series UUID from a URL path like `/comics/series/slug/UUID`.
pub(crate) fn extract_dc_series_id(url: &str) -> String {
    let uuid_regex = regex::Regex::new(
        r"/comics/series/[^/]+/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
    )
    .unwrap();
    uuid_regex
        .captures(url)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default()
}

/// Extract a DC issue number from a title string like "Batman #42".
pub(crate) fn extract_dc_issue_number(title: &str) -> String {
    let re = regex::Regex::new(r"#(\d+)").unwrap();
    re.captures(title)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default()
}

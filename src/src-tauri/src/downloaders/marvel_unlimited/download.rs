use std::fs;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

use super::get_persistent_browser;
use super::models::{DownloadProgress, DownloadRequest};

/// Download images from URLs and save to directory.
async fn download_images(
    image_urls: Vec<String>,
    save_dir: &PathBuf,
    comic_id: String,
    comic_title: String,
    app: &tauri::AppHandle,
) -> Result<u32, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let total_pages = image_urls.len() as u32;
    let mut saved_count = 0u32;

    for (index, url) in image_urls.iter().enumerate() {
        let page_num = index + 1;

        let _ = app.emit(
            "marvel-download-progress",
            DownloadProgress {
                comic_id: comic_id.clone(),
                comic_title: comic_title.clone(),
                current_page: page_num as u32,
                total_pages,
                status: "downloading".to_string(),
                error: None,
                message: None,
            },
        );

        tracing::info!("Downloading page {}/{}: {}", page_num, total_pages, url);

        match client
            .get(url)
            .header(
                "Accept",
                "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            )
            .header("Referer", "https://www.marvel.com/")
            .header("Sec-Fetch-Dest", "image")
            .header("Sec-Fetch-Mode", "no-cors")
            .header("Sec-Fetch-Site", "same-site")
            .send()
            .await
        {
            Ok(response) => match response.bytes().await {
                Ok(bytes) => {
                    let extension = if url.ends_with(".png") {
                        "png"
                    } else if url.ends_with(".webp") {
                        "webp"
                    } else {
                        "jpg"
                    };

                    let filename = format!("page_{:03}.{}", page_num, extension);
                    let file_path = save_dir.join(&filename);

                    match fs::write(&file_path, &bytes) {
                        Ok(_) => {
                            tracing::info!("Saved page {} to {:?}", page_num, file_path);
                            saved_count += 1;
                        }
                        Err(e) => {
                            tracing::error!("Failed to save page {}: {}", page_num, e);
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to read image bytes for page {}: {}", page_num, e);
                }
            },
            Err(e) => {
                tracing::error!("Failed to download page {}: {}", page_num, e);
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    Ok(saved_count)
}

/// Download a comic from Marvel Unlimited by opening the reader and capturing images.
#[tauri::command]
pub async fn download_marvel_unlimited_comic(
    app: tauri::AppHandle,
    request: DownloadRequest,
) -> Result<String, String> {
    tracing::info!(
        "Downloading Marvel Unlimited comic: {} ({})",
        request.comic_title,
        request.comic_id
    );

    tracing::info!(
        "Received {} cookies in download request",
        request.cookies.len()
    );
    for (name, value) in request.cookies.iter() {
        tracing::debug!(
            "Cookie received: {} = {} (length: {})",
            name,
            &value[..value.len().min(20)],
            value.len()
        );
    }

    let state = app.state::<crate::commands::AppState>();
    let base_path = state.config.lock().await.base_path.clone();

    let save_dir = if let Some(path) = request.save_path {
        PathBuf::from(path)
    } else {
        PathBuf::from(&base_path)
            .join("downloads")
            .join("marvel_unlimited")
    };

    fs::create_dir_all(&save_dir)
        .map_err(|e| format!("Failed to create download directory: {}", e))?;

    let comic_dir = save_dir.join(format!(
        "{}_{}",
        request.comic_title.replace(" ", "_").replace("/", "-"),
        request.comic_id
    ));
    fs::create_dir_all(&comic_dir)
        .map_err(|e| format!("Failed to create comic directory: {}", e))?;

    let _ = app.emit(
        "marvel-download-progress",
        DownloadProgress {
            comic_id: request.comic_id.clone(),
            comic_title: request.comic_title.clone(),
            current_page: 0,
            total_pages: 0,
            status: "opening_reader".to_string(),
            error: None,
            message: None,
        },
    );

    let comic_url = format!("https://www.marvel.com/comics/issue/{}/", request.comic_id);

    tracing::info!(
        "Opening comic reader at: {} with {} cookies",
        comic_url,
        request.cookies.len()
    );

    if request.cookies.is_empty() {
        tracing::error!("WARNING: No cookies provided to download function!");
        return Err(
            "No authentication cookies provided. Please log in to Marvel Unlimited first."
                .to_string(),
        );
    }

    let comic_url_clone = comic_url.clone();
    let cookies_clone = request.cookies.clone();

    let images = tokio::task::spawn_blocking(move || -> Result<Vec<String>, String> {
        let tab = {
            let browser_guard =
                get_persistent_browser().map_err(|e| format!("Failed to get browser: {}", e))?;

            let browser = browser_guard
                .as_ref()
                .ok_or_else(|| "Browser not initialized".to_string())?;

            browser
                .new_tab()
                .map_err(|e| format!("Failed to create browser tab: {}", e))?
        };

        if !cookies_clone.is_empty() {
            tracing::info!(
                "Injecting {} cookies via CDP Network.setCookie",
                cookies_clone.len()
            );
            tracing::debug!("Cookie names: {:?}", cookies_clone.keys().collect::<Vec<_>>());

            for (name, value) in cookies_clone.iter() {
                let domains = vec![
                    Some(".marvel.com".to_string()),
                    Some("marvel.com".to_string()),
                    Some(".read.marvel.com".to_string()),
                    None,
                ];

                let mut success = false;
                for domain in domains.iter() {
                    match tab.call_method(headless_chrome::protocol::cdp::Network::SetCookie {
                        name: name.to_string(),
                        value: value.to_string(),
                        url: Some("https://www.marvel.com/".to_string()),
                        domain: domain.clone(),
                        path: Some("/".to_string()),
                        secure: Some(true),
                        http_only: Some(false),
                        same_site: Some(headless_chrome::protocol::cdp::Network::CookieSameSite::None),
                        expires: Some(
                            (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as f64,
                        ),
                        priority: None,
                        same_party: None,
                        source_scheme: None,
                        source_port: None,
                        partition_key: None,
                    }) {
                        Ok(_) => {
                            tracing::info!("Successfully set cookie {} via CDP with domain {:?}", name, domain);
                            success = true;
                            break;
                        }
                        Err(e) => {
                            tracing::debug!("Failed to set cookie {} with domain {:?}: {}", name, domain, e);
                        }
                    }
                }

                if !success {
                    tracing::error!("Failed to set cookie {} with any domain variant", name);
                }
            }

            std::thread::sleep(std::time::Duration::from_millis(500));

            let verify_script = r#"
                (function() {
                    const cookies = document.cookie.split(';').map(c => c.trim());
                    return {
                        count: cookies.filter(c => c.length > 0).length,
                        hasMARVELToken: document.cookie.includes('MARVEL-MARVEL.COM.WEB-PROD.token'),
                        hasSession: document.cookie.includes('PHPSESSID'),
                        all: cookies
                    };
                })();
            "#;

            if let Ok(result) = tab.evaluate(verify_script, false) {
                if let Some(value) = result.value {
                    tracing::info!("Cookie verification result: {:?}", value);
                }
            }
        } else {
            tracing::error!("CRITICAL: cookies_clone is empty! No cookies will be injected!");
        }

        tab.navigate_to(&comic_url_clone)
            .map_err(|e| format!("Failed to navigate to comic detail page: {}", e))?;

        tab.wait_until_navigated()
            .map_err(|e| format!("Failed to wait for navigation: {}", e))?;

        tracing::info!("Comic detail page loaded, clicking button to open reader");

        std::thread::sleep(std::time::Duration::from_secs(3));

        let auth_check_script = r#"
            (function() {
                const readButton = document.querySelector('button.ComicPurchasePaths__Button[data-testid="button"]');
                const signInButton = document.querySelector('[href*="sign-in"], [href*="login"]');
                const getUnlimitedButton = document.querySelector('[href*="marvel-unlimited"]');

                return {
                    hasReadButton: !!readButton,
                    hasSignInButton: !!signInButton,
                    hasGetUnlimitedButton: !!getUnlimitedButton,
                    authenticated: !!readButton && !signInButton
                };
            })();
        "#;

        if let Ok(result) = tab.evaluate(auth_check_script, false) {
            if let Some(value) = result.value {
                tracing::info!("Authentication check result: {:?}", value);

                if let Ok(auth_status) = serde_json::from_value::<serde_json::Value>(value) {
                    if let Some(authenticated) = auth_status.get("authenticated").and_then(|v| v.as_bool()) {
                        if !authenticated {
                            tracing::error!("Page shows NOT authenticated - cookies may not be working!");
                        } else {
                            tracing::info!("Page shows authenticated state - cookies are working!");
                        }
                    }
                }
            }
        }

        let click_reader_script = r#"
            (function() {
                console.log('[Marvel Downloader] Looking for reader button on detail page');

                const buttonSelectors = [
                    '#themeProvider > div.BackgroundContainer > div.ComicMasthead > div.GeneralContainer > div > div.ComicPurchasePaths > div.ComicPurchasePaths__Right > div > div.ComicPurchasePaths__DigitalContent > div > div > div > button',
                    'button.ComicPurchasePaths__Button[data-testid="button"]',
                    'div.ComicPurchasePaths__DigitalContent button',
                    'button[data-testid="button"]',
                    'a[href*="/read/"]'
                ];

                for (const selector of buttonSelectors) {
                    try {
                        const button = document.querySelector(selector);
                        if (button) {
                            console.log('[Marvel Downloader] Found reader button with selector: ' + selector);
                            button.click();
                            return true;
                        }
                    } catch (e) {
                        console.log('[Marvel Downloader] Selector failed: ' + selector);
                    }
                }

                console.log('[Marvel Downloader] Could not find reader button');
                return false;
            })();
        "#;

        let click_result = tab.evaluate(click_reader_script, false)
            .map_err(|e| format!("Failed to click reader button: {}", e))?;

        let clicked = if let Some(value) = click_result.value {
            serde_json::from_value::<bool>(value).unwrap_or(false)
        } else {
            false
        };

        if !clicked {
            return Err("Failed to find or click reader button on detail page".to_string());
        }

        tracing::info!("Reader button clicked, waiting for reader page to load");

        std::thread::sleep(std::time::Duration::from_secs(8));

        tracing::info!("Reader page should be loaded, waiting for images to be cached");

        std::thread::sleep(std::time::Duration::from_secs(5));

        tracing::info!("Proceeding to extract images from cache via Performance API");

        let extract_cached_images = r#"
            (function() {
                console.log('[Marvel Downloader] Checking Performance API for cached images');
                console.log('[Marvel Downloader] Current URL:', window.location.href);
                const urls = [];

                function isComicPageImage(url) {
                    if (url.includes('/thumbnails/')) return false;
                    if (url.includes('portrait_uncanny')) return false;
                    if (url.includes('portrait_')) return false;
                    if (url.includes('landscape_')) return false;
                    if (url.includes('/clean.jpg')) return false;
                    if (url.includes('/standard.jpg')) return false;
                    if (url.includes('/square.')) return false;
                    if (url.includes('icon-mu-shield')) return false;
                    if (url.includes('Unlimited_Logo')) return false;
                    if (url.includes('mu-logo-w-nav')) return false;
                    if (url.includes('.svg')) return false;
                    if (!url.includes('/digitalcomic/')) return false;
                    return true;
                }

                if (window.performance && window.performance.getEntriesByType) {
                    const resources = window.performance.getEntriesByType('resource');
                    console.log('[Marvel Downloader] Found ' + resources.length + ' total resources in performance API');

                    resources.forEach(resource => {
                        const url = resource.name;
                        if (url && url.includes('cdn.marvel.com')) {
                            console.log('[Marvel Downloader] CDN resource:', url);
                        }
                        if (url && url.includes('cdn.marvel.com') &&
                            (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('image'))) {
                            if (isComicPageImage(url)) {
                                urls.push(url);
                                console.log('[Marvel Downloader] ✓ Found comic page: ' + url.substring(0, 100));
                            } else {
                                console.log('[Marvel Downloader] ✗ Filtered out: ' + url.substring(0, 100));
                            }
                        }
                    });
                }

                if (window.performance && window.performance.getEntries) {
                    const allEntries = window.performance.getEntries();
                    console.log('[Marvel Downloader] Checking all performance entries: ' + allEntries.length);

                    allEntries.forEach(entry => {
                        const url = entry.name;
                        if (url && url.includes('cdn.marvel.com') &&
                            (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('image'))) {
                            if (isComicPageImage(url) && urls.indexOf(url) === -1) {
                                urls.push(url);
                                console.log('[Marvel Downloader] ✓ Found comic page in entries: ' + url.substring(0, 100));
                            }
                        }
                    });
                }

                const uniqueUrls = [...new Set(urls)];
                console.log('[Marvel Downloader] ===================================');
                console.log('[Marvel Downloader] Total comic page images found: ' + uniqueUrls.length);
                console.log('[Marvel Downloader] ===================================');

                uniqueUrls.forEach((url, idx) => {
                    console.log('[Marvel Downloader] Page ' + (idx + 1) + ': ' + url);
                });

                return JSON.stringify(uniqueUrls);
            })();
        "#;

        let initial_images_result = tab.evaluate(extract_cached_images, false)
            .map_err(|e| format!("Failed to extract cached images: {}", e))?;

        tracing::debug!("Extraction result: {:?}", initial_images_result);
        tracing::debug!("Extraction result value: {:?}", initial_images_result.value);

        let initial_images: Vec<String> = if let Some(value) = initial_images_result.value {
            tracing::debug!("Attempting to parse value: {:?}", value);
            match serde_json::from_value::<String>(value.clone()) {
                Ok(json_string) => {
                    tracing::debug!("Got JSON string from evaluation: {}", json_string);
                    match serde_json::from_str::<Vec<String>>(&json_string) {
                        Ok(urls) => {
                            tracing::info!("Found {} images in browser cache via Performance API", urls.len());
                            for (i, url) in urls.iter().take(5).enumerate() {
                                tracing::debug!("Cached image {}: {}", i + 1, url);
                            }
                            urls
                        }
                        Err(e) => {
                            tracing::error!("Failed to parse cached images from JSON string: {}", e);
                            tracing::error!("JSON string was: {}", json_string);
                            Vec::new()
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to parse evaluation result as string: {}", e);
                    tracing::error!("Raw value was: {:?}", value);
                    Vec::new()
                }
            }
        } else {
            tracing::error!("No value in extraction result! Result was: {:?}", initial_images_result);
            Vec::new()
        };

        if !initial_images.is_empty() {
            tracing::info!("Successfully extracted {} images from cache, skipping page navigation", initial_images.len());

            if let Err(e) = tab.close(true) {
                tracing::warn!("Failed to close browser tab: {}", e);
            }

            Ok(initial_images)
        } else {
            tracing::info!("No images found in cache yet, will try navigating through pages");

            tracing::debug!("Preparing to inject navigation script");

            let capture_script = r#"
                (async function() {
                    console.log('[Marvel Downloader] Starting page navigation to load more images');

                    window.__captureComplete = false;
                    window.__marvelImageURLs = [];
                    window.__marvelSeenURLs = new Set();

                    function isComicPageImage(url) {
                        if (url.includes('/thumbnails/')) return false;
                        if (url.includes('portrait_uncanny')) return false;
                        if (url.includes('portrait_')) return false;
                        if (url.includes('landscape_')) return false;
                        if (url.includes('/clean.jpg')) return false;
                        if (url.includes('/standard.jpg')) return false;
                        if (url.includes('/square.')) return false;
                        if (url.includes('icon-mu-shield')) return false;
                        if (url.includes('Unlimited_Logo')) return false;
                        if (url.includes('mu-logo-w-nav')) return false;
                        if (url.includes('.svg')) return false;
                        if (!url.includes('/digitalcomic/')) return false;
                        return true;
                    }

                    function getCachedImages() {
                        const urls = [];
                        if (window.performance && window.performance.getEntries) {
                            const allEntries = window.performance.getEntries();
                            allEntries.forEach(entry => {
                                const url = entry.name;
                                if (url && url.includes('cdn.marvel.com') &&
                                    (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('image'))) {
                                    if (isComicPageImage(url) && !window.__marvelSeenURLs.has(url)) {
                                        window.__marvelSeenURLs.add(url);
                                        urls.push(url);
                                        console.log('[Marvel Downloader] New comic page loaded: ' + url.substring(0, 100));
                                    }
                                }
                            });
                        }
                        return urls;
                    }

                function tryNavigatePages() {
                    const nextSelectors = [
                        '[aria-label="Next Page"]',
                        '[aria-label="next"]',
                        'button[title*="Next"]',
                        '.next-page',
                        'button.arrow-right'
                    ];

                    for (const selector of nextSelectors) {
                        try {
                            const btn = document.querySelector(selector);
                            if (btn && btn.offsetParent !== null) {
                                btn.click();
                                console.log('[Marvel Downloader] Clicked next page with selector: ' + selector);
                                return true;
                            }
                        } catch (e) {
                            // Continue to next selector
                        }
                    }

                    try {
                        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 });
                        document.dispatchEvent(event);
                        console.log('[Marvel Downloader] Sent ArrowRight keyboard event');
                        return true;
                    } catch (e) {
                        console.log('[Marvel Downloader] Keyboard navigation failed: ' + e);
                    }

                    return false;
                }

                let captureCount = 0;
                let noNewImagesCount = 0;
                let previousLength = 0;
                let navigationAttempts = 0;
                const maxNavigationAttempts = 100;

                const captureInterval = setInterval(() => {
                    const images = captureImages();

                    if (images.length > previousLength) {
                        window.__marvelImageURLs = [...window.__marvelSeenURLs].map(url => ({
                            url: url,
                            width: 0,
                            height: 0
                        }));
                        console.log('[Marvel Downloader] Total captured: ' + window.__marvelImageURLs.length + ' unique images');
                        noNewImagesCount = 0;
                        previousLength = window.__marvelImageURLs.length;

                        if (navigationAttempts < maxNavigationAttempts) {
                            setTimeout(() => {
                                if (tryNavigatePages()) {
                                    navigationAttempts++;
                                }
                            }, 800);
                        }
                    } else {
                        noNewImagesCount++;

                        if (noNewImagesCount === 3 && navigationAttempts < maxNavigationAttempts) {
                            tryNavigatePages();
                            navigationAttempts++;
                        }
                    }

                    captureCount++;

                    if (noNewImagesCount >= 15 || captureCount >= 80) {
                        clearInterval(captureInterval);
                        console.log('[Marvel Downloader] Capture complete: ' + window.__marvelImageURLs.length + ' images total');
                        console.log('[Marvel Downloader] Capture took ' + captureCount + ' seconds, ' + navigationAttempts + ' page turns');
                        window.__captureComplete = true;
                    }
                }, 1000);

                return true;
            })();
            "#;

            tracing::debug!("Capture script length: {} bytes", capture_script.len());

            match tab.evaluate(capture_script, false) {
                Ok(_) => {
                    tracing::info!("Capture script successfully injected");
                }
                Err(e) => {
                    tracing::error!("Failed to inject capture script: {}", e);
                    return Err(format!("Failed to inject capture script: {}", e));
                }
            }

            tracing::info!("Capture script injected, waiting for images to be captured");

            let mut total_wait = 0;
            let poll_interval = 2;
            let max_wait = 90;

            loop {
                std::thread::sleep(std::time::Duration::from_secs(poll_interval));
                total_wait += poll_interval;

                let check_script = "window.__captureComplete || false";
                match tab.evaluate(check_script, false) {
                    Ok(result) => {
                        if let Some(value) = result.value {
                            if let Ok(complete) = serde_json::from_value::<bool>(value) {
                                if complete {
                                    tracing::info!("Capture completed after {} seconds", total_wait);
                                    break;
                                }
                            }
                        }
                        let count_script = "(window.__marvelSeenURLs || new Set()).size";
                        if let Ok(count_result) = tab.evaluate(count_script, false) {
                            if let Some(count_value) = count_result.value {
                                if let Ok(count) = serde_json::from_value::<usize>(count_value) {
                                    tracing::debug!("Captured {} images so far (waited {} seconds)", count, total_wait);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to check capture status: {}", e);
                    }
                }

                if total_wait >= max_wait {
                    tracing::warn!("Capture timeout after {} seconds, proceeding with available images", total_wait);
                    break;
                }
            }

            let extract_script = r#"
                (function() {
                    console.log('[Marvel Downloader] Extracting final image URLs from Performance API');
                    const urls = [];

                    function isComicPageImage(url) {
                        if (url.includes('/thumbnails/')) return false;
                        if (url.includes('portrait_uncanny')) return false;
                        if (url.includes('portrait_')) return false;
                        if (url.includes('landscape_')) return false;
                        if (url.includes('/clean.jpg')) return false;
                        if (url.includes('/standard.jpg')) return false;
                        if (url.includes('/square.')) return false;
                        if (url.includes('icon-mu-shield')) return false;
                        if (url.includes('Unlimited_Logo')) return false;
                        if (url.includes('mu-logo-w-nav')) return false;
                        if (url.includes('.svg')) return false;
                        if (!url.includes('/digitalcomic/')) return false;
                        return true;
                    }

                    if (window.performance && window.performance.getEntries) {
                        const allEntries = window.performance.getEntries();
                        allEntries.forEach(entry => {
                            const url = entry.name;
                            if (url && url.includes('cdn.marvel.com') &&
                                (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('image'))) {
                                if (isComicPageImage(url)) {
                                    urls.push(url);
                                }
                            }
                        });
                    }

                    const uniqueUrls = [...new Set(urls)];
                    console.log('[Marvel Downloader] Final count: ' + uniqueUrls.length + ' comic page images');
                    return JSON.stringify(uniqueUrls);
                })();
            "#;

            let images_result = tab
                .evaluate(extract_script, false)
                .map_err(|e| format!("Failed to extract images: {}", e))?;

            let images: Vec<String> = if let Some(value) = images_result.value {
                match serde_json::from_value::<String>(value.clone()) {
                    Ok(json_string) => {
                        tracing::debug!("Got JSON string from navigation extraction: {}", json_string);
                        match serde_json::from_str::<Vec<String>>(&json_string) {
                            Ok(urls) => urls,
                            Err(e) => {
                                tracing::error!("Failed to parse images from JSON string: {}", e);
                                tracing::error!("JSON string was: {}", json_string);
                                Vec::new()
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to parse navigation result as string: {}", e);
                        tracing::error!("Raw value was: {:?}", value);
                        Vec::new()
                    }
                }
            } else {
                tracing::error!("No value in navigation extraction result");
                Vec::new()
            };

            if let Err(e) = tab.close(true) {
                tracing::warn!("Failed to close browser tab: {}", e);
            }

            tracing::info!(
                "Image capture complete: {} URLs collected",
                images.len()
            );

            if images.is_empty() {
                tracing::error!("No images were captured from the comic reader");
            } else {
                for (i, url) in images.iter().take(3).enumerate() {
                    tracing::debug!("Image {}: {}", i + 1, url);
                }
            }

            Ok(images)
        }
    })
    .await
    .map_err(|e| format!("Browser task failed: {}", e))??;

    tracing::info!(
        "Captured {} images for comic {} ({})",
        images.len(),
        request.comic_title,
        request.comic_id
    );

    if images.is_empty() {
        let error_msg = format!(
            "No images could be captured from the comic reader. This may indicate:\n\
             1. The comic requires a subscription or is not available\n\
             2. The Marvel reader interface has changed\n\
             3. Authentication cookies may have expired\n\
             Please verify you can read this comic in your browser."
        );
        tracing::error!("{}", error_msg);

        let _ = app.emit(
            "marvel-download-progress",
            DownloadProgress {
                comic_id: request.comic_id.clone(),
                comic_title: request.comic_title.clone(),
                current_page: 0,
                total_pages: 0,
                status: "failed".to_string(),
                error: Some(error_msg.clone()),
                message: None,
            },
        );

        return Err(error_msg);
    }

    let total_images = images.len();
    tracing::info!("Starting download of {} images", total_images);

    let saved_count = match download_images(
        images,
        &comic_dir,
        request.comic_id.clone(),
        request.comic_title.clone(),
        &app,
    )
    .await
    {
        Ok(count) => {
            tracing::info!("Successfully downloaded {} images", count);
            count
        }
        Err(e) => {
            tracing::error!("Failed to download images: {}", e);
            let _ = app.emit(
                "marvel-download-progress",
                DownloadProgress {
                    comic_id: request.comic_id.clone(),
                    comic_title: request.comic_title.clone(),
                    current_page: 0,
                    total_pages: 0,
                    status: "error".to_string(),
                    error: Some(format!("Failed to download images: {}", e)),
                    message: None,
                },
            );
            return Err(format!("Failed to download images: {}", e));
        }
    };

    tracing::info!(
        "Download complete for comic {} - saved {}/{} images",
        request.comic_id,
        saved_count,
        total_images
    );

    let _ = app.emit(
        "marvel-download-progress",
        DownloadProgress {
            comic_id: request.comic_id.clone(),
            comic_title: request.comic_title.clone(),
            current_page: saved_count,
            total_pages: total_images as u32,
            status: "archiving".to_string(),
            error: None,
            message: Some("Files saved, adding to library…".to_string()),
        },
    );

    let metadata = serde_json::json!({
        "id": request.comic_id,
        "title": request.comic_title,
        "download_date": chrono::Utc::now().to_rfc3339(),
        "source": "Marvel Unlimited"
    });

    let metadata_path = comic_dir.join("metadata.json");
    fs::write(
        &metadata_path,
        serde_json::to_string_pretty(&metadata).unwrap(),
    )
    .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(comic_dir.to_string_lossy().to_string())
}

/// Get download progress for a comic.
#[tauri::command]
pub async fn get_marvel_unlimited_download_progress(
    comic_id: String,
) -> Result<DownloadProgress, String> {
    tracing::info!("Getting download progress for comic: {}", comic_id);

    Ok(DownloadProgress {
        comic_id: comic_id.clone(),
        comic_title: "Mock Comic".to_string(),
        current_page: 0,
        total_pages: 24,
        status: "completed".to_string(),
        error: None,
        message: None,
    })
}

/// Command to download images from the reader (called from frontend with captured URLs).
#[tauri::command]
pub async fn save_marvel_images(
    app: tauri::AppHandle,
    comic_id: String,
    comic_title: String,
    image_urls: Vec<String>,
    save_path: Option<String>,
) -> Result<String, String> {
    tracing::info!("Saving {} images for comic: {}", image_urls.len(), comic_id);

    let state = app.state::<crate::commands::AppState>();
    let base_path = state.config.lock().await.base_path.clone();

    let save_dir = if let Some(path) = save_path {
        PathBuf::from(path)
    } else {
        PathBuf::from(&base_path)
            .join("downloads")
            .join("marvel_unlimited")
    };

    let comic_dir = save_dir.join(format!(
        "{}_{}",
        comic_title.replace(" ", "_").replace("/", "-"),
        comic_id
    ));
    fs::create_dir_all(&comic_dir)
        .map_err(|e| format!("Failed to create comic directory: {}", e))?;

    let saved_count = download_images(
        image_urls.clone(),
        &comic_dir,
        comic_id.clone(),
        comic_title.clone(),
        &app,
    )
    .await?;

    let _ = app.emit(
        "marvel-download-progress",
        DownloadProgress {
            comic_id: comic_id.clone(),
            comic_title: comic_title.clone(),
            current_page: saved_count,
            total_pages: image_urls.len() as u32,
            status: "files_downloaded".to_string(),
            error: None,
            message: None,
        },
    );

    let metadata = serde_json::json!({
        "id": comic_id,
        "title": comic_title,
        "download_date": chrono::Utc::now().to_rfc3339(),
        "source": "Marvel Unlimited",
        "pages": saved_count,
        "total_pages": image_urls.len(),
    });

    let metadata_path = comic_dir.join("metadata.json");
    fs::write(
        &metadata_path,
        serde_json::to_string_pretty(&metadata).unwrap(),
    )
    .map_err(|e| format!("Failed to write metadata: {}", e))?;

    tracing::info!(
        "Successfully saved {} pages to {:?}",
        saved_count,
        comic_dir
    );

    Ok(comic_dir.to_string_lossy().to_string())
}

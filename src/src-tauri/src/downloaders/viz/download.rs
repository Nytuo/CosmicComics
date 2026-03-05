use base64::Engine;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{Emitter, Manager};

use super::get_viz_persistent_browser;
use super::models::{VizDownloadProgress, VizDownloadRequest};
async fn viz_download_images(
    image_urls: Vec<String>,
    save_dir: &PathBuf,
    chapter_id: String,
    chapter_title: String,
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
            "viz-download-progress",
            VizDownloadProgress {
                chapter_id: chapter_id.clone(),
                chapter_title: chapter_title.clone(),
                current_page: page_num as u32,
                total_pages,
                status: "downloading".to_string(),
                error: None,
                message: None,
            },
        );

        if url.starts_with("data:image/") {
            if let Some(b64_start) = url.find("base64,") {
                let b64_data = &url[b64_start + 7..];
                if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64_data) {
                    let filename = format!("page_{:03}.png", page_num);
                    let file_path = save_dir.join(&filename);
                    if fs::write(&file_path, &bytes).is_ok() {
                        saved_count += 1;
                    }
                }
            }
            continue;
        }

        match client
            .get(url)
            .header(
                "Accept",
                "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            )
            .header("Referer", "https://www.viz.com/")
            .send()
            .await
        {
            Ok(response) => {
                if let Ok(bytes) = response.bytes().await {
                    let extension = if url.ends_with(".png") {
                        "png"
                    } else if url.ends_with(".webp") {
                        "webp"
                    } else {
                        "jpg"
                    };
                    let filename = format!("page_{:03}.{}", page_num, extension);
                    let file_path = save_dir.join(&filename);
                    if fs::write(&file_path, &bytes).is_ok() {
                        saved_count += 1;
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to download VIZ page {}: {}", page_num, e);
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    Ok(saved_count)
}

/// Download a chapter from VIZ Media by headless reader image capture
#[tauri::command]
pub async fn download_viz_chapter(
    app: tauri::AppHandle,
    request: VizDownloadRequest,
) -> Result<String, String> {
    tracing::info!(
        "Downloading VIZ chapter: {} ({})",
        request.chapter_title,
        request.chapter_id
    );

    let state = app.state::<crate::commands::AppState>();
    let base_path = state.config.lock().await.base_path.clone();

    let save_dir = if let Some(path) = request.save_path {
        PathBuf::from(path)
    } else {
        PathBuf::from(&base_path).join("downloads").join("viz")
    };

    fs::create_dir_all(&save_dir)
        .map_err(|e| format!("Failed to create download directory: {}", e))?;

    let chapter_dir = save_dir.join(format!(
        "{}_{}",
        request.chapter_title.replace(' ', "_").replace('/', "-"),
        &request.chapter_id
    ));
    fs::create_dir_all(&chapter_dir)
        .map_err(|e| format!("Failed to create chapter directory: {}", e))?;

    let _ = app.emit(
        "viz-download-progress",
        VizDownloadProgress {
            chapter_id: request.chapter_id.clone(),
            chapter_title: request.chapter_title.clone(),
            current_page: 0,
            total_pages: 0,
            status: "opening_reader".to_string(),
            error: None,
            message: None,
        },
    );

    if request.cookies.is_empty() {
        return Err(
            "No authentication cookies provided. Please log in to VIZ Media first.".to_string(),
        );
    }

    let reader_url = {
        let slug = request.series_slug.as_deref().unwrap_or("");
        let ch_num = request.chapter_number.as_deref().unwrap_or("");

        if !slug.is_empty() && !ch_num.is_empty() {
            format!(
                "https://www.viz.com/shonenjump/{}-chapter-{}/chapter/{}?action=read",
                slug, ch_num, request.chapter_id
            )
        } else if request.chapter_id.starts_with("viz_") {
            let parts: Vec<&str> = request.chapter_id.splitn(3, '_').collect();
            if parts.len() == 3 {
                format!(
                    "https://www.viz.com/shonenjump/{}-chapter-{}/chapter/{}?action=read",
                    parts[1], parts[2], request.chapter_id
                )
            } else {
                format!(
                    "https://www.viz.com/shonenjump/chapter/{}?action=read",
                    request.chapter_id
                )
            }
        } else {
            let title_slug = request
                .chapter_title
                .to_lowercase()
                .split(" chapter ")
                .next()
                .unwrap_or("")
                .trim()
                .replace(' ', "-")
                .replace(|c: char| !c.is_ascii_alphanumeric() && c != '-', "");
            let title_ch_num = request
                .chapter_title
                .to_lowercase()
                .split(" chapter ")
                .nth(1)
                .unwrap_or("")
                .trim()
                .split_whitespace()
                .next()
                .unwrap_or("")
                .to_string();
            if !title_slug.is_empty() && !title_ch_num.is_empty() {
                format!(
                    "https://www.viz.com/shonenjump/{}-chapter-{}/chapter/{}?action=read",
                    title_slug, title_ch_num, request.chapter_id
                )
            } else {
                format!(
                    "https://www.viz.com/shonenjump/chapter/{}?action=read",
                    request.chapter_id
                )
            }
        }
    };
    tracing::info!("VIZ reader URL: {}", reader_url);

    let cookies_clone = request.cookies.clone();

    let images = tokio::task::spawn_blocking(move || -> Result<Vec<String>, String> {
        let tab = {
            let browser_guard = get_viz_persistent_browser()
                .map_err(|e| format!("Failed to get VIZ browser: {}", e))?;
            let browser = browser_guard
                .as_ref()
                .ok_or_else(|| "VIZ Browser not initialized".to_string())?;
            browser
                .new_tab()
                .map_err(|e| format!("Failed to create VIZ browser tab: {}", e))?
        };

        if let Err(e) = tab.enable_stealth_mode() {
            tracing::warn!("Failed to enable stealth mode for VIZ download: {:?}", e);
        }

        if let Err(e) = tab.call_method(
            headless_chrome::protocol::cdp::Network::ClearBrowserCookies { 0: None },
        ) {
            tracing::warn!("Failed to clear VIZ browser cookies: {:?}", e);
        }

        let viz_essential_names: &[&str] = &["_session_id", "vid"];
        for (name, value) in cookies_clone.iter() {
            let name_lower = name.to_lowercase();
            if !viz_essential_names.iter().any(|&n| name_lower == n) {
                tracing::debug!("Skipping non-essential cookie for VIZ download: {}", name);
                continue;
            }
            let domains = vec![
                Some(".viz.com".to_string()),
                Some("viz.com".to_string()),
                Some("www.viz.com".to_string()),
                None,
            ];
            for domain in domains.iter() {
                if tab
                    .call_method(headless_chrome::protocol::cdp::Network::SetCookie {
                        name: name.to_string(),
                        value: value.to_string(),
                        url: Some("https://www.viz.com/".to_string()),
                        domain: domain.clone(),
                        path: Some("/".to_string()),
                        secure: Some(true),
                        http_only: Some(false),
                        same_site: Some(
                            headless_chrome::protocol::cdp::Network::CookieSameSite::None,
                        ),
                        expires: Some(
                            (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as f64,
                        ),
                        priority: None,
                        same_party: None,
                        source_scheme: None,
                        source_port: None,
                        partition_key: None,
                    })
                    .is_ok()
                {
                    break;
                }
            }
        }

        std::thread::sleep(Duration::from_millis(500));

        tab.navigate_to(&reader_url)
            .map_err(|e| format!("Failed to navigate to VIZ reader: {}", e))?;
        tab.wait_until_navigated()
            .map_err(|e| format!("Failed to wait for VIZ navigation: {}", e))?;

        std::thread::sleep(Duration::from_secs(8));

        let total_pages_result = tab
            .evaluate("typeof pages !== 'undefined' ? pages : 0", false)
            .ok()
            .and_then(|r| r.value)
            .and_then(|v| serde_json::from_value::<u32>(v).ok())
            .unwrap_or(0);

        let total_pages = if total_pages_result > 0 && total_pages_result < 200 {
            total_pages_result as usize
        } else {
            let fallback = tab
                .evaluate(
                    r#"
                    (function() {
                        var slider = document.querySelector('#reader_page_slider_container input[type=range]');
                        if (slider) return parseInt(slider.max) || 0;
                        var el = document.querySelector('.noUi-base');
                        if (el && el.noUiSlider) return parseInt(el.noUiSlider.options.range.max) || 0;
                        return 0;
                    })()
                    "#,
                    false,
                )
                .ok()
                .and_then(|r| r.value)
                .and_then(|v| serde_json::from_value::<u32>(v).ok())
                .unwrap_or(20);
            fallback as usize
        };

        tracing::info!("VIZ reader reports {} total pages", total_pages);

        tracing::info!("Switching VIZ reader to single-page mode...");
        let single_page_js = r#"
            (function() {
                var btn = document.querySelector(
                    '#reader_tools > a.reader-icon.pad-sm.type-rg.line-solid.hover-red.reader-page-mode.single-page'
                );
                if (btn) { btn.click(); return 'clicked'; }
                return 'not_found';
            })()
        "#;
        match tab.evaluate(single_page_js, false) {
            Ok(r) => tracing::info!("Single-page mode: {:?}", r.value),
            Err(e) => tracing::warn!("Failed to click single-page button: {}", e),
        }
        std::thread::sleep(Duration::from_secs(2));

        tracing::info!("Rewinding to first page...");
        for _ in 0..total_pages {
            let _ = tab.evaluate(
                r#"document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',keyCode:39,which:39,bubbles:true}));"#,
                false,
            );
            std::thread::sleep(Duration::from_millis(80));
        }
        std::thread::sleep(Duration::from_secs(2));
        tracing::info!("Rewind complete, starting capture.");

        let mut captured_images: Vec<String> = Vec::new();

        let fingerprint_js = r#"
            (function() {
                var ids = ['canvas_single_current','canvas_left_current','canvas_right_current'];
                for (var i = 0; i < ids.length; i++) {
                    var c = document.getElementById(ids[i]);
                    if (c && c.width > 100 && c.height > 100) {
                        try {
                            var ctx = c.getContext('2d');
                            var w = c.width, h = c.height;
                            var pts = [[w/2,h/2],[w/4,h/4],[3*w/4,h/4],[w/4,3*h/4],[3*w/4,3*h/4]];
                            var fp = '';
                            for (var p = 0; p < pts.length; p++) {
                                var d = ctx.getImageData(Math.floor(pts[p][0]), Math.floor(pts[p][1]), 1, 1).data;
                                fp += d[0]+','+d[1]+','+d[2]+'|';
                            }
                            return fp || '';
                        } catch(e) {}
                    }
                }
                var all = document.querySelectorAll('canvas');
                for (var k = 0; k < all.length; k++) {
                    var c = all[k];
                    if (c.width > 200 && c.height > 200 && c.id !== 'canvas_top') {
                        try {
                            var ctx = c.getContext('2d');
                            var w = c.width, h = c.height;
                            var pts = [[w/2,h/2],[w/4,h/4],[3*w/4,h/4],[w/4,3*h/4],[3*w/4,3*h/4]];
                            var fp = '';
                            for (var p = 0; p < pts.length; p++) {
                                var d = ctx.getImageData(Math.floor(pts[p][0]), Math.floor(pts[p][1]), 1, 1).data;
                                fp += d[0]+','+d[1]+','+d[2]+'|';
                            }
                            return fp || '';
                        } catch(e) {}
                    }
                }
                return '';
            })()
        "#;

        let capture_js = r#"
            (function() {
                function hasContent(ctx, w, h) {
                    var x0 = Math.max(0, Math.floor(w/2) - 5);
                    var y0 = Math.max(0, Math.floor(h/2) - 5);
                    var data = ctx.getImageData(x0, y0, 10, 10).data;
                    for (var i = 0; i < data.length; i += 4) {
                        if (data[i] || data[i+1] || data[i+2]) return true;
                    }
                    return false;
                }
                var ids = ['canvas_single_current','canvas_left_current','canvas_right_current'];
                for (var i = 0; i < ids.length; i++) {
                    var c = document.getElementById(ids[i]);
                    if (c && c.width > 100 && c.height > 100) {
                        try {
                            var ctx = c.getContext('2d');
                            if (hasContent(ctx, c.width, c.height)) return c.toDataURL('image/png');
                        } catch(e) {}
                    }
                }
                var all = document.querySelectorAll('canvas');
                for (var k = 0; k < all.length; k++) {
                    var c = all[k];
                    if (c.width > 200 && c.height > 200 && c.id !== 'canvas_top') {
                        try {
                            var ctx = c.getContext('2d');
                            if (hasContent(ctx, c.width, c.height)) return c.toDataURL('image/png');
                        } catch(e) {}
                    }
                }
                return '';
            })()
        "#;

        for page_idx in 0..total_pages {
            let mut data_url = String::new();
            for attempt in 0..20u32 {
                match tab.evaluate(capture_js, false) {
                    Ok(result) => {
                        if let Some(val) = result.value {
                            if let Ok(url) = serde_json::from_value::<String>(val) {
                                if !url.is_empty()
                                    && url.starts_with("data:image/")
                                    && url.len() > 1000
                                {
                                    data_url = url;
                                    break;
                                }
                            }
                        }
                    }
                    Err(e) => tracing::warn!("VIZ capture attempt {}: {}", attempt, e),
                }
                std::thread::sleep(Duration::from_millis(300));
            }

            if data_url.is_empty() {
                tracing::warn!(
                    "VIZ page {}/{}: canvas still empty after retries, skipping",
                    page_idx + 1,
                    total_pages
                );
            } else {
                captured_images.push(data_url);
                tracing::debug!(
                    "Captured VIZ page {}/{} ({} bytes)",
                    page_idx + 1,
                    total_pages,
                    captured_images.last().map(|s| s.len()).unwrap_or(0)
                );
            }

            if page_idx < total_pages - 1 {
                let prev_fp: String = tab
                    .evaluate(fingerprint_js, false)
                    .ok()
                    .and_then(|r| r.value)
                    .and_then(|v| serde_json::from_value::<String>(v).ok())
                    .unwrap_or_default();

                let _ = tab.evaluate(
                    r#"document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',code:'ArrowLeft',keyCode:37,which:37,bubbles:true}));"#,
                    false,
                );

                let wait_js = format!(r#"
                    new Promise(function(resolve) {{
                        var prevFp = {prev_fp:?};
                        var deadline = Date.now() + 8000;
                        var stableFp = '';
                        var stableCount = 0;
                        function getFp() {{
                            var ids = ['canvas_single_current','canvas_left_current','canvas_right_current'];
                            for (var i = 0; i < ids.length; i++) {{
                                var c = document.getElementById(ids[i]);
                                if (c && c.width > 100 && c.height > 100) {{
                                    try {{
                                        var ctx = c.getContext('2d');
                                        var w = c.width, h = c.height;
                                        var pts = [[w/2,h/2],[w/4,h/4],[3*w/4,h/4],[w/4,3*h/4],[3*w/4,3*h/4]];
                                        var fp = '';
                                        for (var p = 0; p < pts.length; p++) {{
                                            var d = ctx.getImageData(Math.floor(pts[p][0]),Math.floor(pts[p][1]),1,1).data;
                                            fp += d[0]+','+d[1]+','+d[2]+'|';
                                        }}
                                        return fp;
                                    }} catch(e) {{}}
                                }}
                            }}
                            return '';
                        }}
                        function check() {{
                            if (Date.now() >= deadline) {{ resolve('timeout'); return; }}
                            var fp = getFp();
                            var isBlank = !fp || /^(0,0,0\|)+$/.test(fp);
                            if (!fp || fp === prevFp || isBlank) {{
                                stableFp = '';
                                stableCount = 0;
                                setTimeout(check, 80);
                                return;
                            }}
                            if (fp === stableFp) {{
                                stableCount++;
                            }} else {{
                                stableFp = fp;
                                stableCount = 1;
                            }}
                            if (stableCount >= 2) {{
                                resolve('stable');
                            }} else {{
                                setTimeout(check, 80);
                            }}
                        }}
                        setTimeout(check, 80);
                    }})
                "#, prev_fp = prev_fp);

                match tab.evaluate(&wait_js, true) {
                    Ok(r) => tracing::debug!(
                        "VIZ page transition {}->{}: {:?}",
                        page_idx + 1,
                        page_idx + 2,
                        r.value
                    ),
                    Err(e) => {
                        tracing::warn!(
                            "VIZ wait-for-change error (page {}): {}",
                            page_idx + 1,
                            e
                        );
                        std::thread::sleep(Duration::from_millis(1500));
                    }
                }
            }
        }

        tracing::info!(
            "Canvas capture complete: {} pages captured out of {} total",
            captured_images.len(),
            total_pages
        );

        let _ = tab.close(true);
        Ok(captured_images)
    })
    .await
    .map_err(|e| format!("VIZ browser task failed: {}", e))??;

    tracing::info!(
        "Captured {} images for VIZ chapter {} ({})",
        images.len(),
        request.chapter_title,
        request.chapter_id
    );

    if images.is_empty() {
        let error_msg =
            "No images could be captured from the VIZ reader. Please verify your subscription and VPN connection."
                .to_string();
        let _ = app.emit(
            "viz-download-progress",
            VizDownloadProgress {
                chapter_id: request.chapter_id.clone(),
                chapter_title: request.chapter_title.clone(),
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
    let saved_count = viz_download_images(
        images,
        &chapter_dir,
        request.chapter_id.clone(),
        request.chapter_title.clone(),
        &app,
    )
    .await?;

    let _ = app.emit(
        "viz-download-progress",
        VizDownloadProgress {
            chapter_id: request.chapter_id.clone(),
            chapter_title: request.chapter_title.clone(),
            current_page: saved_count,
            total_pages: total_images as u32,
            status: "archiving".to_string(),
            error: None,
            message: Some("Files saved, adding to library…".to_string()),
        },
    );

    let metadata = serde_json::json!({
        "id": request.chapter_id,
        "title": request.chapter_title,
        "download_date": chrono::Utc::now().to_rfc3339(),
        "source": "VIZ Media"
    });
    let metadata_path = chapter_dir.join("metadata.json");
    fs::write(
        &metadata_path,
        serde_json::to_string_pretty(&metadata).unwrap(),
    )
    .map_err(|e| format!("Failed to write VIZ metadata: {}", e))?;

    Ok(chapter_dir.to_string_lossy().to_string())
}

/// Get download progress for a VIZ chapter
#[tauri::command]
pub async fn get_viz_download_progress(chapter_id: String) -> Result<VizDownloadProgress, String> {
    Ok(VizDownloadProgress {
        chapter_id,
        chapter_title: "".to_string(),
        current_page: 0,
        total_pages: 0,
        status: "completed".to_string(),
        error: None,
        message: None,
    })
}

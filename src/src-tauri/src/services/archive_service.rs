use crate::services::comic_archive::ComicArchive;
use crate::utils::is_image_file;
use futures::executor;
#[cfg(desktop)]
use headless_chrome::{Browser, LaunchOptionsBuilder};
use pdfium_render::prelude::*;
#[cfg(desktop)]
use serde_json::Value;
use std::{
    fs::{self, File},
    io::{self, Write},
    path::Path,
    sync::Arc,
};
use tokio::sync::Mutex;
use tracing::{error, info};
#[cfg(desktop)]
use std::time::Duration;
#[cfg(desktop)]
use zip::ZipArchive;

pub async fn unzip_and_process(
    zip_path: &str,
    extract_dir: &str,
    ext: &str,

    progress_status: &Arc<Mutex<crate::commands::state::AppGlobalVariables>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let total_start = std::time::Instant::now();
    info!("[unzip_and_process] START ext={} path={}", ext, zip_path);

    let t = std::time::Instant::now();
    if Path::new(&extract_dir).exists() {
        info!("[unzip_and_process] Removing existing extract_dir ...");
        fs::remove_dir_all(&extract_dir)?;
        info!(
            "[unzip_and_process] Removed existing extract_dir in {:.2?}",
            t.elapsed()
        );
    }
    fs::create_dir_all(&extract_dir)?;

    let path_file = Path::new(&extract_dir).join("path.txt");
    let mut file = File::create(path_file)?;
    writeln!(file, "{}", zip_path)?;

    match ext {
        "pdf" => {
            info!("[unzip_and_process] Processing PDF: {}", zip_path);
            let t = std::time::Instant::now();
            convert_pdf_to_images(zip_path, extract_dir, progress_status).await?;
            info!(
                "[unzip_and_process] PDF conversion finished in {:.2?}",
                t.elapsed()
            );
        }

        #[cfg(desktop)]
        "epub" | "ebook" => {
            info!("[unzip_and_process] Processing EPUB: {}", zip_path);
            let t = std::time::Instant::now();
            extract_pdf_from_epub(zip_path, extract_dir, progress_status).await?;
            info!(
                "[unzip_and_process] EPUB extraction finished in {:.2?}",
                t.elapsed()
            );
        }

        _ => {
            info!(
                "[unzip_and_process] Processing comic archive: {}",
                zip_path
            );
            let t = std::time::Instant::now();
            extract_comic_pages(zip_path, extract_dir, progress_status).await?;
            info!(
                "[unzip_and_process] comic extraction finished in {:.2?}",
                t.elapsed()
            );
        }
    }

    info!(
        "[unzip_and_process] DONE total elapsed={:.2?}",
        total_start.elapsed()
    );
    Ok(())
}
pub async fn extract_comic_pages(
    archive_path: &str,
    extract_dir: &str,
    progress_status: &Arc<Mutex<crate::commands::state::AppGlobalVariables>>,
) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<(usize, usize, String)>();
    let path = archive_path.to_string();
    let dest = extract_dir.to_string();
    let worker = tokio::task::spawn_blocking(move || -> Result<usize, String> {
        let archive = ComicArchive::open(Path::new(&path)).map_err(|e| e.to_string())?;
        archive
            .extract_pages(Path::new(&dest), &mut |done, total, name| {
                let _ = tx.send((done, total, name.to_string()));
            })
            .map_err(|e| e.to_string())
    });

    while let Some((done, total, name)) = rx.recv().await {
        progress_status
            .lock()
            .await
            .set_progress_status(
                "unzip".to_string(),
                "loading".to_string(),
                ((done * 100) / total.max(1)).to_string(),
                name,
            )
            .await;
    }
    let count = worker.await??;

    progress_status
        .lock()
        .await
        .set_progress_status(
            "unzip".to_string(),
            "done".to_string(),
            "100".to_string(),
            "All images extracted.".to_string(),
        )
        .await;
    if count == 0 {
        info!("[comic] No images found in {}", archive_path);
    } else {
        info!("[comic] Extracted {} pages from {}", count, archive_path);
    }
    Ok(count)
}

#[cfg(desktop)]
pub async fn extract_pdf_from_epub(
    epub_path: &str,
    extract_dir: &str,

    progress_status: &Arc<Mutex<crate::commands::state::AppGlobalVariables>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let file = File::open(epub_path)?;
    let mut archive = ZipArchive::new(file)?;
    fs::create_dir_all(extract_dir)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = Path::new(extract_dir).join(file.name());

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                fs::create_dir_all(p)?;
            }
            let mut outfile = File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }

    let browser = Browser::new(
        LaunchOptionsBuilder::default()
            .headless(true)
            .sandbox(false)
            .build()
            .unwrap(),
    )?;
    let total_files = fs::read_dir(extract_dir)?
        .filter(|entry| {
            if let Ok(entry) = entry {
                if let Some(ext) = entry.path().extension() {
                    return ext == "xhtml";
                }
            }
            false
        })
        .count();
    let entries = fs::read_dir(extract_dir)?;
    let mut count = 0;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "xhtml") {
            let url = format!("file://{}", path.display());
            let tab = browser.new_tab()?;
            tab.navigate_to(&url)?;
            tab.wait_until_navigated()?;
            tokio::time::sleep(Duration::from_millis(300)).await;

            let pdf_data = tab.print_to_pdf(Default::default())?;
            let output_path = format!("{}/page_{}.pdf", extract_dir, count);
            fs::write(output_path, pdf_data)?;
            count += 1;
            progress_status
                .lock()
                .await
                .set_progress_status(
                    "unzip".to_string(),
                    "Converting".to_string(),
                    ((count * 100) / total_files as u32).to_string(),
                    path.display().to_string(),
                )
                .await;
        }
    }
    progress_status
        .lock()
        .await
        .set_progress_status(
            "unzip".to_string(),
            "Merging".to_string(),
            ((count * 100) / total_files as u32).to_string(),
            "Merging PDF files".to_string(),
        )
        .await;
    let output_pdf_path = format!("{}/output.pdf", extract_dir);

    if let Err(e) = merge_pdfs(
        (0..count)
            .map(|i| format!("{}/page_{}.pdf", extract_dir, i))
            .collect::<Vec<String>>()
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<&str>>(),
        &output_pdf_path,
    ) {
        error!("Failed to merge PDFs: {}", e);
    }

    let entries = fs::read_dir(extract_dir)?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "pdf") && !path.ends_with("output.pdf") {
            fs::remove_file(path)?;
        }
    }

    if let Err(e) = convert_pdf_to_images(&output_pdf_path, extract_dir, progress_status).await {
        error!("Failed to convert PDF to images: {}", e);
    }

    fs::remove_file(output_pdf_path)?;
    Ok(())
}

pub async fn convert_pdf_to_images(
    pdf_path: &str,
    output_dir: &str,

    progress_status: &Arc<Mutex<crate::commands::state::AppGlobalVariables>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let pdf_path = pdf_path.to_string();
    let output_dir = output_dir.to_string();
    let progress_status = Arc::clone(progress_status);

    tokio::task::spawn_blocking(move || {
        let pdfium = crate::services::pdfium_service::create_instance()?;
        let pdf_path = Path::new(&pdf_path);
        if !pdf_path.exists() {
            return Err(format!("PDF file does not exist: {}", pdf_path.display()).into());
        }
        let doc = pdfium.load_pdf_from_file(pdf_path, None)?;

        fs::create_dir_all(&output_dir)?;
        let total_pages = doc.pages().len();

        for (i, page) in doc.pages().iter().enumerate() {
            let image = page
                .render_with_config(
                    &PdfRenderConfig::new()
                        .set_target_width(1200)
                        .render_form_data(true),
                )?
                .as_image()
                .into_rgb8();

            let file_path = format!("{}/page_{}.webp", output_dir, i);
            image.save_with_format(file_path, image::ImageFormat::WebP)?;

            let progress_guard = executor::block_on(progress_status.lock());
            executor::block_on(progress_guard.set_progress_status(
                "unzip".to_string(),
                "loading".to_string(),
                ((i * 100) / total_pages as usize).to_string(),
                format!("page_{}", i),
            ));
        }

        let progress_guard = executor::block_on(progress_status.lock());
        executor::block_on(progress_guard.set_progress_status(
            "unzip".to_string(),
            "done".to_string(),
            "100".to_string(),
            "All pages rendered.".to_string(),
        ));

        Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
    })
    .await?
}

#[cfg(desktop)]
fn merge_pdfs(
    input_paths: Vec<&str>,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let pdfium = crate::services::pdfium_service::create_instance()
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
    let mut merged_doc = pdfium.create_new_pdf()?;

    for input_path in input_paths {
        let source_doc = pdfium.load_pdf_from_file(input_path, None)?;
        merged_doc.pages_mut().append(&source_doc)?;
    }

    let save_path = Path::new(output_path);
    merged_doc.save_to_file(save_path)?;

    info!("Merged PDF saved to: {}", output_path);
    Ok(())
}

#[cfg(desktop)]
pub async fn scrape_images_from_webpage(
    url: &str,
    output_dir: &str,
    progress_status: &Arc<Mutex<crate::commands::state::AppGlobalVariables>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let browser = Browser::new(
        LaunchOptionsBuilder::default()
            .headless(true)
            .sandbox(false)
            .build()
            .unwrap(),
    )?;
    let tab = browser.new_tab()?;
    tab.navigate_to(url)?;
    tab.wait_until_navigated()?;

    tokio::time::sleep(Duration::from_secs(3)).await;

    info!("Scrolling page to load lazy images...");
    for _ in 0..5 {
        tab.evaluate("window.scrollBy(0, window.innerHeight);", false)?;
        tokio::time::sleep(Duration::from_millis(800)).await;
    }

    tab.evaluate("window.scrollTo(0, 0);", false)?;
    tokio::time::sleep(Duration::from_secs(1)).await;

    tab.evaluate("window.scrollTo(0, document.body.scrollHeight);", false)?;
    tokio::time::sleep(Duration::from_secs(2)).await;

    let js_code = r#"
        (function() {
            const images = [];
            const seen = new Set();
            const imgElements = document.querySelectorAll('img');
            
            imgElements.forEach(img => {
                // Check multiple possible attributes where image URLs might be stored
                const possibleSources = [
                    img.src,
                    img.getAttribute('data-src'),
                    img.getAttribute('data-lazy-src'),
                    img.getAttribute('data-original'),
                    img.getAttribute('data-srcset'),
                    img.dataset.src,
                    img.dataset.lazySrc,
                    img.dataset.original
                ];
                
                for (const src of possibleSources) {
                    if (src && src.trim() !== '' && !src.startsWith('data:')) {
                        // Handle srcset format (take first URL)
                        const url = src.split(',')[0].split(' ')[0].trim();
                        if (url && !seen.has(url)) {
                            seen.add(url);
                            images.push(url);
                        }
                    }
                }
            });
            
            return JSON.stringify(images);
        })()
    "#;

    let result = tab.evaluate(js_code, false)?;
    let mut images: Vec<String> = Vec::new();

    if let Some(Value::String(json_str)) = result.value {
        images = serde_json::from_str(&json_str)?;
    }

    info!("Found {} images on page {}", images.len(), url);
    fs::create_dir_all(output_dir)?;

    let total_images = images.len();
    let mut downloaded = 0;

    progress_status
        .lock()
        .await
        .set_progress_status(
            "download".to_string(),
            "loading".to_string(),
            "0".to_string(),
            format!("Found {} images", total_images),
        )
        .await;

    for (i, img_url) in images.iter().enumerate() {
        match reqwest::get(img_url).await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.bytes().await {
                        Ok(bytes) => {
                            let file_path = format!("{}/{:05}.jpg", output_dir, i);
                            match File::create(&file_path) {
                                Ok(mut file) => {
                                    if let Err(e) = file.write_all(&bytes) {
                                        error!("Failed to write image {}: {}", i, e);
                                    } else {
                                        downloaded += 1;
                                        info!(
                                            "Downloaded image {}/{}: {}",
                                            downloaded,
                                            images.len(),
                                            img_url
                                        );

                                        let progress = ((downloaded * 100) / total_images) as u32;
                                        progress_status
                                            .lock()
                                            .await
                                            .set_progress_status(
                                                "download".to_string(),
                                                "loading".to_string(),
                                                progress.to_string(),
                                                format!(
                                                    "Downloaded {}/{}",
                                                    downloaded, total_images
                                                ),
                                            )
                                            .await;
                                    }
                                }
                                Err(e) => error!("Failed to create file for image {}: {}", i, e),
                            }
                        }
                        Err(e) => error!("Failed to get bytes for image {}: {}", img_url, e),
                    }
                } else {
                    error!("HTTP {} for image: {}", response.status(), img_url);
                }
            }
            Err(e) => error!("Failed to download image {}: {}", img_url, e),
        }
    }

    info!(
        "Successfully scraped {}/{} images from {}",
        downloaded,
        images.len(),
        url
    );

    progress_status
        .lock()
        .await
        .set_progress_status(
            "download".to_string(),
            "done".to_string(),
            "100".to_string(),
            format!("Downloaded {}/{} images", downloaded, total_images),
        )
        .await;

    tab.close(true)?;
    Ok(())
}

/// Extract the first image from an archive or directory at the given path and return it
/// as raw bytes.  Supports zip/cbz/cbr/rar and plain directories of images.
pub async fn extract_first_image_from_path(
    book_path: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let path = Path::new(book_path);

    if path.is_dir() {
        return extract_first_image_bytes_from_directory(book_path);
    }

    let owned = book_path.to_string();
    tokio::task::spawn_blocking(move || ComicArchive::open(Path::new(&owned))?.read_page(0)).await?
}

/// Read the first image from a directory of image files and return its bytes.
fn extract_first_image_bytes_from_directory(
    dir_path: &str,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let fn_start = std::time::Instant::now();
    info!(
        "[dir] extract_first_image_bytes_from_directory: {}",
        dir_path
    );

    let mut image_files: Vec<std::path::PathBuf> = Vec::new();
    let t_scan = std::time::Instant::now();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() && is_image_file(&p.to_string_lossy()) {
                image_files.push(p);
            }
        }
    }
    info!(
        "[dir] directory scan: {} image files found in {:.2?}",
        image_files.len(),
        t_scan.elapsed()
    );

    let t_sort = std::time::Instant::now();
    image_files.sort();
    info!("[dir] sort in {:.2?}", t_sort.elapsed());

    if let Some(first) = image_files.first() {
        info!("[dir] reading first image: {:?}", first);
        let t_read = std::time::Instant::now();
        let data = fs::read(first)?;
        info!(
            "[dir] read {} bytes in {:.2?} (total {:.2?})",
            data.len(),
            t_read.elapsed(),
            fn_start.elapsed()
        );
        Ok(data)
    } else {
        error!("[dir] no image files found in directory: {}", dir_path);
        Err("No image files found in directory".into())
    }
}

/// Detect image extension from magic bytes.
fn detect_image_ext(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "png"
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "jpg"
    } else if bytes.len() > 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        "webp"
    } else if bytes.starts_with(b"GIF") {
        "gif"
    } else if bytes.starts_with(&[0x42, 0x4D]) {
        "bmp"
    } else {
        "jpg"
    }
}

/// Download an image from a URL and save it to `covers_dir` on disk.
/// `filename` is the base filename without extension (will be sanitised).
/// Returns the absolute path of the saved file.
pub async fn download_image_to_disk(
    url: &str,
    covers_dir: &str,
    filename: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    if url.is_empty() {
        return Err("Empty URL".into());
    }
    info!("[cover] Downloading cover from {}", url);
    fs::create_dir_all(covers_dir)?;

    let response = reqwest::get(url).await?;
    if !response.status().is_success() {
        return Err(format!("HTTP {} fetching cover: {}", response.status(), url).into());
    }
    let bytes = response.bytes().await?;
    if bytes.is_empty() {
        return Err("Empty image response".into());
    }
    let ext = detect_image_ext(&bytes);
    let safe_name: String = filename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let file_path = format!("{}/{}.{}", covers_dir, safe_name, ext);
    fs::write(&file_path, &*bytes)?;
    info!("[cover] Saved cover → {}", file_path);
    Ok(file_path)
}

/// Save raw image bytes to `covers_dir` on disk.
/// `filename` is the base filename without extension (will be sanitised).
/// Returns the absolute path of the saved file.
pub fn save_image_bytes_to_disk(
    bytes: &[u8],
    covers_dir: &str,
    filename: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    fs::create_dir_all(covers_dir)?;
    let ext = detect_image_ext(bytes);
    let safe_name: String = filename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let file_path = format!("{}/{}.{}", covers_dir, safe_name, ext);
    fs::write(&file_path, bytes)?;
    info!("[cover] Saved extracted cover → {}", file_path);
    Ok(file_path)
}

/// Get a specific page (0-indexed) from an archive at the given path.
/// Returns the image bytes for that page.
pub async fn get_page_from_path(
    book_path: &str,
    page_number: i64,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let path = Path::new(book_path);

    if path.is_dir() {
        info!(
            "[dir] get_page_from_path: directory mode, page={}",
            page_number
        );
        return get_page_from_directory(book_path, page_number as usize);
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_lowercase();

    info!(
        "[get_page_from_path] ext={} page={} path={}",
        ext, page_number, book_path
    );
    let t = std::time::Instant::now();
    let result = match ext.as_str() {
        "pdf" => get_page_from_pdf(book_path, page_number as usize).await,
        _ => {
            let owned = book_path.to_string();
            tokio::task::spawn_blocking(move || {
                ComicArchive::open(Path::new(&owned))?.read_page(page_number as usize)
            })
            .await?
        }
    };
    info!(
        "[get_page_from_path] ext={} page={} completed in {:.2?}",
        ext,
        page_number,
        t.elapsed()
    );
    result
}

/// Get a specific page from a plain directory of image files (0-indexed, sorted).
fn get_page_from_directory(
    dir_path: &str,
    page_number: usize,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let fn_start = std::time::Instant::now();
    info!(
        "[dir] get_page_from_directory: page={} path={}",
        page_number, dir_path
    );

    let t_scan = std::time::Instant::now();
    let mut image_files: Vec<std::path::PathBuf> = Vec::new();
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() && is_image_file(&p.to_string_lossy()) {
                image_files.push(p);
            }
        }
    }
    info!(
        "[dir] scan: {} image files found in {:.2?}",
        image_files.len(),
        t_scan.elapsed()
    );

    let t_sort = std::time::Instant::now();
    image_files.sort();
    info!("[dir] sort in {:.2?}", t_sort.elapsed());

    let target = image_files.get(page_number).ok_or_else(|| {
        format!(
            "Page {} out of range (total: {})",
            page_number,
            image_files.len()
        )
    })?;

    info!("[dir] reading page {} from {:?}", page_number, target);
    let t_read = std::time::Instant::now();
    let data = fs::read(target)?;
    info!(
        "[dir] read {} bytes in {:.2?} (total {:.2?})",
        data.len(),
        t_read.elapsed(),
        fn_start.elapsed()
    );
    Ok(data)
}

/// Get a specific page from a PDF rendered as a WebP image.
async fn get_page_from_pdf(
    pdf_path: &str,
    page_number: usize,
) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
    let pdf_path = pdf_path.to_string();
    tokio::task::spawn_blocking(move || {
        let pdfium = crate::services::pdfium_service::create_instance()?;
        let doc = pdfium.load_pdf_from_file(&pdf_path, None)?;

        let page = doc
            .pages()
            .get(page_number as u16)
            .map_err(|e| format!("Failed to get PDF page {}: {}", page_number, e))?;

        let image = page
            .render_with_config(
                &PdfRenderConfig::new()
                    .set_target_width(1200)
                    .render_form_data(true),
            )?
            .as_image()
            .into_rgb8();

        let mut buf = io::Cursor::new(Vec::new());
        image.write_to(&mut buf, image::ImageFormat::WebP)?;
        Ok(buf.into_inner())
    })
    .await?
}

/// Count the number of pages (images) in an archive at the given path.
pub async fn get_pages_count_from_path(
    book_path: &str,
) -> Result<i64, Box<dyn std::error::Error + Send + Sync>> {
    let path = Path::new(book_path);

    if path.is_dir() {
        info!(
            "[dir] get_pages_count_from_path: directory mode path={}",
            book_path
        );
        let t = std::time::Instant::now();
        let count = fs::read_dir(book_path)?
            .flatten()
            .filter(|e| {
                let p = e.path();
                p.is_file() && is_image_file(&p.to_string_lossy())
            })
            .count() as i64;
        info!("[dir] counted {} images in {:.2?}", count, t.elapsed());
        return Ok(count);
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default()
        .to_lowercase();

    info!("[get_pages_count_from_path] ext={} path={}", ext, book_path);
    let t = std::time::Instant::now();
    let result = match ext.as_str() {
        "pdf" => {
            let pdf_path = book_path.to_string();
            let count = tokio::task::spawn_blocking(move || {
                let pdfium = crate::services::pdfium_service::create_instance()?;
                let doc = pdfium.load_pdf_from_file(&pdf_path, None)?;
                Ok::<i64, Box<dyn std::error::Error + Send + Sync>>(doc.pages().len() as i64)
            })
            .await??;
            Ok(count)
        }
        _ => {
            let owned = book_path.to_string();
            tokio::task::spawn_blocking(move || {
                ComicArchive::open(Path::new(&owned))?
                    .page_count()
                    .map(|count| count as i64)
            })
            .await?
        }
    };
    info!(
        "[get_pages_count_from_path] ext={} completed in {:.2?}",
        ext,
        t.elapsed()
    );
    result
}

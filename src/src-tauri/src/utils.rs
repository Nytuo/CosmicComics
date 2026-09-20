#[cfg(desktop)]
pub const VALID_BOOK_EXTENSION: &[&str] = &[
    "cbr", "cbz", "pdf", "zip", "7z", "cb7", "rar", "tar", "cbt", "epub", "ebook",
];
#[cfg(mobile)]
pub const VALID_BOOK_EXTENSION: &[&str] = &[
    "cbr", "cbz", "pdf", "zip", "7z", "cb7", "rar", "tar", "cbt", "epub",
];
pub const VALID_IMAGE_EXTENSION: &[&str] = &[
    "png", "jpg", "jpeg", "jpe", "jfif", "bmp", "apng", "svg", "ico", "webp", "gif", "tiff", "avif",
];

pub fn replace_html_address_path(path: &str) -> String {
    path.replace("%20", " ")
        .replace("ù", "/")
        .replace("%C3%B9", "/")
        .replace("%23", "#")
}

pub fn get_list_of_images(dir_path: &std::path::Path, valid_extensions: &[&str]) -> Vec<String> {
    if let Ok(entries) = std::fs::read_dir(dir_path) {
        let mut list_of_images = Vec::new();
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                let ext_lower = ext.to_lowercase();
                if valid_extensions
                    .iter()
                    .any(|v| v.eq_ignore_ascii_case(&ext_lower))
                {
                    if let Some(file_name) = entry.file_name().to_str() {
                        list_of_images.push(file_name.to_string());
                    }
                }
            }
        }
        list_of_images
    } else {
        Vec::new()
    }
}

pub fn is_image_file(name: &str) -> bool {
    VALID_IMAGE_EXTENSION
        .iter()
        .any(|ext| name.to_lowercase().ends_with(ext))
}

pub fn is_valid_book_entry(path: &std::path::Path) -> bool {
    if path.is_file() {
        return match path.extension().and_then(|e| e.to_str()) {
            Some(ext) => VALID_BOOK_EXTENSION
                .iter()
                .any(|valid| valid.eq_ignore_ascii_case(ext)),
            None => false,
        };
    }

    if path.is_dir() {
        return match std::fs::read_dir(path) {
            Ok(entries) => entries.flatten().filter(|e| e.path().is_file()).any(|e| {
                e.path()
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| {
                        VALID_IMAGE_EXTENSION
                            .iter()
                            .any(|v| v.eq_ignore_ascii_case(ext))
                    })
                    .unwrap_or(false)
            }),
            Err(_) => false,
        };
    }

    false
}

pub fn strip_outer_quotes(s: &str) -> &str {
    if s.starts_with('"') && s.ends_with('"') && s.len() >= 2 {
        &s[1..s.len() - 1]
    } else {
        s
    }
}

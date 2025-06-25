use pdfium_render::prelude::*;
use std::{path::PathBuf, sync::OnceLock};

static PDFIUM_LIB_PATH: OnceLock<String> = OnceLock::new();

pub fn lib_filename() -> &'static str {
    if cfg!(target_os = "windows") {
        "pdfium.dll"
    } else if cfg!(target_os = "macos") {
        "libpdfium.dylib"
    } else {
        "libpdfium.so"
    }
}

pub fn lib_path_in(base_path: &str) -> PathBuf {
    PathBuf::from(base_path).join(lib_filename())
}

pub fn exists_in(base_path: &str) -> bool {
    lib_path_in(base_path).exists()
}

pub fn init(base_path: &str) -> Result<(), String> {
    let path = lib_path_in(base_path);
    if !path.exists() {
        return Err(format!("pdfium library not found at {:?}", path));
    }
    let path_str = path
        .to_str()
        .ok_or("pdfium lib path contains invalid UTF-8")?
        .to_string();
    let _ = PDFIUM_LIB_PATH.set(path_str);
    tracing::info!("pdfium library registered at {:?}", path);
    Ok(())
}

pub fn create_instance() -> Result<Pdfium, String> {
    if let Some(path) = PDFIUM_LIB_PATH.get() {
        Pdfium::bind_to_library(path)
            .map(Pdfium::new)
            .map_err(|e| format!("Failed to bind pdfium from '{path}': {e}"))
    } else {
        Ok(Pdfium::default())
    }
}

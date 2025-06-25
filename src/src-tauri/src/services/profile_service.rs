use std::fs;
use std::path::Path;

use serde_json::json;

/// Ensure the app data directory is initialized with a config.json.
pub async fn ensure_initialized(base_path: &str) -> Result<(), String> {
    let book_path = format!("{}/current_book", base_path);
    fs::create_dir_all(&book_path)
        .map_err(|e| format!("Failed to create current_book dir: {}", e))?;

    let config_path = format!("{}/config.json", base_path);
    if !Path::new(&config_path).exists() {
        let default_config = json!({
            "path": "",
            "last_opened": "",
            "language": "us",
            "update_provider": "",
            "ZoomLVL": 10,
            "Scroll_bar_visible": true,
            "Background_color": "rgb(33,33,33)",
            "WebToonMode": false,
            "Vertical_Reader_Mode": false,
            "Page_Counter": true,
            "SideBar": false,
            "NoBar": false,
            "SlideShow": false,
            "SlideShow_Time": 1,
            "Rotate_All": 0,
            "Margin": 0,
            "Manga_Mode": false,
            "No_Double_Page_For_Horizontal": false,
            "Blank_page_At_Begginning": false,
            "Double_Page_Mode": false,
            "Automatic_Background_Color": false,
            "magnifier_zoom": 1,
            "magnifier_Width": 100,
            "magnifier_Height": 100,
            "magnifier_Radius": 0,
            "reset_zoom": false,
            "force_update": false,
            "skip": false,
            "display_style": 0,
            "theme": "default.css",
            "theme_date": true
        });

        fs::write(
            &config_path,
            serde_json::to_string_pretty(&default_config).unwrap(),
        )
        .map_err(|e| format!("Failed to write config: {}", e))?;
    }

    Ok(())
}

mod commands;
mod downloaders;
pub mod models;
pub mod providers;
pub mod repositories;
pub mod services;
pub mod utils;

use commands::state::AppState;
use services::panel_detection_service;
use std::{env, fs, path::PathBuf};
use tauri::{Emitter, Manager};
use tracing_subscriber::fmt::time::ChronoLocal;

fn setup_directories(base_path: &str) {
    fs::create_dir_all(PathBuf::from(base_path).join("current_book")).ok();
    fs::create_dir_all(PathBuf::from(base_path).join("FirstImagesOfAll")).ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(env::var("LOG").unwrap_or_else(|_| "debug".into()))
        .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S".to_string()))
        .with_target(true)
        .with_thread_names(false)
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(move |app| {
            let dev_mode = env::var("DEV_MODE").unwrap_or_else(|_| "false".to_string());
            let base_path: String = if dev_mode == "true" {
                env::current_dir().unwrap().to_str().unwrap().to_string()
            } else if PathBuf::from("portable.txt").exists() {
                PathBuf::from("./..")
                    .join("CosmicData")
                    .to_str()
                    .unwrap()
                    .to_string()
            } else {
                app.path()
                    .app_data_dir()
                    .expect("failed to resolve app data dir")
                    .to_str()
                    .unwrap()
                    .to_string()
            };

            setup_directories(&base_path);

            let app_state = AppState::new(base_path.clone(), app.handle().clone());
            app.manage(app_state);

            let init_base_path = base_path.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = services::profile_service::ensure_initialized(&init_base_path).await
                {
                    tracing::error!("Failed to auto-initialize app data: {}", e);
                }
            });

            let cred_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                for attempt in 0..5u8 {
                    tokio::time::sleep(std::time::Duration::from_millis(
                        500 + attempt as u64 * 500,
                    ))
                    .await;
                    let state = cred_handle.state::<AppState>();
                    match commands::settings::load_credentials_into_state(&state).await {
                        Ok(_) => break,
                        Err(e) => tracing::warn!(
                            "[startup] load_credentials attempt {}: {}",
                            attempt + 1,
                            e
                        ),
                    }
                }
            });

            let update_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
                match commands::updater::check_for_update(update_handle.clone()).await {
                    Ok(Some(info)) => {
                        tracing::info!("Update available: {}", info.version);
                        let _ = update_handle.emit("updater-update-available", &info);
                    }
                    Ok(None) => tracing::info!("App is up to date."),
                    Err(e) => tracing::warn!("Update check failed: {}", e),
                }
            });

            let file_extensions = ["cbz", "cbr", "cbt", "rar", "zip", "7z", "epub", "pdf"];
            let args: Vec<String> = env::args().collect();
            for arg in args.iter().skip(1) {
                let path = std::path::Path::new(arg);
                if let Some(ext) = path.extension() {
                    let ext_lower = ext.to_string_lossy().to_lowercase();
                    if file_extensions.contains(&ext_lower.as_str()) && path.exists() {
                        let file_path = path.to_string_lossy().to_string();
                        tracing::info!("Opening file from CLI args: {}", file_path);
                        let handle = app.handle().clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                            handle.emit("open-file", file_path).unwrap_or_else(|e| {
                                tracing::error!("Failed to emit open-file event: {}", e);
                            });
                        });
                        break;
                    }
                }
            }

            let model_path = PathBuf::from(&base_path).join("model.onnx");
            #[cfg(feature = "ai")]
            {
                if model_path.exists() {
                    let model_path_str = model_path.to_str().unwrap();
                    match panel_detection_service::init_model(model_path_str) {
                        Ok(_) => tracing::info!("AI Model initialized from: {:?}", model_path_str),
                        Err(e) => tracing::warn!("Failed to init AI Model: {}", e),
                    }
                } else {
                    tracing::info!(
                        "AI Model not found at {:?} – will prompt user to download.",
                        model_path
                    );
                }
            }

            #[cfg(not(feature = "ai"))]
            {
                if model_path.exists() {
                    tracing::warn!(
                        "AI Model found at {:?} but application was compiled without AI support.",
                        model_path
                    );
                } else {
                    tracing::info!(
                        "AI Model not found at {:?} – AI support is disabled at compile time.",
                        model_path
                    );
                }
            }

            if services::pdfium_service::exists_in(&base_path) {
                match services::pdfium_service::init(&base_path) {
                    Ok(_) => tracing::info!(
                        "pdfium library initialised from: {:?}",
                        services::pdfium_service::lib_path_in(&base_path)
                    ),
                    Err(e) => tracing::warn!("Failed to init pdfium: {}", e),
                }
            } else {
                tracing::info!(
                    "pdfium library not found in base_path – will prompt user to download."
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::profile::download_database,
            commands::profile::refresh_metadata_by_provider,
            commands::collectionner::fill_blank_images,
            commands::collectionner::insert_anilist_book,
            commands::collectionner::insert_marvel_book,
            commands::collectionner::insert_googlebooks_book,
            commands::collectionner::insert_openlibrary_book,
            commands::collectionner::insert_book_by_provider,
            commands::collectionner::refresh_metadata,
            commands::collectionner::get_folders_list,
            commands::collectionner::get_files_and_folders_list,
            commands::collectionner::download_book_from_url,
            commands::collectionner::list_downloaded_items,
            commands::collectionner::insert_marvel_book_by_name,
            commands::collectionner::insert_anilist_book_by_name,
            commands::collectionner::insert_googlebooks_book_by_name,
            commands::collectionner::insert_openlibrary_book_by_name,
            commands::collectionner::insert_metron_book_by_name,
            commands::viewer::update_reading_progress,
            commands::viewer::unzip_book,
            commands::viewer::list_extracted_images,
            commands::viewer::list_images_in_directory,
            commands::viewer::is_directory,
            commands::viewer::path_exists,
            commands::viewer::read_text_file,
            commands::viewer::detect_panels,
            commands::viewer::detect_panels_batch,
            commands::viewer::clear_panel_cache,
            commands::database::get_all_books,
            commands::database::get_book_by_id,
            commands::database::search_books,
            commands::database::get_books_by_series,
            commands::database::get_books_by_path,
            commands::database::delete_book,
            commands::database::update_book_status_all,
            commands::database::update_book_status_one,
            commands::database::update_fields,
            commands::database::toggle_favorite,
            commands::database::update_rating,
            commands::database::scan_all_libraries,
            commands::database::get_all_series,
            commands::database::get_series_by_id,
            commands::database::delete_series,
            commands::database::create_scan_path,
            commands::database::get_all_scan_paths,
            commands::database::delete_scan_path,
            commands::database::update_scan_path,
            commands::database::create_manual_book,
            commands::database::create_manual_series,
            commands::database::insert_new_book_by_provider,
            commands::database::get_bookmarks,
            commands::database::create_bookmark,
            commands::database::delete_bookmark,
            commands::database::get_field_schema,
            commands::database::export_database,
            commands::settings::get_app_version,
            commands::settings::get_base_path,
            commands::settings::get_user_config,
            commands::settings::write_user_config,
            commands::settings::get_credential_definitions,
            commands::settings::get_api_credentials,
            commands::settings::save_api_credentials,
            commands::ai_model::check_ai_model,
            commands::ai_model::download_ai_model,
            commands::pdfium::check_pdfium,
            commands::pdfium::get_pdfium_platform_info,
            commands::pdfium::download_pdfium,
            commands::updater::check_for_update,
            commands::updater::install_update,
            commands::updater::open_releases_page,
            commands::updater::restart_app,
            commands::common::get_progress,
            commands::common::ping,
            commands::api::search_anilist,
            commands::api::marvel_search_only,
            commands::api::marvel_get_comics,
            commands::api::add_series_by_provider,
            commands::api::anilist_search_only,
            commands::api::googlebooks_get_comics,
            commands::api::openlibrary_get_comics,
            commands::api::metron_search_issues,
            commands::api::metron_search_series,
            commands::api::metron_get_comics,
            commands::api::metron_link_placeholder_to_path,
            downloaders::marvel_unlimited::open_marvel_unlimited_auth,
            downloaders::marvel_unlimited::get_marvel_unlimited_cookies,
            downloaders::marvel_unlimited::close_marvel_unlimited_auth,
            downloaders::marvel_unlimited::load_saved_marvel_unlimited_cookies,
            downloaders::marvel_unlimited::clear_saved_marvel_unlimited_cookies,
            downloaders::marvel_unlimited::has_saved_marvel_unlimited_cookies,
            downloaders::marvel_unlimited::search_marvel_unlimited_comics,
            downloaders::marvel_unlimited::search_marvel_unlimited_series,
            downloaders::marvel_unlimited::get_marvel_series_comics,
            downloaders::marvel_unlimited::get_marvel_comic_details,
            downloaders::marvel_unlimited::download_marvel_unlimited_comic,
            downloaders::marvel_unlimited::save_marvel_images,
            downloaders::marvel_unlimited::get_marvel_unlimited_download_progress,
            downloaders::marvel_unlimited::get_marvel_unlimited_new_comics,
            downloaders::marvel_unlimited::save_new_comics_cache,
            downloaders::marvel_unlimited::load_new_comics_cache,
            downloaders::marvel_unlimited::insert_marvel_unlimited_book_to_db,
            downloaders::mangadex::mangadex_authenticate,
            downloaders::mangadex::mangadex_refresh_token,
            downloaders::mangadex::load_saved_mangadex_tokens,
            downloaders::mangadex::clear_saved_mangadex_tokens,
            downloaders::mangadex::has_saved_mangadex_tokens,
            downloaders::mangadex::search_mangadex_manga,
            downloaders::mangadex::get_mangadex_manga_details,
            downloaders::mangadex::get_mangadex_chapters,
            downloaders::mangadex::download_mangadex_chapter,
            downloaders::mangadex::get_mangadex_recently_updated,
            downloaders::mangadex::insert_mangadex_book_to_db,
            downloaders::getcomics::search_getcomics,
            downloaders::getcomics::get_getcomics_latest,
            downloaders::getcomics::get_getcomics_detail,
            downloaders::getcomics::download_getcomics,
            downloaders::getcomics::save_getcomics_latest_cache,
            downloaders::getcomics::load_getcomics_latest_cache,
            downloaders::getcomics::insert_getcomics_book_to_db,
            downloaders::dc_infinite::open_dc_infinite_auth,
            downloaders::dc_infinite::get_dc_infinite_cookies,
            downloaders::dc_infinite::close_dc_infinite_auth,
            downloaders::dc_infinite::load_saved_dc_infinite_cookies,
            downloaders::dc_infinite::clear_saved_dc_infinite_cookies,
            downloaders::dc_infinite::has_saved_dc_infinite_cookies,
            downloaders::dc_infinite::search_dc_infinite_comics,
            downloaders::dc_infinite::search_dc_infinite_series,
            downloaders::dc_infinite::get_dc_series_comics,
            downloaders::dc_infinite::get_dc_comic_details,
            downloaders::dc_infinite::download_dc_infinite_comic,
            downloaders::dc_infinite::get_dc_infinite_download_progress,
            downloaders::dc_infinite::get_dc_infinite_new_comics,
            downloaders::dc_infinite::save_dc_new_comics_cache,
            downloaders::dc_infinite::load_dc_new_comics_cache,
            downloaders::dc_infinite::insert_dc_infinite_book_to_db,
            downloaders::viz::open_viz_auth,
            downloaders::viz::get_viz_cookies,
            downloaders::viz::close_viz_auth,
            downloaders::viz::load_saved_viz_cookies,
            downloaders::viz::clear_saved_viz_cookies,
            downloaders::viz::has_saved_viz_cookies,
            downloaders::viz::search_viz_manga,
            downloaders::viz::search_viz_series,
            downloaders::viz::get_viz_series_chapters,
            downloaders::viz::get_viz_chapter_details,
            downloaders::viz::download_viz_chapter,
            downloaders::viz::get_viz_download_progress,
            downloaders::viz::get_viz_latest_chapters,
            downloaders::viz::save_viz_latest_cache,
            downloaders::viz::load_viz_latest_cache,
            downloaders::viz::insert_viz_book_to_db,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                let file_extensions = ["cbz", "cbr", "cbt", "rar", "zip", "7z", "epub", "pdf"];
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        if let Some(ext) = path.extension() {
                            let ext_lower = ext.to_string_lossy().to_lowercase();
                            if file_extensions.contains(&ext_lower.as_str()) {
                                let file_path = path.to_string_lossy().to_string();
                                tracing::info!("Opening file from OS event: {}", file_path);
                                app.emit("open-file", file_path).unwrap_or_else(|e| {
                                    tracing::error!("Failed to emit open-file event: {}", e);
                                });
                            }
                        }
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = event;
        });
}

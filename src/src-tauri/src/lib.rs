mod commands;
#[cfg(desktop)]
mod downloaders;
pub mod models;
pub mod providers;
pub mod repositories;
pub mod services;
pub mod utils;

use commands::state::AppState;
#[cfg(all(feature = "ai", desktop))]
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

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .register_asynchronous_uri_scheme_protocol("jfimg", |ctx, request, responder| {
            let app = ctx.app_handle().clone();
            let uri = request.uri().clone();
            tauri::async_runtime::spawn(async move {
                responder.respond(commands::jellyfin::serve_cover(&app, &uri).await);
            });
        })
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

            #[cfg(desktop)]
            let update_handle = app.handle().clone();
            #[cfg(desktop)]
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

            #[cfg(desktop)]
            let file_extensions = ["cbz", "cbr", "cb7", "cbt", "rar", "zip", "7z", "epub", "pdf"];
            #[cfg(desktop)]
            let args: Vec<String> = env::args().collect();
            #[cfg(desktop)]
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
            #[cfg(all(feature = "ai", desktop))]
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

            #[cfg(not(all(feature = "ai", desktop)))]
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

            #[cfg(desktop)]
            {
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
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::stats::stats_record_session,
            commands::stats::stats_get_overview,
            commands::stats::stats_clear_history,
            commands::platform::get_platform_capabilities,
            commands::platform::import_local_files,
            commands::jellyfin::jellyfin_discover_server,
            commands::jellyfin::jellyfin_login,
            commands::jellyfin::jellyfin_quick_connect_start,
            commands::jellyfin::jellyfin_quick_connect_poll,
            commands::jellyfin::jellyfin_list_servers,
            commands::jellyfin::jellyfin_remove_server,
            commands::jellyfin::jellyfin_get_views,
            commands::jellyfin::jellyfin_get_items,
            commands::jellyfin::jellyfin_get_item,
            commands::jellyfin::jellyfin_get_resume,
            commands::jellyfin::jellyfin_set_played,
            commands::jellyfin::jellyfin_set_favorite,
            commands::jellyfin::jellyfin_report_progress,
            commands::jellyfin::jellyfin_report_fraction,
            commands::jellyfin::jellyfin_prepare_book,
            commands::jellyfin::jellyfin_clear_cache,
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
            #[cfg(desktop)]
            commands::collectionner::download_book_from_url,
            commands::collectionner::list_downloaded_items,
            commands::collectionner::insert_marvel_book_by_name,
            commands::collectionner::insert_anilist_book_by_name,
            commands::collectionner::insert_googlebooks_book_by_name,
            commands::collectionner::insert_openlibrary_book_by_name,
            commands::collectionner::insert_metron_book_by_name,
            commands::viewer::update_reading_progress,
            commands::viewer::unzip_book,
            commands::viewer::begin_book_pages,
            commands::viewer::save_book_page,
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
            #[cfg(desktop)]
            commands::updater::check_for_update,
            #[cfg(desktop)]
            commands::updater::install_update,
            #[cfg(desktop)]
            commands::updater::open_releases_page,
            #[cfg(desktop)]
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
            #[cfg(desktop)]
            downloaders::marvel_unlimited::open_marvel_unlimited_auth,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::get_marvel_unlimited_cookies,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::close_marvel_unlimited_auth,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::load_saved_marvel_unlimited_cookies,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::clear_saved_marvel_unlimited_cookies,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::has_saved_marvel_unlimited_cookies,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::search_marvel_unlimited_comics,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::search_marvel_unlimited_series,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::get_marvel_series_comics,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::get_marvel_comic_details,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::download_marvel_unlimited_comic,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::save_marvel_images,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::get_marvel_unlimited_download_progress,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::get_marvel_unlimited_new_comics,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::save_new_comics_cache,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::load_new_comics_cache,
            #[cfg(desktop)]
            downloaders::marvel_unlimited::insert_marvel_unlimited_book_to_db,
            #[cfg(desktop)]
            downloaders::mangadex::mangadex_authenticate,
            #[cfg(desktop)]
            downloaders::mangadex::mangadex_refresh_token,
            #[cfg(desktop)]
            downloaders::mangadex::load_saved_mangadex_tokens,
            #[cfg(desktop)]
            downloaders::mangadex::clear_saved_mangadex_tokens,
            #[cfg(desktop)]
            downloaders::mangadex::has_saved_mangadex_tokens,
            #[cfg(desktop)]
            downloaders::mangadex::search_mangadex_manga,
            #[cfg(desktop)]
            downloaders::mangadex::get_mangadex_manga_details,
            #[cfg(desktop)]
            downloaders::mangadex::get_mangadex_chapters,
            #[cfg(desktop)]
            downloaders::mangadex::download_mangadex_chapter,
            #[cfg(desktop)]
            downloaders::mangadex::get_mangadex_recently_updated,
            #[cfg(desktop)]
            downloaders::mangadex::insert_mangadex_book_to_db,
            #[cfg(desktop)]
            downloaders::getcomics::search_getcomics,
            #[cfg(desktop)]
            downloaders::getcomics::get_getcomics_latest,
            #[cfg(desktop)]
            downloaders::getcomics::get_getcomics_detail,
            #[cfg(desktop)]
            downloaders::getcomics::download_getcomics,
            #[cfg(desktop)]
            downloaders::getcomics::save_getcomics_latest_cache,
            #[cfg(desktop)]
            downloaders::getcomics::load_getcomics_latest_cache,
            #[cfg(desktop)]
            downloaders::getcomics::insert_getcomics_book_to_db,
            #[cfg(desktop)]
            downloaders::dc_infinite::open_dc_infinite_auth,
            #[cfg(desktop)]
            downloaders::dc_infinite::get_dc_infinite_cookies,
            #[cfg(desktop)]
            downloaders::dc_infinite::close_dc_infinite_auth,
            #[cfg(desktop)]
            downloaders::dc_infinite::load_saved_dc_infinite_cookies,
            #[cfg(desktop)]
            downloaders::dc_infinite::clear_saved_dc_infinite_cookies,
            #[cfg(desktop)]
            downloaders::dc_infinite::has_saved_dc_infinite_cookies,
            #[cfg(desktop)]
            downloaders::dc_infinite::search_dc_infinite_comics,
            #[cfg(desktop)]
            downloaders::dc_infinite::search_dc_infinite_series,
            #[cfg(desktop)]
            downloaders::dc_infinite::get_dc_series_comics,
            #[cfg(desktop)]
            downloaders::dc_infinite::get_dc_comic_details,
            #[cfg(desktop)]
            downloaders::dc_infinite::download_dc_infinite_comic,
            #[cfg(desktop)]
            downloaders::dc_infinite::get_dc_infinite_download_progress,
            #[cfg(desktop)]
            downloaders::dc_infinite::get_dc_infinite_new_comics,
            #[cfg(desktop)]
            downloaders::dc_infinite::save_dc_new_comics_cache,
            #[cfg(desktop)]
            downloaders::dc_infinite::load_dc_new_comics_cache,
            #[cfg(desktop)]
            downloaders::dc_infinite::insert_dc_infinite_book_to_db,
            #[cfg(desktop)]
            downloaders::viz::open_viz_auth,
            #[cfg(desktop)]
            downloaders::viz::get_viz_cookies,
            #[cfg(desktop)]
            downloaders::viz::close_viz_auth,
            #[cfg(desktop)]
            downloaders::viz::load_saved_viz_cookies,
            #[cfg(desktop)]
            downloaders::viz::clear_saved_viz_cookies,
            #[cfg(desktop)]
            downloaders::viz::has_saved_viz_cookies,
            #[cfg(desktop)]
            downloaders::viz::search_viz_manga,
            #[cfg(desktop)]
            downloaders::viz::search_viz_series,
            #[cfg(desktop)]
            downloaders::viz::get_viz_series_chapters,
            #[cfg(desktop)]
            downloaders::viz::get_viz_chapter_details,
            #[cfg(desktop)]
            downloaders::viz::download_viz_chapter,
            #[cfg(desktop)]
            downloaders::viz::get_viz_download_progress,
            #[cfg(desktop)]
            downloaders::viz::get_viz_latest_chapters,
            #[cfg(desktop)]
            downloaders::viz::save_viz_latest_cache,
            #[cfg(desktop)]
            downloaders::viz::load_viz_latest_cache,
            #[cfg(desktop)]
            downloaders::viz::insert_viz_book_to_db,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let tauri::RunEvent::Opened { urls } = event {
                let file_extensions = ["cbz", "cbr", "cb7", "cbt", "rar", "zip", "7z", "epub", "pdf"];
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
            #[cfg(not(any(target_os = "macos", target_os = "ios")))]
            let _ = event;
        });
}

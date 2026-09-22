pub mod ai_model;
pub mod api;
pub mod collectionner;
pub mod common;
pub mod database;
pub mod jellyfin;
pub mod open_file;
pub mod pdfium;
pub mod platform;
pub mod profile;
pub mod settings;
pub mod state;
pub mod stats;
pub mod sync;
#[cfg(desktop)]
pub mod updater;
pub mod viewer;
#[allow(unused_imports)]
pub use state::AppState;

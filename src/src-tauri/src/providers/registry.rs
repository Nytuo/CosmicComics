//! Provider registry — the central place where all providers are registered.
//!
//! # How to add a new provider
//!
//! 1. Create a new file, e.g. `my_provider.rs`, with a struct implementing
//!    the `Provider` trait from `provider_trait.rs`.
//! 2. Add a new variant to `ProviderKind` in `provider_trait.rs`.
//! 3. Add `mod my_provider;` below.
//! 4. Import the struct and add it to the `providers()` function.
//! 5. That's it — every part of the backend will pick it up automatically

use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Arc;

use super::provider_trait::{Provider, ProviderKind};

use super::anilist_provider::AnilistProvider;
use super::googlebooks_provider::GoogleBooksProvider;
use super::metron_provider::MetronProvider;
use super::openlibrary_provider::OpenLibraryProvider;

/// Static list of all registered providers.
static PROVIDERS: Lazy<Vec<Arc<dyn Provider>>> = Lazy::new(|| {
    vec![
        //Arc::new(MarvelProvider), // deactivated since API shutdown
        Arc::new(AnilistProvider),
        Arc::new(OpenLibraryProvider),
        Arc::new(GoogleBooksProvider),
        Arc::new(MetronProvider),
    ]
});

/// Quick lookup by `ProviderKind`.
static PROVIDER_MAP: Lazy<HashMap<ProviderKind, Arc<dyn Provider>>> = Lazy::new(|| {
    PROVIDERS
        .iter()
        .map(|p| (p.kind(), Arc::clone(p)))
        .collect()
});

/// Get a provider by its `ProviderKind`.
pub fn get_provider(kind: ProviderKind) -> Option<Arc<dyn Provider>> {
    PROVIDER_MAP.get(&kind).cloned()
}

/// Get a provider by its numeric ID.
pub fn get_provider_by_id(id: u8) -> Option<Arc<dyn Provider>> {
    ProviderKind::from_id(id).and_then(|kind| get_provider(kind))
}

/// Get a provider or panic — use only when you are sure the provider exists.
pub fn get_provider_or_panic(kind: ProviderKind) -> Arc<dyn Provider> {
    get_provider(kind).unwrap_or_else(|| panic!("Provider not registered: {:?}", kind))
}

/// Get all registered providers.
pub fn all_providers() -> &'static [Arc<dyn Provider>] {
    &PROVIDERS
}

/// Get all providers that support series search (for the matching engine).
pub fn searchable_series_providers() -> Vec<Arc<dyn Provider>> {
    PROVIDERS
        .iter()
        .filter(|p| p.can_search_series())
        .cloned()
        .collect()
}

/// Get all providers that support book search.
pub fn searchable_books_providers() -> Vec<Arc<dyn Provider>> {
    PROVIDERS
        .iter()
        .filter(|p| p.can_search_books())
        .cloned()
        .collect()
}

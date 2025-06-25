pub mod provider_trait;
pub mod registry;

pub mod anilist_provider;
pub mod googlebooks_provider;
pub mod marvel_provider;
pub mod metron_provider;
pub mod openlibrary_provider;

// Re-export the most commonly used items
pub use provider_trait::{ApiCredentials, ProviderKind, SearchCandidate};
pub use registry::{get_provider_or_panic, searchable_series_providers};

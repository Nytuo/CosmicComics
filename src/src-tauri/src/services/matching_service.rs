use anyhow::Result;
use tracing::{debug, info, warn};

use crate::providers::{
    searchable_series_providers, ApiCredentials, ProviderKind, SearchCandidate,
};

pub type MatchCandidate = SearchCandidate;
pub type Provider = ProviderKind;

/// Configuration for the matching algorithm
#[derive(Debug, Clone)]
pub struct MatchingConfig {
    pub title_weight: f64,
    pub metadata_weight: f64,
    pub year_weight: f64,
    pub min_confidence_threshold: f64,
    pub strict_mode: bool,
}

impl Default for MatchingConfig {
    fn default() -> Self {
        MatchingConfig {
            title_weight: 0.5,
            metadata_weight: 0.3,
            year_weight: 0.2,
            min_confidence_threshold: 0.6,
            strict_mode: true,
        }
    }
}

/// Search all providers and return the best match
pub async fn find_best_match(
    name: &str,
    year: Option<i32>,
    marvel_private_key: Option<&str>,
    marvel_public_key: Option<&str>,
    google_api_key: Option<&str>,
    metron_username: Option<&str>,
    metron_password: Option<&str>,
    config: Option<MatchingConfig>,
) -> Result<Option<MatchCandidate>> {
    let config = config.unwrap_or_default();

    info!("Searching for best match: {} (year: {:?})", name, year);

    let creds = ApiCredentials {
        marvel_public_key: marvel_public_key.unwrap_or_default().to_string(),
        marvel_private_key: marvel_private_key.unwrap_or_default().to_string(),
        google_books_api_key: google_api_key.unwrap_or_default().to_string(),
        metron_username: metron_username.unwrap_or_default().to_string(),
        metron_password: metron_password.unwrap_or_default().to_string(),
        ..Default::default()
    };

    let mut candidates = Vec::new();

    for provider in searchable_series_providers() {
        let kind = provider.kind();

        match kind {
            ProviderKind::Marvel => {
                if creds.marvel_private_key.is_empty() || creds.marvel_public_key.is_empty() {
                    debug!("  - {} skipped (no credentials)", kind.name());
                    continue;
                }
            }
            ProviderKind::GoogleBooks => {
                if creds.google_books_api_key.is_empty() {
                    debug!("  - {} skipped (no API key)", kind.name());
                    continue;
                }
            }
            ProviderKind::Metron => {
                if creds.metron_username.is_empty() || creds.metron_password.is_empty() {
                    debug!("  - {} skipped (no credentials)", kind.name());
                    continue;
                }
            }
            _ => {}
        }

        info!("→ Querying {} API...", kind.name());
        match provider.search_series(name, year, &creds).await {
            Ok(mut results) => {
                let count = results.len();
                candidates.append(&mut results);
                info!("  ✓ {}: {} candidates", kind.name(), count);
            }
            Err(e) => warn!("  ✗ {} search failed: {}", kind.name(), e),
        }
    }

    if candidates.is_empty() {
        warn!("✗ No candidates found across all providers for: {}", name);
        return Ok(None);
    }

    info!("📊 Scoring {} total candidates...", candidates.len());

    for candidate in &mut candidates {
        candidate.confidence_score = calculate_confidence_score(name, year, candidate, &config);
        debug!(
            "  {} - {}: {:.3}",
            candidate.provider_id.name(),
            candidate.title,
            candidate.confidence_score
        );
    }

    candidates.sort_by(|a, b| b.confidence_score.partial_cmp(&a.confidence_score).unwrap());

    info!(
        "Top 3 candidates: 1) {} ({:.3}) | 2) {} ({:.3}) | 3) {} ({:.3})",
        format!(
            "{} - {}",
            candidates[0].provider_id.name(),
            candidates[0].title
        ),
        candidates[0].confidence_score,
        candidates
            .get(1)
            .map(|c| format!("{} - {}", c.provider_id.name(), c.title))
            .unwrap_or_else(|| "N/A".to_string()),
        candidates.get(1).map(|c| c.confidence_score).unwrap_or(0.0),
        candidates
            .get(2)
            .map(|c| format!("{} - {}", c.provider_id.name(), c.title))
            .unwrap_or_else(|| "N/A".to_string()),
        candidates.get(2).map(|c| c.confidence_score).unwrap_or(0.0),
    );

    let best = &candidates[0];
    if best.confidence_score >= config.min_confidence_threshold {
        info!(
            "MATCH ACCEPTED: '{}' from {} (confidence: {:.3} ≥ threshold {:.2})",
            best.title,
            best.provider_id.name(),
            best.confidence_score,
            config.min_confidence_threshold
        );
        Ok(Some(best.clone()))
    } else {
        warn!(
            "MATCH REJECTED: Best candidate '{}' from {} has confidence {:.3} < threshold {:.2}",
            best.title,
            best.provider_id.name(),
            best.confidence_score,
            config.min_confidence_threshold
        );
        Ok(None)
    }
}

/// Calculate confidence score for a candidate match
fn calculate_confidence_score(
    search_name: &str,
    search_year: Option<i32>,
    candidate: &MatchCandidate,
    config: &MatchingConfig,
) -> f64 {
    let mut score = 0.0;

    let title_score = calculate_title_similarity(search_name, &candidate.title, config.strict_mode);
    let title_contribution = title_score * config.title_weight;
    score += title_contribution;

    let metadata_score = calculate_metadata_score(candidate);
    let metadata_contribution = metadata_score * config.metadata_weight;
    score += metadata_contribution;

    let year_contribution =
        if let (Some(search_yr), Some(candidate_yr)) = (search_year, candidate.year) {
            let year_diff = (search_yr - candidate_yr).abs();
            let year_score = if year_diff == 0 {
                1.0
            } else if year_diff <= 1 {
                0.8
            } else if year_diff <= 3 {
                0.5
            } else {
                0.0
            };
            year_score * config.year_weight
        } else {
            0.5 * config.year_weight
        };
    score += year_contribution;

    debug!(
        "    Score breakdown for '{}': title={:.3}×{:.1}={:.3}, meta={:.3}×{:.1}={:.3}, year={:.3} → total={:.3}",
        candidate.title,
        title_score,
        config.title_weight,
        title_contribution,
        metadata_score,
        config.metadata_weight,
        metadata_contribution,
        year_contribution,
        score
    );

    score
}

/// Calculate title similarity using normalized Levenshtein distance
fn calculate_title_similarity(search: &str, candidate: &str, strict_mode: bool) -> f64 {
    let search_normalized = normalize_title(search);
    let candidate_normalized = normalize_title(candidate);

    debug!(
        "      Title compare: '{}' vs '{}' (strict_mode: {})",
        search_normalized, candidate_normalized, strict_mode
    );

    if search_normalized == candidate_normalized {
        debug!("      Title: EXACT MATCH (1.0)");
        return 1.0;
    }

    if strict_mode {
        let penalty = calculate_special_edition_penalty(search, candidate);
        if penalty > 0.0 {
            debug!(
                "      Title: Special edition/spin-off detected, penalty: {:.3}",
                penalty
            );

            if penalty >= 0.7 {
                debug!("      Title: HIGH PENALTY - filtering out this candidate");
                return 0.0;
            }
        }
    }

    let search_contains_candidate = search_normalized.contains(&candidate_normalized);
    let candidate_contains_search = candidate_normalized.contains(&search_normalized);

    if search_contains_candidate || candidate_contains_search {
        return if strict_mode {
            let search_len = search_normalized.len() as f64;
            let candidate_len = candidate_normalized.len() as f64;
            let length_ratio = if candidate_len > search_len {
                search_len / candidate_len
            } else {
                candidate_len / search_len
            };

            if candidate_len > search_len * 1.5 {
                debug!(
                    "      Title: CONTAINS but too long (ratio: {:.3}), score: 0.3",
                    length_ratio
                );
                return 0.3;
            }

            let score = 0.85 * length_ratio;
            debug!(
                "      Title: CONTAINS MATCH (length-adjusted: {:.3})",
                score
            );
            score
        } else {
            debug!("      Title: CONTAINS MATCH (0.9)");
            0.9
        };
    }

    let distance = levenshtein_distance(&search_normalized, &candidate_normalized);
    let max_len = search_normalized.len().max(candidate_normalized.len()) as f64;

    if max_len == 0.0 {
        return 0.0;
    }

    let similarity = 1.0 - (distance as f64 / max_len);
    debug!(
        "      Title: Levenshtein distance={}, max_len={}, similarity={:.3}",
        distance, max_len, similarity
    );
    similarity
}

/// Detect and penalize special editions, spin-offs, and subtitled versions
fn calculate_special_edition_penalty(search: &str, candidate: &str) -> f64 {
    let search_lower = search.to_lowercase();
    let candidate_lower = candidate.to_lowercase();

    let mut penalty: f64 = 0.0;

    if candidate_lower.contains(':') && !search_lower.contains(':') {
        if let Some(colon_pos) = candidate_lower.find(':') {
            if colon_pos > 0 && colon_pos < candidate_lower.len() - 1 {
                let after_colon = &candidate_lower[colon_pos + 1..].trim();
                if !after_colon.is_empty() {
                    penalty += 0.8;
                    debug!("      Penalty: Subtitle detected (+0.8)");
                }
            }
        }
    }

    let special_keywords = [
        "special",
        "edition",
        "story",
        "tales",
        "saga",
        "chronicles",
        "omnibus",
        "collection",
        "complete",
        "deluxe",
        "guidebook",
        "artbook",
        "databook",
        "fanbook",
        "anthology",
        "tribute",
        "side story",
        "spin-off",
        "spinoff",
        "novel",
        "light novel",
    ];

    for keyword in &special_keywords {
        if candidate_lower.contains(keyword) && !search_lower.contains(keyword) {
            penalty += 0.3;
            debug!(
                "      Penalty: Special keyword '{}' detected (+0.3)",
                keyword
            );
            break;
        }
    }

    let search_words: Vec<&str> = search_lower.split_whitespace().collect();
    let candidate_words: Vec<&str> = candidate_lower.split_whitespace().collect();

    if candidate_words.len() > search_words.len() * 2 {
        penalty += 0.4;
        debug!(
            "      Penalty: Candidate has {} words vs search {} words (+0.4)",
            candidate_words.len(),
            search_words.len()
        );
    }

    penalty.min(1.0)
}

/// Normalize title for comparison
fn normalize_title(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

/// Calculate Levenshtein distance between two strings
fn levenshtein_distance(s1: &str, s2: &str) -> usize {
    let len1 = s1.chars().count();
    let len2 = s2.chars().count();

    if len1 == 0 {
        return len2;
    }
    if len2 == 0 {
        return len1;
    }

    let mut matrix = vec![vec![0; len2 + 1]; len1 + 1];

    for i in 0..=len1 {
        matrix[i][0] = i;
    }
    for j in 0..=len2 {
        matrix[0][j] = j;
    }

    let s1_chars: Vec<char> = s1.chars().collect();
    let s2_chars: Vec<char> = s2.chars().collect();

    for i in 1..=len1 {
        for j in 1..=len2 {
            let cost = if s1_chars[i - 1] == s2_chars[j - 1] {
                0
            } else {
                1
            };
            matrix[i][j] = (matrix[i - 1][j] + 1)
                .min(matrix[i][j - 1] + 1)
                .min(matrix[i - 1][j - 1] + cost);
        }
    }

    matrix[len1][len2]
}

/// Calculate metadata completeness score
fn calculate_metadata_score(candidate: &MatchCandidate) -> f64 {
    let mut score = 0.0;

    if candidate.cover_url.is_some() {
        score += 0.3;
        debug!("      Metadata: cover=YES (+0.3)");
    } else {
        debug!("      Metadata: cover=NO (+0.0)");
    }

    if let Some(desc) = &candidate.description {
        if !desc.is_empty() {
            score += 0.3;
            debug!("      Metadata: description=YES, len={} (+0.3)", desc.len());
        } else {
            debug!("      Metadata: description=EMPTY (+0.0)");
        }
    } else {
        debug!("      Metadata: description=NONE (+0.0)");
    }

    if candidate.page_count.is_some() {
        score += 0.2;
        debug!(
            "      Metadata: page_count={:?} (+0.2)",
            candidate.page_count
        );
    } else {
        debug!("      Metadata: page_count=NONE (+0.0)");
    }

    if let Some(authors) = &candidate.authors {
        if !authors.is_empty() {
            score += 0.2;
            debug!("      Metadata: authors={} (+0.2)", authors.len());
        } else {
            debug!("      Metadata: authors=EMPTY (+0.0)");
        }
    } else {
        debug!("      Metadata: authors=NONE (+0.0)");
    }

    debug!("      Metadata total: {:.3} (max 1.0)", score);
    score
}

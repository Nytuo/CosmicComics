#[cfg(test)]
mod tests {
    use crate::services::anilist_service::{
        api_anilist_get, api_anilist_get_by_id, api_anilist_get_search,
    };
    #[tokio::test]
    async fn api_anilist_get_test() {
        let name = "Naruto";
        let result = api_anilist_get(name).await;

        assert!(result.is_ok());
        let data = result.unwrap();
        assert!(data.is_some());

        let data = data.unwrap();
        assert!(data.contains_key("base"));
        assert!(data.contains_key("staff"));
        assert!(data.contains_key("characters"));
        assert!(data.contains_key("relations"));
        assert_ne!(data["staff"], data["base"]["staff"]);
        assert_ne!(data["characters"], data["base"]["characters"]);
    }

    #[tokio::test]
    async fn api_anilist_get_by_id_test() {
        let id = "30011";
        let result = api_anilist_get_by_id(id).await;

        assert!(result.is_ok());
        let data = result.unwrap();
        assert!(data.is_some());

        let data = data.unwrap();
        assert_eq!(data.id, 30011);
        assert!(data.id != 0);
        assert!(
            data.title.romaji.is_some()
                || data.title.english.is_some()
                || data.title.native.is_some()
        );
        assert!(data.status.is_some());
        assert!(data.start_date.is_some());
        assert!(data.end_date.is_some());
        assert!(data.description.is_some());
        assert!(data.mean_score.is_some());
        assert!(data.genres.as_ref().map_or(false, |g| !g.is_empty()));
        assert!(data.cover_image.is_some());
        assert!(data.banner_image.is_some());
        assert!(data.trending.is_some());
        assert!(data.site_url.is_some());
        assert!(data.volumes.is_some());
        assert!(data.chapters.is_some());
        assert!(!data.staff.nodes.is_empty());
        assert!(!data.staff.edges.is_empty());
        assert!(!data.characters.nodes.is_empty());
        assert!(!data.characters.edges.is_empty());
        assert!(!data.relations.nodes.is_empty());
        assert!(!data.relations.edges.is_empty());
    }

    #[tokio::test]
    async fn api_anilist_get_search_test() {
        let name = "Naruto";
        let result = api_anilist_get_search(name).await;

        assert!(result.is_ok());
        let data = result.unwrap();
        assert!(data.is_some());

        let data = data.unwrap();
        assert!(data.contains_key("base"));
    }
}

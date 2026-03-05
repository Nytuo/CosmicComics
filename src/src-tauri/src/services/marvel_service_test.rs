/* #[cfg(test)]
mod tests {
    use anyhow::Result;
    use dotenv::dotenv;
    use serde_json::Value;

    use crate::server::services::marvel_service::{
        get_marvel_api_comics_by_id, get_marvel_api_search, get_marvel_api_series_by_id,
    };

    fn load_env() {
        let _ = dotenv();
    }

    #[tokio::test]
    async fn test_get_marvel_api_comic_by_id_valid() -> Result<()> {
        load_env();
        let public_key = std::env::var("MARVEL_PUBLIC_KEY").expect("Set MARVEL_PUBLIC_KEY");
        let private_key = std::env::var("MARVEL_PRIVATE_KEY").expect("Set MARVEL_PRIVATE_KEY");
        let comic_id = "82967"; // Example valid comic ID from Marvel API

        let comic = get_marvel_api_comics_by_id(comic_id, &private_key, &public_key).await?;
        assert_eq!(comic.id.to_string(), comic_id);
        assert!(!comic.title.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn test_get_marvel_api_series_by_id_valid() -> Result<()> {
        load_env();
        let public_key = std::env::var("MARVEL_PUBLIC_KEY").expect("Set MARVEL_PUBLIC_KEY");
        let private_key = std::env::var("MARVEL_PRIVATE_KEY").expect("Set MARVEL_PRIVATE_KEY");
        let series_id = "22551"; // Example valid series ID

        let series = get_marvel_api_series_by_id(series_id, &private_key, &public_key).await?;
        assert_eq!(series.id.to_string(), series_id);
        assert!(!series.title.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn test_get_marvel_api_search_valid() -> Result<()> {
        load_env();
        let public_key = std::env::var("MARVEL_PUBLIC_KEY").expect("Set MARVEL_PUBLIC_KEY");
        let private_key = std::env::var("MARVEL_PRIVATE_KEY").expect("Set MARVEL_PRIVATE_KEY");

        let name = "Spider-Man";
        let date = Some("2022".to_string());

        let response: Value = get_marvel_api_search(name, date, &private_key, &public_key).await?;
        assert_eq!(response["code"], 200);
        assert!(response["data"]["results"].is_array());
        Ok(())
    }

    #[tokio::test]
    async fn test_get_marvel_api_search_empty_name() {
        load_env();
        let public_key = std::env::var("MARVEL_PUBLIC_KEY").expect("Set MARVEL_PUBLIC_KEY");
        let private_key = std::env::var("MARVEL_PRIVATE_KEY").expect("Set MARVEL_PRIVATE_KEY");

        let result = get_marvel_api_search("", None, &private_key, &public_key).await;
        assert!(result.is_err());
    }
}
 */

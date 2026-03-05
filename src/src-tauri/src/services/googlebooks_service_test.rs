#[cfg(test)]
mod tests {
    use anyhow::Result;
    use dotenv::dotenv;
    use serde_json::Value;

    use crate::services::googlebooks_service::{
        get_gbapi_comics_by_id, search_gbapi_comics_by_name,
    };

    fn load_env() {
        let _ = dotenv();
    }

    #[tokio::test]
    async fn test_get_gbapi_comics_by_id_valid() -> Result<()> {
        load_env();
        let id = "zyTCAlFPjgYC"; // This is a stable test ID for "The Google Story"
        let volume = get_gbapi_comics_by_id(id).await?;

        assert_eq!(volume.id, id);
        assert!(!volume.volume_info.title.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn test_get_gbapi_comics_by_id_invalid() {
        load_env();
        let id = "invalid_id_123456";
        let result = get_gbapi_comics_by_id(id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_search_gbapi_comics_by_name_valid() -> Result<()> {
        load_env();
        let name = "The Google Story";
        let api_key = std::env::var("GBOOKSAPIKEY")
            .expect("Set the GBOOKSAPIKEY env variable to run this test");

        let result: Value = search_gbapi_comics_by_name(name, api_key).await?;

        assert_eq!(result["kind"], "books#volumes");
        assert!(result["items"].is_array());
        Ok(())
    }

    #[tokio::test]
    async fn test_search_gbapi_comics_by_name_empty() {
        load_env();
        let api_key = std::env::var("GBOOKSAPIKEY")
            .expect("Set the GBOOKSAPIKEY env variable to run this test");

        let result = search_gbapi_comics_by_name("", api_key).await;
        assert!(result.is_err());
    }
}

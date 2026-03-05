use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use tracing::debug;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Media {
    pub id: i32,
    pub title: Title,
    pub status: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<Date>,
    #[serde(rename = "endDate")]
    pub end_date: Option<Date>,
    pub description: Option<String>,
    #[serde(rename = "meanScore")]
    pub mean_score: Option<i32>,
    pub genres: Option<Vec<String>>,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<Image>,
    #[serde(rename = "bannerImage")]
    pub banner_image: Option<String>,
    pub trending: Option<i32>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
    pub volumes: Option<i32>,
    pub chapters: Option<i32>,
    pub staff: Staff,
    pub characters: Characters,
    pub relations: Relations,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Title {
    pub romaji: Option<String>,
    pub english: Option<String>,
    pub native: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Date {
    pub year: Option<i32>,
    pub month: Option<i32>,
    pub day: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Image {
    pub large: Option<String>,
    pub medium: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Staff {
    pub nodes: Vec<StaffNode>,
    pub edges: Vec<StaffEdge>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StaffNode {
    pub id: i32,
    pub name: Name,
    pub image: Option<Image>,
    pub description: Option<String>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StaffEdge {
    pub role: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Characters {
    pub nodes: Vec<CharacterNode>,
    pub edges: Vec<CharacterEdge>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CharacterNode {
    pub id: i32,
    pub name: Name,
    pub image: Option<Image>,
    pub description: Option<String>,
    #[serde(rename = "siteUrl")]
    pub site_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CharacterEdge {
    pub role: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Relations {
    pub nodes: Vec<RelationNode>,
    pub edges: Vec<RelationEdge>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RelationNode {
    pub id: i32,
    pub title: Title,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<Image>,
    pub r#type: Option<String>,
    pub format: Option<String>,
    pub relation_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RelationEdge {
    pub relation_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Name {
    pub full: Option<String>,
    pub native: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MediaResponse {
    pub data: MediaData,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MediaData {
    #[serde(rename = "Media")]
    pub media: Media,
}

pub async fn api_anilist_get(name: &str) -> Result<Option<HashMap<String, Value>>, reqwest::Error> {
    let query = r#"
        query ($page: Int, $perPage: Int, $search: String) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    total
                }
                media(type: MANGA, search: $search) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    status
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    description
                    meanScore
                    genres
                    coverImage {
                        large
                    }
                    bannerImage
                    trending
                    siteUrl
                    volumes
                    chapters
                    staff {
                        nodes {
                            id
                            name {
                                full
                                native
                            }
                            image {
                                medium
                            }
                            description
                            siteUrl
                        }
                        edges {
                            role
                        }
                    }
                    characters {
                        nodes {
                            id
                            name {
                                full
                                native
                            }
                            image {
                                medium
                            }
                            description
                            siteUrl
                        }
                        edges {
                            role
                        }
                    }
                    relations {
                        nodes {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                            }
                            type
                            format
                        }
                        edges {
                            relationType
                        }
                    }
                }
            }
        }
    "#;

    let variables = json!({
        "search": name,
        "page": 1,
        "perPage": 5
    });

    let url = "https://graphql.anilist.co";
    let client = Client::new();
    let response = client
        .post(url)
        .json(&json!({
            "query": query,
            "variables": variables
        }))
        .send()
        .await?;

    let json_response: Value = response.json().await?;

    if let Some(media) = json_response["data"]["Page"]["media"].as_array() {
        if media.is_empty() {
            return Ok(None);
        }

        let mut base_object = media[0].clone();
        let staff_object = base_object["staff"]["nodes"].clone();
        let characters_object = base_object["characters"]["nodes"].clone();
        let relations_nodes = base_object["relations"]["nodes"].clone();
        let relations_edges = base_object["relations"]["edges"].clone();

        let mut relations_object = Vec::new();
        if let (Some(nodes), Some(edges)) = (relations_nodes.as_array(), relations_edges.as_array())
        {
            for (i, node) in nodes.iter().enumerate() {
                let mut relation = node.clone();
                if let Some(relation_type) =
                    edges.get(i).and_then(|edge| edge["relationType"].as_str())
                {
                    relation["relationType"] = json!(relation_type);
                }
                relations_object.push(relation);
            }
        }

        base_object.as_object_mut().unwrap().remove("relations");

        if let Some(staff_nodes) = base_object["staff"]["nodes"].as_array_mut() {
            let mod_staff_nodes: Vec<Value> = staff_nodes
                .iter()
                .map(|staff| {
                    let mut new_staff = staff.clone();
                    new_staff
                        .as_object_mut()
                        .unwrap()
                        .retain(|key, _| key == "id" || key == "name");
                    new_staff
                })
                .collect();
            base_object["staff"] = json!(mod_staff_nodes);
        }

        if let Some(character_nodes) = base_object["characters"]["nodes"].as_array_mut() {
            let mod_character_nodes: Vec<Value> = character_nodes
                .iter()
                .map(|character| {
                    let mut new_character = character.clone();
                    new_character
                        .as_object_mut()
                        .unwrap()
                        .retain(|key, _| key == "id" || key == "name");
                    new_character
                })
                .collect();
            base_object["characters"] = json!(mod_character_nodes);
        }

        let mut result = HashMap::new();
        result.insert("base".to_string(), base_object);
        result.insert("staff".to_string(), staff_object);
        result.insert("characters".to_string(), characters_object);
        result.insert("relations".to_string(), json!(relations_object));

        return Ok(Some(result));
    }

    Ok(None)
}

pub async fn api_anilist_get_search(
    name: &str,
) -> Result<Option<HashMap<String, Value>>, reqwest::Error> {
    let query = r#"
        query ($page: Int, $perPage: Int, $search: String) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    total
                }
                media(type: MANGA, search: $search) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    coverImage {
                        large
                    }
                    chapters
                    volumes
                }
            }
        }
    "#;

    let variables = json!({
        "search": name,
        "page": 1,
        "perPage": 20
    });

    let url = "https://graphql.anilist.co";
    let client = Client::new();
    let response = client
        .post(url)
        .json(&json!({
            "query": query,
            "variables": variables
        }))
        .send()
        .await?;

    let json_response: Value = response.json().await?;

    if let Some(media) = json_response["data"]["Page"]["media"].as_array() {
        if media.is_empty() {
            return Ok(None);
        }

        let base_object = json!(media);

        let mut result = HashMap::new();
        result.insert("base".to_string(), base_object);

        return Ok(Some(result));
    }

    Ok(None)
}

pub async fn api_anilist_get_by_id(id: &str) -> Result<Option<Media>, reqwest::Error> {
    let query = r#"
        query ($id: Int) {
            Media(type: MANGA, id: $id) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    status
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    description
                    meanScore
                    genres
                    coverImage {
                        large
                    }
                    bannerImage
                    trending
                    siteUrl
                    volumes
                    chapters
                    staff {
                        nodes {
                            id
                            name {
                                full
                                native
                            }
                            image {
                                medium
                            }
                            description
                            siteUrl
                        }
                        edges {
                            role
                        }
                    }
                    characters {
                        nodes {
                            id
                            name {
                                full
                                native
                            }
                            image {
                                medium
                            }
                            description
                            siteUrl
                        }
                        edges {
                            role
                        }
                    }
                    relations {
                        nodes {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                            }
                            type
                            format
                        }
                        edges {
                            relationType
                        }
                    }
                }
        }
    "#;

    let variables = json!({
        "id": id.parse::<i32>().unwrap_or(0)
    });

    let url = "https://graphql.anilist.co";
    let client = Client::new();
    let response = client
        .post(url)
        .json(&json!({
            "query": query,
            "variables": variables
        }))
        .send()
        .await?;

    let json_response: Value = response.json().await?;

    debug!("Response: {:?}", json_response);

    let media_response: MediaResponse = serde_json::from_value(json_response).unwrap();
    let media = media_response.data.media;
    let response: Media = media.clone();

    Ok(Some(response))
}

pub async fn search_anilist_manga(
    query: &str,
) -> Result<Option<HashMap<String, serde_json::Value>>, Box<dyn std::error::Error>> {
    api_anilist_get_search(query)
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
}

//! Local, file-based metadata extraction

use serde::Deserialize;
use std::fs;
use std::path::Path;
use zip::ZipArchive;

use crate::models::common::{DisplayCharacter, DisplayCreator};

const METRON_INFO_FILENAME: &str = "MetronInfo.xml";
const COMIC_INFO_FILENAME: &str = "ComicInfo.xml";

/// Raw `ComicInfo.xml` schema (ComicRack/Anansi convention).
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct ComicInfoXml {
    title: Option<String>,
    series: Option<String>,
    number: Option<String>,
    summary: Option<String>,
    year: Option<i32>,
    month: Option<i32>,
    day: Option<i32>,
    writer: Option<String>,
    penciller: Option<String>,
    inker: Option<String>,
    colorist: Option<String>,
    letterer: Option<String>,
    cover_artist: Option<String>,
    editor: Option<String>,
    publisher: Option<String>,
    genre: Option<String>,
    page_count: Option<i64>,
    format: Option<String>,
    characters: Option<String>,
}

/// Normalized, source-agnostic local metadata.
#[derive(Debug, Default, Clone)]
pub struct LocalMetadata {
    pub title: Option<String>,
    pub series_title: Option<String>,
    pub issue_number: Option<String>,
    pub description: Option<String>,
    pub format: Option<String>,
    pub page_count: Option<i64>,
    pub genres: Vec<String>,
    pub creators: Vec<DisplayCreator>,
    pub characters: Vec<DisplayCharacter>,
    pub publisher: Option<String>,
    pub year: Option<String>,
}

fn split_names(field: &Option<String>) -> Vec<String> {
    field
        .as_deref()
        .map(|s| {
            s.split(',')
                .map(|n| n.trim().to_string())
                .filter(|n| !n.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

impl From<ComicInfoXml> for LocalMetadata {
    fn from(c: ComicInfoXml) -> Self {
        let mut creators = Vec::new();
        for (field, role) in [
            (&c.writer, "Writer"),
            (&c.penciller, "Penciller"),
            (&c.inker, "Inker"),
            (&c.colorist, "Colorist"),
            (&c.letterer, "Letterer"),
            (&c.cover_artist, "Cover Artist"),
            (&c.editor, "Editor"),
        ] {
            for name in split_names(field) {
                creators.push(DisplayCreator {
                    name,
                    role: Some(role.to_string()),
                    image_url: None,
                });
            }
        }

        let characters = split_names(&c.characters)
            .into_iter()
            .map(|name| DisplayCharacter {
                name,
                role: None,
                image_url: None,
            })
            .collect();

        let year = c.year.map(|y| {
            match (c.month, c.day) {
                (Some(m), Some(d)) => format!("{:04}-{:02}-{:02}", y, m, d),
                (Some(m), None) => format!("{:04}-{:02}", y, m),
                _ => format!("{:04}", y),
            }
        });

        let title = c
            .title
            .clone()
            .or_else(|| match (&c.series, &c.number) {
                (Some(series), Some(number)) => Some(format!("{} #{}", series, number)),
                (Some(series), None) => Some(series.clone()),
                _ => None,
            });

        LocalMetadata {
            title,
            series_title: c.series,
            issue_number: c.number,
            description: c.summary,
            format: c.format,
            page_count: c.page_count,
            genres: split_names(&c.genre),
            creators,
            characters,
            publisher: c.publisher,
            year,
        }
    }
}

fn parse_comic_info_xml(xml: &str) -> Option<LocalMetadata> {
    quick_xml::de::from_str::<ComicInfoXml>(xml)
        .ok()
        .map(LocalMetadata::from)
}

#[derive(Debug, Deserialize)]
struct MiText {
    #[serde(rename = "$text", default)]
    text: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct MiPublisher {
    name: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct MiSeries {
    name: Option<String>,
    format: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
struct MiStories {
    #[serde(rename = "Story", default)]
    story: Vec<MiText>,
}

#[derive(Debug, Default, Deserialize)]
struct MiGenres {
    #[serde(rename = "Genre", default)]
    genre: Vec<MiText>,
}

#[derive(Debug, Default, Deserialize)]
struct MiCharacters {
    #[serde(rename = "Character", default)]
    character: Vec<MiText>,
}

#[derive(Debug, Default, Deserialize)]
struct MiRoles {
    #[serde(rename = "Role", default)]
    role: Vec<MiText>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct MiCredit {
    creator: Option<MiText>,
    roles: Option<MiRoles>,
}

#[derive(Debug, Default, Deserialize)]
struct MiCredits {
    #[serde(rename = "Credit", default)]
    credit: Vec<MiCredit>,
}

/// Raw `MetronInfo.xml` schema (v1.1)
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct MetronInfoXml {
    publisher: Option<MiPublisher>,
    series: Option<MiSeries>,
    number: Option<String>,
    stories: Option<MiStories>,
    summary: Option<String>,
    cover_date: Option<String>,
    page_count: Option<i64>,
    genres: Option<MiGenres>,
    characters: Option<MiCharacters>,
    credits: Option<MiCredits>,
}

impl From<MetronInfoXml> for LocalMetadata {
    fn from(m: MetronInfoXml) -> Self {
        let series_name = m.series.as_ref().and_then(|s| s.name.clone());

        let title = m
            .stories
            .as_ref()
            .and_then(|s| s.story.first())
            .map(|s| s.text.clone())
            .filter(|s| !s.is_empty())
            .or_else(|| match (&series_name, &m.number) {
                (Some(series), Some(number)) => Some(format!("{} #{}", series, number)),
                (Some(series), None) => Some(series.clone()),
                _ => None,
            });

        let genres = m
            .genres
            .map(|g| g.genre.into_iter().map(|t| t.text).collect())
            .unwrap_or_default();

        let characters = m
            .characters
            .map(|c| {
                c.character
                    .into_iter()
                    .map(|t| DisplayCharacter {
                        name: t.text,
                        role: None,
                        image_url: None,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let mut creators = Vec::new();
        if let Some(credits) = m.credits {
            for credit in credits.credit {
                let Some(name) = credit.creator.map(|c| c.text).filter(|n| !n.is_empty()) else {
                    continue;
                };
                let roles = credit
                    .roles
                    .map(|r| r.role)
                    .unwrap_or_default()
                    .into_iter()
                    .map(|t| t.text)
                    .filter(|t| !t.is_empty())
                    .collect::<Vec<_>>();

                if roles.is_empty() {
                    creators.push(DisplayCreator {
                        name,
                        role: None,
                        image_url: None,
                    });
                } else {
                    for role in roles {
                        creators.push(DisplayCreator {
                            name: name.clone(),
                            role: Some(role),
                            image_url: None,
                        });
                    }
                }
            }
        }

        LocalMetadata {
            title,
            series_title: series_name,
            issue_number: m.number,
            description: m.summary,
            format: m.series.and_then(|s| s.format),
            page_count: m.page_count,
            genres,
            creators,
            characters,
            publisher: m.publisher.and_then(|p| p.name),
            year: m.cover_date,
        }
    }
}

fn parse_metron_info_xml(xml: &str) -> Option<LocalMetadata> {
    quick_xml::de::from_str::<MetronInfoXml>(xml)
        .ok()
        .map(LocalMetadata::from)
}

fn read_xml_text_from_zip(path: &Path, filename: &str) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;

    let index = (0..archive.len()).find(|&i| {
        archive
            .by_index(i)
            .ok()
            .map(|f| f.name().eq_ignore_ascii_case(filename))
            .unwrap_or(false)
    })?;

    let mut entry = archive.by_index(index).ok()?;
    let mut xml = String::new();
    std::io::Read::read_to_string(&mut entry, &mut xml).ok()?;
    Some(xml)
}

fn read_xml_text_from_rar(path: &Path, filename: &str) -> Option<String> {
    use unrar::Archive;

    let path_str = path.to_str()?;
    let mut archive = Archive::new(path_str).open_for_processing().ok()?;

    while let Some(header) = archive.read_header().ok()? {
        let entry_filename = header.entry().filename.to_string_lossy().to_string();
        let is_match = header.entry().is_file()
            && Path::new(&entry_filename)
                .file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.eq_ignore_ascii_case(filename))
                .unwrap_or(false);

        if is_match {
            let temp_path = std::env::temp_dir().join(format!(
                "cosmiccomics_sidecar_{}.xml",
                rand::random::<u32>()
            ));
            let extracted = header.extract_to(&temp_path).ok()?;
            let _ = extracted;
            let xml = fs::read_to_string(&temp_path).ok();
            let _ = fs::remove_file(&temp_path);
            return xml;
        } else {
            archive = header.skip().ok()?;
        }
    }

    None
}

fn read_xml_text_from_folder(path: &Path, filename: &str) -> Option<String> {
    fs::read_to_string(path.join(filename)).ok()
}

fn read_sidecar_metadata(path: &Path) -> LocalMetadata {
    let read_xml: fn(&Path, &str) -> Option<String> = if path.is_dir() {
        read_xml_text_from_folder
    } else {
        match path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .as_deref()
        {
            Some("cbz") | Some("zip") => read_xml_text_from_zip,
            Some("cbr") | Some("rar") => read_xml_text_from_rar,
            _ => return LocalMetadata::default(),
        }
    };

    if let Some(xml) = read_xml(path, METRON_INFO_FILENAME) {
        if let Some(meta) = parse_metron_info_xml(&xml) {
            return meta;
        }
    }

    if let Some(xml) = read_xml(path, COMIC_INFO_FILENAME) {
        if let Some(meta) = parse_comic_info_xml(&xml) {
            return meta;
        }
    }

    LocalMetadata::default()
}

fn read_pdf_metadata(path: &Path) -> Option<LocalMetadata> {
    use pdfium_render::prelude::PdfDocumentMetadataTagType;

    let pdfium = crate::services::pdfium_service::create_instance().ok()?;
    let doc = pdfium.load_pdf_from_file(path, None).ok()?;
    let meta = doc.metadata();

    let title = meta
        .get(PdfDocumentMetadataTagType::Title)
        .map(|t| t.value().to_string())
        .filter(|s| !s.is_empty());
    let author = meta
        .get(PdfDocumentMetadataTagType::Author)
        .map(|t| t.value().to_string())
        .filter(|s| !s.is_empty());
    let subject = meta
        .get(PdfDocumentMetadataTagType::Subject)
        .map(|t| t.value().to_string())
        .filter(|s| !s.is_empty());
    let keywords = meta
        .get(PdfDocumentMetadataTagType::Keywords)
        .map(|t| t.value().to_string())
        .filter(|s| !s.is_empty());

    if title.is_none() && author.is_none() && subject.is_none() && keywords.is_none() {
        return None;
    }

    let creators = author
        .map(|name| {
            vec![DisplayCreator {
                name,
                role: Some("Author".to_string()),
                image_url: None,
            }]
        })
        .unwrap_or_default();

    let genres = keywords
        .map(|k| {
            k.split(',')
                .map(|g| g.trim().to_string())
                .filter(|g| !g.is_empty())
                .collect()
        })
        .unwrap_or_default();

    Some(LocalMetadata {
        title,
        description: subject,
        creators,
        genres,
        page_count: Some(doc.pages().len() as i64),
        ..Default::default()
    })
}

pub fn extract_local_metadata(path: &Path) -> LocalMetadata {
    if path.is_dir() {
        return read_sidecar_metadata(path);
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "cbz" | "zip" | "cbr" | "rar" => read_sidecar_metadata(path),
        "pdf" => read_pdf_metadata(path).unwrap_or_default(),
        _ => LocalMetadata::default(),
    }
}

pub fn extract_local_series_metadata(folder_path: &Path) -> LocalMetadata {
    let entries = match fs::read_dir(folder_path) {
        Ok(e) => e,
        Err(_) => return LocalMetadata::default(),
    };

    for entry in entries.flatten() {
        let entry_path = entry.path();
        if crate::utils::is_valid_book_entry(&entry_path) {
            let meta = extract_local_metadata(&entry_path);
            if meta.series_title.is_some() || meta.title.is_some() {
                return meta;
            }
        }
    }

    LocalMetadata::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    // The official sample from
    // github.com/Metron-Project/metroninfo/blob/master/schema/v1.1/Sample.xml
    const METRON_INFO_SAMPLE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<MetronInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="MetronInfo.xsd">
    <IDS>
        <ID source="Metron" primary="true">290431</ID>
        <ID source="Comic Vine">12345</ID>
    </IDS>
    <Publisher id="12345">
        <Name>DC Comics</Name>
        <Imprint id="1234">Vertigo</Imprint>
    </Publisher>
    <Series id="65478" lang="en">
        <Name>Justice League</Name>
        <SortName>Justice League</SortName>
        <Volume>2</Volume>
        <Format>Single Issue</Format>
        <StartYear>1970</StartYear>
        <IssueCount>60</IssueCount>
        <VolumeCount>3</VolumeCount>
    </Series>
    <Number>1</Number>
    <Stories>
        <Story id="12">Justice League, Part One</Story>
        <Story>Justice League, Part Two</Story>
    </Stories>
    <Summary>In a universe where superheroes are strange and new, Batman has discovered a dark evil that requires him to unite the World Greatest Heroes!</Summary>
    <Notes>Nothing really to say.</Notes>
    <CoverDate>2011-10-01</CoverDate>
    <StoreDate>2011-08-31</StoreDate>
    <PageCount>32</PageCount>
    <Genres>
        <Genre id="98745">Super-Hero</Genre>
        <Genre>Crime</Genre>
    </Genres>
    <Characters>
        <Character id="45678">Aquaman</Character>
        <Character>Batman</Character>
    </Characters>
    <AgeRating>Everyone</AgeRating>
    <Credits>
        <Credit>
            <Creator id="32165">Geoff Johns</Creator>
            <Roles>
                <Role id="32165">Writer</Role>
            </Roles>
        </Credit>
        <Credit>
            <Creator>Jim Lee</Creator>
            <Roles>
                <Role>Penciller</Role>
                <Role>Cover</Role>
            </Roles>
        </Credit>
    </Credits>
    <LastModified>2023-05-31T09:00:46.300882-04:00</LastModified>
</MetronInfo>"#;

    #[test]
    fn parses_metron_info_sample() {
        let meta = parse_metron_info_xml(METRON_INFO_SAMPLE).expect("should parse");

        assert_eq!(meta.title.as_deref(), Some("Justice League, Part One"));
        assert_eq!(meta.series_title.as_deref(), Some("Justice League"));
        assert_eq!(meta.issue_number.as_deref(), Some("1"));
        assert_eq!(meta.format.as_deref(), Some("Single Issue"));
        assert_eq!(meta.page_count, Some(32));
        assert_eq!(meta.publisher.as_deref(), Some("DC Comics"));
        assert_eq!(meta.year.as_deref(), Some("2011-10-01"));
        assert_eq!(meta.genres, vec!["Super-Hero", "Crime"]);
        assert_eq!(meta.characters.len(), 2);
        assert_eq!(meta.characters[0].name, "Aquaman");

        assert_eq!(meta.creators.len(), 3);
        assert!(meta
            .creators
            .iter()
            .any(|c| c.name == "Geoff Johns" && c.role.as_deref() == Some("Writer")));
        assert!(meta
            .creators
            .iter()
            .any(|c| c.name == "Jim Lee" && c.role.as_deref() == Some("Penciller")));
        assert!(meta
            .creators
            .iter()
            .any(|c| c.name == "Jim Lee" && c.role.as_deref() == Some("Cover")));
    }

    #[test]
    fn parses_comic_info_still_works() {
        let xml = r#"<?xml version="1.0"?>
<ComicInfo>
    <Series>Amazing Spider-Man</Series>
    <Number>1</Number>
    <Writer>Stan Lee</Writer>
    <Genre>Super-Hero, Action</Genre>
</ComicInfo>"#;

        let meta = parse_comic_info_xml(xml).expect("should parse");
        assert_eq!(meta.series_title.as_deref(), Some("Amazing Spider-Man"));
        assert_eq!(meta.title.as_deref(), Some("Amazing Spider-Man #1"));
        assert_eq!(meta.genres, vec!["Super-Hero", "Action"]);
        assert_eq!(meta.creators.len(), 1);
        assert_eq!(meta.creators[0].name, "Stan Lee");
    }
}

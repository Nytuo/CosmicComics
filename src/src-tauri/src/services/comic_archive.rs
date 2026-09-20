use crate::utils::VALID_IMAGE_EXTENSION;
use flate2::read::GzDecoder;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Path, PathBuf};

pub type BoxError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArchiveKind {
    Zip,
    Tar,
    TarGz,
    Rar,
    SevenZ,
}

impl ArchiveKind {
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_ascii_lowercase().as_str() {
            "zip" | "cbz" => Some(Self::Zip),
            "rar" | "cbr" => Some(Self::Rar),
            "7z" | "cb7" => Some(Self::SevenZ),
            "tar" | "cbt" => Some(Self::Tar),
            "tgz" => Some(Self::TarGz),
            _ => None,
        }
    }

    pub fn from_header(head: &[u8]) -> Option<Self> {
        if head.starts_with(b"PK\x03\x04")
            || head.starts_with(b"PK\x05\x06")
            || head.starts_with(b"PK\x07\x08")
        {
            Some(Self::Zip)
        } else if head.starts_with(b"Rar!\x1a\x07") {
            Some(Self::Rar)
        } else if head.starts_with(&[0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]) {
            Some(Self::SevenZ)
        } else if head.starts_with(&[0x1f, 0x8b]) {
            Some(Self::TarGz)
        } else if head.len() >= 262 && &head[257..262] == b"ustar" {
            Some(Self::Tar)
        } else {
            None
        }
    }

    pub fn detect(path: &Path) -> Option<Self> {
        let mut head = [0u8; 512];
        let read = File::open(path)
            .and_then(|mut f| read_up_to(&mut f, &mut head))
            .unwrap_or(0);
        Self::from_header(&head[..read]).or_else(|| {
            path.extension()
                .and_then(|e| e.to_str())
                .and_then(Self::from_extension)
        })
    }
}

fn read_up_to<R: Read>(reader: &mut R, buf: &mut [u8]) -> io::Result<usize> {
    let mut filled = 0;
    while filled < buf.len() {
        match reader.read(&mut buf[filled..])? {
            0 => break,
            n => filled += n,
        }
    }
    Ok(filled)
}

pub fn is_page_entry(name: &str) -> bool {
    let normalized = name.replace('\\', "/");
    if normalized.ends_with('/') || normalized.split('/').any(|part| part == "__MACOSX") {
        return false;
    }
    let base = normalized.rsplit('/').next().unwrap_or("");
    if base.starts_with('.') {
        return false;
    }
    match base.rsplit_once('.') {
        Some((_, ext)) => VALID_IMAGE_EXTENSION
            .iter()
            .any(|valid| valid.eq_ignore_ascii_case(ext)),
        None => false,
    }
}

fn chunks(s: &str) -> Vec<(bool, &str)> {
    let mut out = Vec::new();
    let mut start = 0;
    let mut current: Option<bool> = None;
    for (i, c) in s.char_indices() {
        let is_digit = c.is_ascii_digit();
        match current {
            Some(kind) if kind == is_digit => {}
            Some(kind) => {
                out.push((kind, &s[start..i]));
                start = i;
                current = Some(is_digit);
            }
            None => current = Some(is_digit),
        }
    }
    if let Some(kind) = current {
        out.push((kind, &s[start..]));
    }
    out
}

pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    let (a, b) = (a.to_lowercase(), b.to_lowercase());
    let (left, right) = (chunks(&a), chunks(&b));
    for ((a_num, a_text), (b_num, b_text)) in left.iter().zip(right.iter()) {
        if a_text == b_text {
            continue;
        }
        if *a_num && *b_num {
            let (x, y) = (
                a_text.trim_start_matches('0'),
                b_text.trim_start_matches('0'),
            );
            let by_value = x.len().cmp(&y.len()).then_with(|| x.cmp(y));
            if by_value != Ordering::Equal {
                return by_value;
            }
            return a_text.len().cmp(&b_text.len());
        }
        return a_text.cmp(b_text);
    }
    left.len().cmp(&right.len())
}

fn normalize(name: &str) -> String {
    name.replace('\\', "/")
}

fn sorted(mut names: Vec<String>) -> Vec<String> {
    names.sort_by(|a, b| natural_cmp(a, b));
    names
}

pub fn extracted_page_name(index: usize) -> String {
    format!("{:05}.jpg", index)
}

pub struct ComicArchive {
    path: PathBuf,
    kind: ArchiveKind,
}

impl ComicArchive {
    pub fn open(path: &Path) -> Result<Self, BoxError> {
        let kind = ArchiveKind::detect(path)
            .ok_or_else(|| format!("Unsupported archive format: {}", path.display()))?;
        Ok(Self {
            path: path.to_path_buf(),
            kind,
        })
    }

    pub fn kind(&self) -> ArchiveKind {
        self.kind
    }

    pub fn pages(&self) -> Result<Vec<String>, BoxError> {
        let names = match self.kind {
            ArchiveKind::Zip => self.zip_names()?,
            ArchiveKind::Tar | ArchiveKind::TarGz => self.tar_names()?,
            ArchiveKind::Rar => self.rar_names()?,
            ArchiveKind::SevenZ => self.sevenz_names()?,
        };
        Ok(sorted(
            names.into_iter().filter(|n| is_page_entry(n)).collect(),
        ))
    }

    pub fn page_count(&self) -> Result<usize, BoxError> {
        Ok(self.pages()?.len())
    }

    pub fn read_page(&self, index: usize) -> Result<Vec<u8>, BoxError> {
        let pages = self.pages()?;
        let name = pages
            .get(index)
            .ok_or_else(|| format!("Page {} out of range (total: {})", index, pages.len()))?;
        self.read_entry(name)
    }

    pub fn read_named(&self, file_name: &str) -> Option<Vec<u8>> {
        let all = match self.kind {
            ArchiveKind::Zip => self.zip_names(),
            ArchiveKind::Tar | ArchiveKind::TarGz => self.tar_names(),
            ArchiveKind::Rar => self.rar_names(),
            ArchiveKind::SevenZ => self.sevenz_names(),
        }
        .ok()?;
        let target = all.into_iter().find(|name| {
            name.rsplit('/')
                .next()
                .is_some_and(|base| base.eq_ignore_ascii_case(file_name))
        })?;
        self.read_entry(&target).ok()
    }

    fn read_entry(&self, name: &str) -> Result<Vec<u8>, BoxError> {
        match self.kind {
            ArchiveKind::Zip => {
                let mut archive = zip::ZipArchive::new(File::open(&self.path)?)?;
                let mut entry = archive.by_name(name)?;
                let mut buf = Vec::with_capacity(entry.size() as usize);
                entry.read_to_end(&mut buf)?;
                Ok(buf)
            }
            ArchiveKind::Tar | ArchiveKind::TarGz => {
                let mut archive = tar::Archive::new(self.tar_reader()?);
                for entry in archive.entries()? {
                    let mut entry = entry?;
                    let entry_name = normalize(&entry.path()?.to_string_lossy());
                    if entry_name == name {
                        let mut buf = Vec::new();
                        entry.read_to_end(&mut buf)?;
                        return Ok(buf);
                    }
                }
                Err(format!("'{}' not found in TAR archive", name).into())
            }
            ArchiveKind::Rar => {
                let mut archive = unrar::Archive::new(&self.path).open_for_processing()?;
                while let Some(header) = archive.read_header()? {
                    if header.entry().is_file()
                        && normalize(&header.entry().filename.to_string_lossy()) == name
                    {
                        let (data, _) = header.read()?;
                        return Ok(data);
                    }
                    archive = header.skip()?;
                }
                Err(format!("'{}' not found in RAR archive", name).into())
            }
            ArchiveKind::SevenZ => {
                let mut reader =
                    sevenz_rust2::ArchiveReader::open(&self.path, sevenz_rust2::Password::empty())?;
                let mut found = None;
                reader.for_each_entries(|entry, data| {
                    if normalize(entry.name()) == name {
                        let mut buf = Vec::new();
                        data.read_to_end(&mut buf)?;
                        found = Some(buf);
                        return Ok(false);
                    }
                    Ok(true)
                })?;
                found.ok_or_else(|| format!("'{}' not found in 7z archive", name).into())
            }
        }
    }

    pub fn extract_pages(
        &self,
        dest: &Path,
        on_page: &mut dyn FnMut(usize, usize, &str),
    ) -> Result<usize, BoxError> {
        fs::create_dir_all(dest)?;
        let pages = self.pages()?;
        let total = pages.len();
        let index_of: HashMap<&str, usize> = pages
            .iter()
            .enumerate()
            .map(|(i, name)| (name.as_str(), i))
            .collect();
        let mut done = 0usize;
        let mut write_page = |name: &str, data: &mut dyn Read| -> Result<(), BoxError> {
            let Some(&index) = index_of.get(name) else {
                return Ok(());
            };
            let mut out = File::create(dest.join(extracted_page_name(index)))?;
            io::copy(data, &mut out)?;
            done += 1;
            on_page(done, total, name);
            Ok(())
        };

        match self.kind {
            ArchiveKind::Zip => {
                let mut archive = zip::ZipArchive::new(File::open(&self.path)?)?;
                for name in &pages {
                    let mut entry = archive.by_name(name)?;
                    write_page(name, &mut entry)?;
                }
            }
            ArchiveKind::Tar | ArchiveKind::TarGz => {
                let mut archive = tar::Archive::new(self.tar_reader()?);
                for entry in archive.entries()? {
                    let mut entry = entry?;
                    let name = normalize(&entry.path()?.to_string_lossy());
                    write_page(&name, &mut entry)?;
                }
            }
            ArchiveKind::Rar => {
                let mut archive = unrar::Archive::new(&self.path).open_for_processing()?;
                while let Some(header) = archive.read_header()? {
                    let name = normalize(&header.entry().filename.to_string_lossy());
                    if header.entry().is_file() && index_of.contains_key(name.as_str()) {
                        let (data, next) = header.read()?;
                        write_page(&name, &mut data.as_slice())?;
                        archive = next;
                    } else {
                        archive = header.skip()?;
                    }
                }
            }
            ArchiveKind::SevenZ => {
                let mut reader =
                    sevenz_rust2::ArchiveReader::open(&self.path, sevenz_rust2::Password::empty())?;
                let mut failure: Option<BoxError> = None;
                reader.for_each_entries(|entry, data| {
                    if entry.is_directory() {
                        return Ok(true);
                    }
                    match write_page(&normalize(entry.name()), data) {
                        Ok(()) => Ok(true),
                        Err(e) => {
                            failure = Some(e);
                            Ok(false)
                        }
                    }
                })?;
                if let Some(e) = failure {
                    return Err(e);
                }
            }
        }
        Ok(done)
    }

    fn zip_names(&self) -> Result<Vec<String>, BoxError> {
        let archive = zip::ZipArchive::new(File::open(&self.path)?)?;
        Ok(archive.file_names().map(normalize).collect())
    }

    fn tar_reader(&self) -> Result<Box<dyn Read>, BoxError> {
        let file = File::open(&self.path)?;
        Ok(match self.kind {
            ArchiveKind::TarGz => Box::new(GzDecoder::new(file)),
            _ => Box::new(file),
        })
    }

    fn tar_names(&self) -> Result<Vec<String>, BoxError> {
        let mut archive = tar::Archive::new(self.tar_reader()?);
        let mut names = Vec::new();
        for entry in archive.entries()? {
            let entry = entry?;
            if entry.header().entry_type().is_file() {
                names.push(normalize(&entry.path()?.to_string_lossy()));
            }
        }
        Ok(names)
    }

    fn rar_names(&self) -> Result<Vec<String>, BoxError> {
        let mut names = Vec::new();
        for entry in unrar::Archive::new(&self.path).open_for_listing()? {
            let entry = entry?;
            if entry.is_file() {
                names.push(normalize(&entry.filename.to_string_lossy()));
            }
        }
        Ok(names)
    }

    fn sevenz_names(&self) -> Result<Vec<String>, BoxError> {
        let reader =
            sevenz_rust2::ArchiveReader::open(&self.path, sevenz_rust2::Password::empty())?;
        Ok(reader
            .archive()
            .files
            .iter()
            .filter(|f| !f.is_directory())
            .map(|f| normalize(f.name()))
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    const PAGES: [(&str, &[u8]); 3] = [
        ("page10.jpg", b"ten"),
        ("page2.jpg", b"two"),
        ("page1.png", b"one"),
    ];

    fn extract_all(archive: &ComicArchive, dir: &Path) -> Vec<Vec<u8>> {
        let n = archive
            .extract_pages(dir, &mut |_, _, _| {})
            .expect("extract");
        (0..n)
            .map(|i| fs::read(dir.join(extracted_page_name(i))).unwrap())
            .collect()
    }

    fn assert_natural_order(archive: &ComicArchive, tmp: &Path) {
        assert_eq!(
            archive.pages().unwrap(),
            vec!["page1.png", "page2.jpg", "page10.jpg"]
        );
        assert_eq!(archive.page_count().unwrap(), 3);
        assert_eq!(archive.read_page(0).unwrap(), b"one");
        assert_eq!(archive.read_page(2).unwrap(), b"ten");
        assert!(archive.read_page(3).is_err());
        let extracted = extract_all(archive, &tmp.join("out"));
        assert_eq!(
            extracted,
            vec![b"one".to_vec(), b"two".to_vec(), b"ten".to_vec()]
        );
    }

    fn write_zip(path: &Path) {
        let mut zip = zip::ZipWriter::new(File::create(path).unwrap());
        let options = zip::write::SimpleFileOptions::default();
        zip.add_directory("folder/", options).unwrap();
        zip.start_file("__MACOSX/._page1.png", options).unwrap();
        zip.write_all(b"junk").unwrap();
        zip.start_file("ComicInfo.xml", options).unwrap();
        zip.write_all(b"<xml/>").unwrap();
        for (name, data) in PAGES {
            zip.start_file(name, options).unwrap();
            zip.write_all(data).unwrap();
        }
        zip.finish().unwrap();
    }

    fn write_tar<W: Write>(out: W) {
        let mut builder = tar::Builder::new(out);
        for (name, data) in PAGES {
            let mut header = tar::Header::new_gnu();
            header.set_size(data.len() as u64);
            header.set_mode(0o644);
            header.set_cksum();
            builder.append_data(&mut header, name, data).unwrap();
        }
        builder.finish().unwrap();
    }

    #[test]
    fn cbz_natural_order_and_extraction() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("book.cbz");
        write_zip(&path);
        let archive = ComicArchive::open(&path).unwrap();
        assert_eq!(archive.kind(), ArchiveKind::Zip);
        assert_natural_order(&archive, tmp.path());
    }

    #[test]
    fn cbt_natural_order_and_extraction() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("book.cbt");
        write_tar(File::create(&path).unwrap());
        let archive = ComicArchive::open(&path).unwrap();
        assert_eq!(archive.kind(), ArchiveKind::Tar);
        assert_natural_order(&archive, tmp.path());
    }

    #[test]
    fn gzipped_cbt_is_read() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("book.cbt");
        let gz = flate2::write::GzEncoder::new(
            File::create(&path).unwrap(),
            flate2::Compression::default(),
        );
        write_tar(gz);
        let archive = ComicArchive::open(&path).unwrap();
        assert_eq!(archive.kind(), ArchiveKind::TarGz);
        assert_natural_order(&archive, tmp.path());
    }

    #[test]
    fn cb7_natural_order_and_extraction() {
        let tmp = tempfile::tempdir().unwrap();
        let src = tmp.path().join("src");
        fs::create_dir_all(src.join("sub")).unwrap();
        for (name, data) in PAGES {
            fs::write(src.join(name), data).unwrap();
        }
        fs::write(src.join("notes.txt"), b"not a page").unwrap();
        let path = tmp.path().join("book.cb7");
        sevenz_rust2::compress_to_path(&src, &path).expect("compress 7z");
        let archive = ComicArchive::open(&path).unwrap();
        assert_eq!(archive.kind(), ArchiveKind::SevenZ);
        assert_natural_order(&archive, tmp.path());
    }

    fn write_rar(path: &Path) {
        fn crc32(data: &[u8]) -> u32 {
            let mut crc = !0u32;
            for &byte in data {
                crc ^= byte as u32;
                for _ in 0..8 {
                    crc = if crc & 1 != 0 {
                        (crc >> 1) ^ 0xEDB8_8320
                    } else {
                        crc >> 1
                    };
                }
            }
            !crc
        }
        let mut out = Vec::new();
        out.extend_from_slice(b"Rar!\x1a\x07\x00");
        out.extend_from_slice(&[
            0xCF, 0x90, 0x73, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        for (name, data) in PAGES {
            let mut header = vec![0x74u8];
            header.extend_from_slice(&0x8000u16.to_le_bytes());
            header.extend_from_slice(&((32 + name.len()) as u16).to_le_bytes());
            header.extend_from_slice(&(data.len() as u32).to_le_bytes());
            header.extend_from_slice(&(data.len() as u32).to_le_bytes());
            header.push(3);
            header.extend_from_slice(&crc32(data).to_le_bytes());
            header.extend_from_slice(&0x5A21_0000u32.to_le_bytes());
            header.push(20);
            header.push(0x30);
            header.extend_from_slice(&(name.len() as u16).to_le_bytes());
            header.extend_from_slice(&0x81A4u32.to_le_bytes());
            header.extend_from_slice(name.as_bytes());
            let head_crc = (crc32(&header) & 0xFFFF) as u16;
            out.extend_from_slice(&head_crc.to_le_bytes());
            out.extend_from_slice(&header);
            out.extend_from_slice(data);
        }
        out.extend_from_slice(&[0xC4, 0x3D, 0x7B, 0x00, 0x40, 0x07, 0x00]);
        fs::write(path, out).unwrap();
    }

    #[test]
    fn cbr_natural_order_and_extraction() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("book.cbr");
        write_rar(&path);
        let archive = ComicArchive::open(&path).unwrap();
        assert_eq!(archive.kind(), ArchiveKind::Rar);
        assert_natural_order(&archive, tmp.path());
    }

    #[test]
    fn plain_zip_rar_7z_tar_extensions_are_read() {
        let tmp = tempfile::tempdir().unwrap();

        let zip = tmp.path().join("a.zip");
        write_zip(&zip);
        let rar = tmp.path().join("a.rar");
        write_rar(&rar);
        let tar = tmp.path().join("a.tar");
        write_tar(File::create(&tar).unwrap());
        let src = tmp.path().join("src");
        fs::create_dir_all(&src).unwrap();
        for (name, data) in PAGES {
            fs::write(src.join(name), data).unwrap();
        }
        let sevenz = tmp.path().join("a.7z");
        sevenz_rust2::compress_to_path(&src, &sevenz).unwrap();

        for (path, kind) in [
            (zip, ArchiveKind::Zip),
            (rar, ArchiveKind::Rar),
            (sevenz, ArchiveKind::SevenZ),
            (tar, ArchiveKind::Tar),
        ] {
            let archive = ComicArchive::open(&path).unwrap();
            assert_eq!(archive.kind(), kind, "{}", path.display());
            assert_eq!(archive.page_count().unwrap(), 3, "{}", path.display());
            assert_eq!(archive.read_page(0).unwrap(), b"one");
        }
    }

    #[test]
    fn magic_bytes_beat_a_wrong_extension() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("actually-zip.cbr");
        write_zip(&path);
        assert_eq!(ArchiveKind::detect(&path), Some(ArchiveKind::Zip));
        let path = tmp.path().join("actually-tar.cbz");
        write_tar(File::create(&path).unwrap());
        assert_eq!(ArchiveKind::detect(&path), Some(ArchiveKind::Tar));
    }

    #[test]
    fn unknown_files_are_rejected() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("notes.txt");
        fs::write(&path, b"hello").unwrap();
        assert!(ComicArchive::open(&path).is_err());
    }

    #[test]
    fn natural_order_and_page_filter() {
        let mut names = vec!["10.jpg", "2.jpg", "1.jpg", "B/1.jpg", "a/2.jpg", "a/10.jpg"];
        names.sort_by(|a, b| natural_cmp(a, b));
        assert_eq!(
            names,
            vec!["1.jpg", "2.jpg", "10.jpg", "a/2.jpg", "a/10.jpg", "B/1.jpg"]
        );
        assert!(is_page_entry("dir/001.JPG"));
        assert!(!is_page_entry("__MACOSX/dir/._001.jpg"));
        assert!(!is_page_entry(".hidden.png"));
        assert!(!is_page_entry("dir/"));
        assert!(!is_page_entry("ComicInfo.xml"));
    }
}

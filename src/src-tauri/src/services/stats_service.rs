use crate::models::stats::{
    Bucket, DayStat, MonthStat, ReadingSessionRecord, ReadingSummary, RecentSession, StatsOverview,
    TimeBucket, Totals,
};
use crate::models::{BookRecord, SeriesRecord};
use crate::services::jellyfin_service::JellyfinItem;
use chrono::{DateTime, Datelike, Duration, NaiveDate, Timelike, Utc};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

const DAILY_DAYS: i64 = 365;
const MONTHS: i64 = 12;
const TOP_N: usize = 12;
const TOP_TIME_N: usize = 8;
const RECENT_N: usize = 8;
const MAX_SESSION_SECS: i64 = 24 * 3600;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceFilter {
    All,
    Local,
    Jellyfin,
}

impl SourceFilter {
    pub fn parse(value: &str) -> Self {
        match value {
            "local" => Self::Local,
            "jellyfin" => Self::Jellyfin,
            _ => Self::All,
        }
    }

    pub fn includes_local(self) -> bool {
        matches!(self, Self::All | Self::Local)
    }

    pub fn includes_jellyfin(self) -> bool {
        matches!(self, Self::All | Self::Jellyfin)
    }
}

#[derive(Debug, Clone)]
pub struct StatsFilter {
    pub source: SourceFilter,
    pub server_id: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct StatBook {
    pub source: String,
    pub server_id: Option<String>,
    pub source_label: String,
    pub book_ref: String,
    pub title: String,
    pub series: Option<String>,
    pub format: String,
    pub read: bool,
    pub reading: bool,
    pub favorite: bool,
    pub rating: Option<i64>,
    pub pages: i64,
    pub size_bytes: i64,
    pub genres: Vec<String>,
    pub creators: Vec<String>,
    pub added_at: Option<DateTime<Utc>>,
    pub last_read_at: Option<DateTime<Utc>>,
}

impl StatBook {
    pub fn from_jellyfin(
        server_id: &str,
        server_name: &str,
        item: &JellyfinItem,
        library_series: Option<&str>,
    ) -> Self {
        let parent_folder = item.path.as_deref().and_then(|path| {
            let mut parts = path.rsplit(['/', '\\']);
            parts.next()?;
            parts.next().map(str::to_string)
        });
        Self {
            source: "jellyfin".into(),
            server_id: Some(server_id.into()),
            source_label: server_name.into(),
            book_ref: format!("jf:{server_id}:{}", item.id),
            title: item.name.clone(),
            series: item
                .series_name
                .clone()
                .or(parent_folder)
                .filter(|s| !s.trim().is_empty() && Some(s.as_str()) != library_series),
            format: item.format.clone().unwrap_or_default(),
            read: item.played,
            reading: item.resume_page > 0 && !item.played,
            favorite: item.favorite,
            rating: None,
            pages: 0,
            size_bytes: item.size.unwrap_or(0),
            genres: item.genres.clone(),
            creators: item
                .people
                .iter()
                .filter(|p| {
                    let role = p.role.to_lowercase();
                    role.is_empty() || role.contains("writer") || role.contains("author")
                })
                .map(|p| p.name.clone())
                .collect(),
            added_at: item.date_created.as_deref().and_then(parse_time),
            last_read_at: item.last_played.as_deref().and_then(parse_time),
        }
    }

    pub fn from_local(book: &BookRecord, series: Option<&SeriesRecord>) -> Self {
        let extension = std::path::Path::new(&book.path)
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        Self {
            source: "local".into(),
            server_id: None,
            source_label: "Local".into(),
            book_ref: book
                .id
                .as_ref()
                .map(|id| id.to_string())
                .unwrap_or_else(|| format!("{}_{}", book.external_id, book.provider_id)),
            title: book.title.clone(),
            series: series.map(|s| s.title.clone()),
            format: book
                .format
                .clone()
                .filter(|f| !f.is_empty())
                .unwrap_or(extension),
            read: book.read,
            reading: book.reading,
            favorite: book.favorite,
            rating: book.note,
            pages: book.page_count,
            size_bytes: std::fs::metadata(&book.path)
                .ok()
                .filter(|m| m.is_file())
                .map(|m| m.len() as i64)
                .unwrap_or(0),
            genres: series.map(|s| s.genres.clone()).unwrap_or_default(),
            creators: book.creators.iter().map(|c| c.name.clone()).collect(),
            added_at: book.created_at.as_deref().and_then(parse_time),
            last_read_at: None,
        }
    }
}

pub struct StatsInput {
    pub books: Vec<StatBook>,
    pub local_series: i64,
    pub sessions: Vec<ReadingSessionRecord>,
    pub now: DateTime<Utc>,
    pub offset_minutes: i32,
    pub warnings: Vec<String>,
}

pub fn parse_time(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|t| t.with_timezone(&Utc))
}

fn normalize_key(value: &str) -> String {
    value.trim().to_lowercase()
}

fn top_buckets(counts: HashMap<String, (String, i64)>, limit: usize) -> Vec<Bucket> {
    let mut list: Vec<Bucket> = counts
        .into_values()
        .map(|(label, count)| Bucket { key: label, count })
        .collect();
    list.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.key.cmp(&b.key)));
    list.truncate(limit);
    list
}

fn count_labels<'a>(labels: impl Iterator<Item = &'a str>) -> HashMap<String, (String, i64)> {
    let mut counts: HashMap<String, (String, i64)> = HashMap::new();
    for label in labels {
        let key = normalize_key(label);
        if key.is_empty() {
            continue;
        }
        counts
            .entry(key)
            .and_modify(|(_, n)| *n += 1)
            .or_insert((label.trim().to_string(), 1));
    }
    counts
}

fn top_time(map: HashMap<String, (String, i64)>, limit: usize) -> Vec<TimeBucket> {
    let mut list: Vec<TimeBucket> = map
        .into_values()
        .filter(|(_, secs)| *secs > 0)
        .map(|(label, secs)| TimeBucket { key: label, secs })
        .collect();
    list.sort_by(|a, b| b.secs.cmp(&a.secs).then_with(|| a.key.cmp(&b.key)));
    list.truncate(limit);
    list
}

fn add_time(map: &mut HashMap<String, (String, i64)>, label: &str, secs: i64) {
    let key = normalize_key(label);
    if key.is_empty() {
        return;
    }
    map.entry(key)
        .and_modify(|(_, total)| *total += secs)
        .or_insert((label.trim().to_string(), secs));
}

fn month_key(date: NaiveDate) -> String {
    format!("{:04}-{:02}", date.year(), date.month())
}

fn previous_months(today: NaiveDate, count: i64) -> Vec<String> {
    let mut months = Vec::new();
    let (mut year, mut month) = (today.year(), today.month() as i32);
    for _ in 0..count {
        months.push(format!("{:04}-{:02}", year, month));
        month -= 1;
        if month == 0 {
            month = 12;
            year -= 1;
        }
    }
    months.reverse();
    months
}

fn dense_months(counts: &BTreeMap<String, i64>, today: NaiveDate) -> Vec<MonthStat> {
    previous_months(today, MONTHS)
        .into_iter()
        .map(|month| MonthStat {
            count: counts.get(&month).copied().unwrap_or(0),
            month,
        })
        .collect()
}

fn current_streak(active: &BTreeSet<NaiveDate>, today: NaiveDate) -> i64 {
    let mut day = if active.contains(&today) {
        today
    } else {
        today - Duration::days(1)
    };
    let mut streak = 0;
    while active.contains(&day) {
        streak += 1;
        day -= Duration::days(1);
    }
    streak
}

fn longest_streak(active: &BTreeSet<NaiveDate>) -> i64 {
    let mut best = 0;
    let mut run = 0;
    let mut previous: Option<NaiveDate> = None;
    for day in active {
        run = match previous {
            Some(p) if *day - p == Duration::days(1) => run + 1,
            _ => 1,
        };
        best = best.max(run);
        previous = Some(*day);
    }
    best
}

pub fn compute(input: StatsInput, filter: &StatsFilter) -> StatsOverview {
    let offset = Duration::minutes(input.offset_minutes as i64);
    let local_of = |t: DateTime<Utc>| t + offset;
    let today = local_of(input.now).date_naive();

    let books: Vec<&StatBook> = input
        .books
        .iter()
        .filter(|b| match b.source.as_str() {
            "local" => filter.source.includes_local(),
            _ => {
                filter.source.includes_jellyfin()
                    && filter
                        .server_id
                        .as_ref()
                        .is_none_or(|id| b.server_id.as_ref() == Some(id))
            }
        })
        .collect();

    let sessions: Vec<&ReadingSessionRecord> = input
        .sessions
        .iter()
        .filter(|s| match s.source.as_str() {
            "local" => filter.source.includes_local(),
            _ => {
                filter.source.includes_jellyfin()
                    && filter
                        .server_id
                        .as_ref()
                        .is_none_or(|id| s.server_id.as_ref() == Some(id))
            }
        })
        .filter(|s| s.duration_secs > 0 || s.pages_read > 0)
        .filter(|s| parse_time(&s.started_at).is_some())
        .collect();

    let read = books.iter().filter(|b| b.read).count() as i64;
    let reading = books.iter().filter(|b| b.reading && !b.read).count() as i64;
    let rated: Vec<i64> = books
        .iter()
        .filter_map(|b| b.rating)
        .filter(|r| *r > 0)
        .map(|r| r.clamp(1, 5))
        .collect();
    let mut ratings = vec![0i64; 5];
    for r in &rated {
        ratings[(*r - 1) as usize] += 1;
    }
    let mut jellyfin_series: HashSet<String> = HashSet::new();
    for b in books.iter().filter(|b| b.source != "local") {
        if let Some(series) = b.series.as_deref().map(normalize_key) {
            if !series.is_empty() {
                jellyfin_series.insert(format!(
                    "{}:{}",
                    b.server_id.clone().unwrap_or_default(),
                    series
                ));
            }
        }
    }
    let series = if filter.source.includes_local() {
        input.local_series
    } else {
        0
    } + jellyfin_series.len() as i64;

    let totals = Totals {
        books: books.len() as i64,
        series,
        read,
        reading,
        unread: books.len() as i64 - read - reading,
        favorites: books.iter().filter(|b| b.favorite).count() as i64,
        rated: rated.len() as i64,
        average_rating: if rated.is_empty() {
            0.0
        } else {
            (rated.iter().sum::<i64>() as f64 / rated.len() as f64 * 10.0).round() / 10.0
        },
        pages: books.iter().map(|b| b.pages.max(0)).sum(),
        size_bytes: books.iter().map(|b| b.size_bytes.max(0)).sum(),
    };

    let format_labels: Vec<String> = books
        .iter()
        .map(|b| {
            if b.format.is_empty() {
                "?".to_string()
            } else {
                b.format.to_uppercase()
            }
        })
        .collect();
    let formats = top_buckets(
        count_labels(format_labels.iter().map(String::as_str)),
        TOP_N,
    );
    let sources = top_buckets(
        count_labels(books.iter().map(|b| b.source_label.as_str())),
        TOP_N,
    );
    let genres = top_buckets(
        count_labels(
            books
                .iter()
                .flat_map(|b| b.genres.iter().map(String::as_str)),
        ),
        TOP_N,
    );
    let creators = top_buckets(
        count_labels(
            books
                .iter()
                .flat_map(|b| b.creators.iter().map(String::as_str)),
        ),
        TOP_N,
    );

    let mut added: BTreeMap<String, i64> = BTreeMap::new();
    for b in &books {
        if let Some(at) = b.added_at {
            *added
                .entry(month_key(local_of(at).date_naive()))
                .or_default() += 1;
        }
    }

    let mut day_secs: BTreeMap<NaiveDate, i64> = BTreeMap::new();
    let mut day_pages: BTreeMap<NaiveDate, i64> = BTreeMap::new();
    let mut day_books: BTreeMap<NaiveDate, BTreeSet<String>> = BTreeMap::new();
    let mut weekday = vec![0i64; 7];
    let mut hour = vec![0i64; 24];
    let mut series_time: HashMap<String, (String, i64)> = HashMap::new();
    let mut book_time: HashMap<String, (String, i64)> = HashMap::new();
    let mut format_time: HashMap<String, (String, i64)> = HashMap::new();
    let mut finished_at: HashMap<String, DateTime<Utc>> = HashMap::new();
    let mut total_secs = 0;
    let mut longest_session = 0;
    let mut pages_read = 0;

    for s in &sessions {
        let Some(start) = parse_time(&s.started_at) else {
            continue;
        };
        let secs = s.duration_secs.clamp(0, MAX_SESSION_SECS);
        let local = local_of(start);
        let date = local.date_naive();
        *day_secs.entry(date).or_default() += secs;
        *day_pages.entry(date).or_default() += s.pages_read.max(0);
        day_books
            .entry(date)
            .or_default()
            .insert(s.book_ref.clone());
        weekday[local.weekday().num_days_from_monday() as usize] += secs;
        hour[local.hour() as usize] += secs;
        total_secs += secs;
        longest_session = longest_session.max(secs);
        pages_read += s.pages_read.max(0);
        add_time(
            &mut series_time,
            s.series_title
                .as_deref()
                .filter(|t| !t.trim().is_empty())
                .unwrap_or(&s.title),
            secs,
        );
        add_time(&mut book_time, &s.title, secs);
        add_time(
            &mut format_time,
            &s.format.clone().unwrap_or_default().to_uppercase(),
            secs,
        );
        if s.completed {
            finished_at
                .entry(s.book_ref.clone())
                .and_modify(|t| *t = (*t).min(start))
                .or_insert(start);
        }
    }

    for b in books.iter().filter(|b| b.source != "local") {
        if let Some(at) = b.last_read_at {
            let date = local_of(at).date_naive();
            day_books
                .entry(date)
                .or_default()
                .insert(b.book_ref.clone());
            if b.read {
                finished_at.entry(b.book_ref.clone()).or_insert(at);
            }
        }
    }

    let mut finished: BTreeMap<String, i64> = BTreeMap::new();
    for at in finished_at.values() {
        *finished
            .entry(month_key(local_of(*at).date_naive()))
            .or_default() += 1;
    }

    let mut active: BTreeSet<NaiveDate> = BTreeSet::new();
    active.extend(day_secs.iter().filter(|(_, s)| **s > 0).map(|(d, _)| *d));
    active.extend(
        day_books
            .iter()
            .filter(|(_, b)| !b.is_empty())
            .map(|(d, _)| *d),
    );

    let daily: Vec<DayStat> = (0..DAILY_DAYS)
        .rev()
        .map(|back| {
            let date = today - Duration::days(back);
            DayStat {
                date: date.format("%Y-%m-%d").to_string(),
                secs: day_secs.get(&date).copied().unwrap_or(0),
                pages: day_pages.get(&date).copied().unwrap_or(0),
                books: day_books.get(&date).map_or(0, |b| b.len() as i64),
            }
        })
        .collect();

    let session_count = sessions.len() as i64;
    let mut recent: Vec<&&ReadingSessionRecord> = sessions.iter().collect();
    recent.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    StatsOverview {
        generated_at: input.now.to_rfc3339(),
        totals,
        reading: ReadingSummary {
            total_secs,
            sessions: session_count,
            average_session_secs: if session_count > 0 {
                total_secs / session_count
            } else {
                0
            },
            longest_session_secs: longest_session,
            pages_read,
            pages_per_hour: if total_secs >= 60 {
                (pages_read as f64 / (total_secs as f64 / 3600.0) * 10.0).round() / 10.0
            } else {
                0.0
            },
            active_days: active.len() as i64,
            current_streak: current_streak(&active, today),
            longest_streak: longest_streak(&active),
            books_finished: finished_at.len() as i64,
        },
        daily,
        by_weekday: weekday,
        by_hour: hour,
        finished_by_month: dense_months(&finished, today),
        added_by_month: dense_months(&added, today),
        formats,
        sources,
        ratings,
        genres,
        creators,
        time_by_format: top_time(format_time, TOP_N),
        top_series: top_time(series_time, TOP_TIME_N),
        top_books: top_time(book_time, TOP_TIME_N),
        recent: recent
            .into_iter()
            .take(RECENT_N)
            .map(|s| RecentSession {
                title: s.title.clone(),
                source: s.source.clone(),
                started_at: s.started_at.clone(),
                duration_secs: s.duration_secs.clamp(0, MAX_SESSION_SECS),
                pages_read: s.pages_read,
                completed: s.completed,
            })
            .collect(),
        warnings: input.warnings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(s: &str) -> DateTime<Utc> {
        parse_time(s).unwrap()
    }

    fn book(source: &str, server: Option<&str>, title: &str) -> StatBook {
        StatBook {
            source: source.into(),
            server_id: server.map(str::to_string),
            source_label: if source == "local" {
                "Local".into()
            } else {
                "Home".into()
            },
            book_ref: format!("{source}:{title}"),
            title: title.into(),
            format: "cbz".into(),
            ..Default::default()
        }
    }

    fn session(
        source: &str,
        server: Option<&str>,
        book_ref: &str,
        start: &str,
        secs: i64,
        pages: i64,
        completed: bool,
    ) -> ReadingSessionRecord {
        ReadingSessionRecord {
            session_id: format!("{book_ref}-{start}"),
            source: source.into(),
            server_id: server.map(str::to_string),
            book_ref: book_ref.into(),
            title: book_ref.into(),
            series_title: Some("Saga".into()),
            format: Some("cbz".into()),
            started_at: start.into(),
            ended_at: start.into(),
            duration_secs: secs,
            pages_read: pages,
            page_count: 20,
            completed,
        }
    }

    fn input(books: Vec<StatBook>, sessions: Vec<ReadingSessionRecord>) -> StatsInput {
        StatsInput {
            books,
            local_series: 3,
            sessions,
            now: at("2026-09-20T12:00:00Z"),
            offset_minutes: 0,
            warnings: vec![],
        }
    }

    fn all() -> StatsFilter {
        StatsFilter {
            source: SourceFilter::All,
            server_id: None,
        }
    }

    #[test]
    fn library_totals_and_buckets() {
        let mut a = book("local", None, "A");
        a.read = true;
        a.favorite = true;
        a.rating = Some(5);
        a.pages = 30;
        a.genres = vec!["Sci-Fi".into(), "Drama".into()];
        a.creators = vec!["Alan".into()];
        let mut b = book("local", None, "B");
        b.reading = true;
        b.rating = Some(3);
        b.pages = 10;
        b.genres = vec!["sci-fi".into()];
        let mut c = book("jellyfin", Some("s1"), "C");
        c.format = "pdf".into();
        c.series = Some("Saga".into());
        c.size_bytes = 1000;
        let d = {
            let mut d = book("jellyfin", Some("s1"), "D");
            d.series = Some("saga".into());
            d
        };

        let out = compute(input(vec![a, b, c, d], vec![]), &all());
        assert_eq!(out.totals.books, 4);
        assert_eq!(
            (out.totals.read, out.totals.reading, out.totals.unread),
            (1, 1, 2)
        );
        assert_eq!(
            out.totals.series,
            3 + 1,
            "3 local + one Jellyfin series (case-insensitive)"
        );
        assert_eq!(out.totals.favorites, 1);
        assert_eq!(out.totals.average_rating, 4.0);
        assert_eq!(out.totals.pages, 40);
        assert_eq!(out.ratings, vec![0, 0, 1, 0, 1]);
        assert_eq!(
            out.genres[0],
            Bucket {
                key: "Sci-Fi".into(),
                count: 2
            }
        );
        assert_eq!(
            out.formats[0],
            Bucket {
                key: "CBZ".into(),
                count: 3
            }
        );
        assert!(out.formats.contains(&Bucket {
            key: "PDF".into(),
            count: 1
        }));
        assert_eq!(
            out.sources[0],
            Bucket {
                key: "Home".into(),
                count: 2
            }
        );
    }

    #[test]
    fn source_and_server_filters_apply_to_books_and_sessions() {
        let books = vec![
            book("local", None, "A"),
            book("jellyfin", Some("s1"), "B"),
            book("jellyfin", Some("s2"), "C"),
        ];
        let sessions = vec![
            session(
                "local",
                None,
                "local:A",
                "2026-09-20T08:00:00Z",
                600,
                5,
                false,
            ),
            session(
                "jellyfin",
                Some("s1"),
                "jellyfin:B",
                "2026-09-20T09:00:00Z",
                300,
                3,
                false,
            ),
            session(
                "jellyfin",
                Some("s2"),
                "jellyfin:C",
                "2026-09-20T10:00:00Z",
                100,
                1,
                false,
            ),
        ];
        let run = |source, server: Option<&str>| {
            compute(
                input(books.clone(), sessions.clone()),
                &StatsFilter {
                    source,
                    server_id: server.map(str::to_string),
                },
            )
        };
        assert_eq!(run(SourceFilter::All, None).reading.total_secs, 1000);
        assert_eq!(run(SourceFilter::Local, None).reading.total_secs, 600);
        assert_eq!(run(SourceFilter::Local, None).totals.books, 1);
        assert_eq!(run(SourceFilter::Jellyfin, None).reading.total_secs, 400);
        let one = run(SourceFilter::Jellyfin, Some("s1"));
        assert_eq!((one.reading.total_secs, one.totals.books), (300, 1));
    }

    #[test]
    fn streaks_and_daily_series() {
        let sessions = vec![
            session("local", None, "x", "2026-09-17T10:00:00Z", 60, 2, false),
            session("local", None, "x", "2026-09-18T10:00:00Z", 60, 2, false),
            session("local", None, "x", "2026-09-19T10:00:00Z", 60, 2, false),
            session("local", None, "x", "2026-09-20T10:00:00Z", 120, 4, false),
            session("local", None, "x", "2026-09-01T10:00:00Z", 60, 1, false),
            session("local", None, "x", "2026-09-02T10:00:00Z", 60, 1, false),
            session("local", None, "x", "2026-09-03T10:00:00Z", 60, 1, false),
            session("local", None, "x", "2026-09-04T10:00:00Z", 60, 1, false),
            session("local", None, "x", "2026-09-05T10:00:00Z", 60, 1, false),
        ];
        let out = compute(input(vec![], sessions), &all());
        assert_eq!(out.reading.current_streak, 4);
        assert_eq!(out.reading.longest_streak, 5, "Sep 1-5 beats Sep 17-20");
        assert_eq!(out.reading.active_days, 9);
        assert_eq!(out.daily.len(), 365);
        let last = out.daily.last().unwrap();
        assert_eq!(
            (last.date.as_str(), last.secs, last.pages),
            ("2026-09-20", 120, 4)
        );
        assert_eq!(out.reading.average_session_secs, 600 / 9);
        assert_eq!(out.reading.longest_session_secs, 120);
    }

    #[test]
    fn a_streak_survives_an_empty_today() {
        let sessions = vec![
            session("local", None, "x", "2026-09-18T10:00:00Z", 60, 2, false),
            session("local", None, "x", "2026-09-19T10:00:00Z", 60, 2, false),
        ];
        let out = compute(input(vec![], sessions), &all());
        assert_eq!(out.reading.current_streak, 2);

        let stale = vec![session(
            "local",
            None,
            "x",
            "2026-09-10T10:00:00Z",
            60,
            2,
            false,
        )];
        assert_eq!(
            compute(input(vec![], stale), &all()).reading.current_streak,
            0
        );
    }

    #[test]
    fn the_timezone_offset_moves_late_sessions_to_the_next_day() {
        let sessions = vec![session(
            "local",
            None,
            "x",
            "2026-09-19T23:30:00Z",
            600,
            4,
            false,
        )];
        let mut data = input(vec![], sessions);
        data.offset_minutes = 120;
        let out = compute(data, &all());
        let day = out.daily.iter().find(|d| d.secs > 0).unwrap();
        assert_eq!(day.date, "2026-09-20");
        assert_eq!(out.by_hour[1], 600, "01:30 local time");
        assert_eq!(out.by_weekday[6], 600, "2026-09-20 is a Sunday");
    }

    #[test]
    fn finished_books_come_from_sessions_and_from_jellyfin() {
        let mut jf = book("jellyfin", Some("s1"), "J");
        jf.read = true;
        jf.last_read_at = Some(at("2026-08-15T10:00:00Z"));
        let sessions = vec![
            session(
                "local",
                None,
                "local:L",
                "2026-09-05T10:00:00Z",
                900,
                20,
                true,
            ),
            session(
                "local",
                None,
                "local:L",
                "2026-09-06T10:00:00Z",
                900,
                20,
                true,
            ),
            session(
                "local",
                None,
                "local:M",
                "2026-07-06T10:00:00Z",
                900,
                20,
                false,
            ),
        ];
        let out = compute(input(vec![jf], sessions), &all());
        assert_eq!(
            out.reading.books_finished, 2,
            "a book finished twice counts once"
        );
        let count = |month: &str| {
            out.finished_by_month
                .iter()
                .find(|m| m.month == month)
                .map(|m| m.count)
        };
        assert_eq!(count("2026-09"), Some(1));
        assert_eq!(count("2026-08"), Some(1));
        assert_eq!(out.finished_by_month.len(), 12);
        assert_eq!(out.finished_by_month.last().unwrap().month, "2026-09");
        assert_eq!(out.finished_by_month.first().unwrap().month, "2025-10");
    }

    #[test]
    fn rankings_and_pace() {
        let sessions = vec![
            session(
                "local",
                None,
                "local:One",
                "2026-09-20T08:00:00Z",
                1800,
                30,
                false,
            ),
            session(
                "local",
                None,
                "local:Two",
                "2026-09-20T09:00:00Z",
                1800,
                30,
                false,
            ),
            session(
                "local",
                None,
                "local:Two",
                "2026-09-19T09:00:00Z",
                600,
                5,
                false,
            ),
        ];
        let out = compute(input(vec![], sessions), &all());
        assert_eq!(
            out.top_series,
            vec![TimeBucket {
                key: "Saga".into(),
                secs: 4200
            }]
        );
        assert_eq!(
            out.top_books[0],
            TimeBucket {
                key: "local:Two".into(),
                secs: 2400
            }
        );
        assert_eq!(out.reading.pages_per_hour, 55.7);
        assert_eq!(out.recent.len(), 3);
        assert_eq!(out.recent[0].started_at, "2026-09-20T09:00:00Z");
        assert_eq!(
            out.time_by_format[0],
            TimeBucket {
                key: "CBZ".into(),
                secs: 4200
            }
        );
    }

    #[test]
    fn junk_sessions_are_ignored_or_capped() {
        let sessions = vec![
            session("local", None, "x", "2026-09-20T08:00:00Z", 0, 0, false),
            session("local", None, "x", "not a date", 500, 5, false),
            session(
                "local",
                None,
                "y",
                "2026-09-20T08:00:00Z",
                10 * 24 * 3600,
                5,
                false,
            ),
        ];
        let out = compute(input(vec![], sessions), &all());
        assert_eq!(out.reading.total_secs, MAX_SESSION_SECS);
        assert_eq!(out.reading.sessions, 1);
    }

    #[test]
    fn empty_input_is_all_zeros_but_well_formed() {
        let out = compute(input(vec![], vec![]), &all());
        assert_eq!(out.totals.books, 0);
        assert_eq!(out.daily.len(), 365);
        assert_eq!(out.by_hour.len(), 24);
        assert_eq!(out.by_weekday.len(), 7);
        assert_eq!(out.ratings, vec![0; 5]);
        assert_eq!(out.reading.current_streak, 0);
        assert_eq!(out.reading.pages_per_hour, 0.0);
    }

    #[test]
    fn jellyfin_items_become_stat_books() {
        use crate::services::jellyfin_service::{JellyfinItem, JellyfinPerson};
        let item = JellyfinItem {
            id: "i1".into(),
            name: "Saga 01".into(),
            path: Some("/media/Comics/Saga/Saga 01.cbz".into()),
            format: Some("cbz".into()),
            played: true,
            size: Some(2048),
            genres: vec!["Fantasy".into()],
            people: vec![
                JellyfinPerson {
                    name: "Brian".into(),
                    role: "Writer".into(),
                },
                JellyfinPerson {
                    name: "Fiona".into(),
                    role: "Penciller".into(),
                },
            ],
            date_created: Some("2026-01-02T03:04:05.1234567Z".into()),
            last_played: Some("2026-09-01T10:00:00.0000000Z".into()),
            ..Default::default()
        };
        let stat = StatBook::from_jellyfin("s1", "Home", &item, Some("Comics"));
        assert_eq!(stat.book_ref, "jf:s1:i1");
        assert_eq!(stat.series.as_deref(), Some("Saga"));
        assert_eq!(stat.creators, vec!["Brian".to_string()]);
        assert!(stat.read && !stat.reading);
        assert_eq!(stat.size_bytes, 2048);
        assert_eq!(stat.added_at, Some(at("2026-01-02T03:04:05.1234567Z")));
        assert_eq!(stat.last_read_at, Some(at("2026-09-01T10:00:00Z")));

        let loose = JellyfinItem {
            path: Some("/media/Comics/Loose.cbz".into()),
            ..item
        };
        assert_eq!(
            StatBook::from_jellyfin("s1", "Home", &loose, Some("Comics")).series,
            None,
            "a book directly in the library has no series"
        );
    }
}

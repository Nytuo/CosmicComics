use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReadingSessionRecord {
    pub session_id: String,
    pub source: String,
    #[serde(default)]
    pub server_id: Option<String>,
    pub book_ref: String,
    pub title: String,
    #[serde(default)]
    pub series_title: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
    pub started_at: String,
    pub ended_at: String,
    pub duration_secs: i64,
    pub pages_read: i64,
    pub page_count: i64,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Bucket {
    pub key: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TimeBucket {
    pub key: String,
    pub secs: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct DayStat {
    pub date: String,
    pub secs: i64,
    pub pages: i64,
    pub books: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct MonthStat {
    pub month: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Totals {
    pub books: i64,
    pub series: i64,
    pub read: i64,
    pub reading: i64,
    pub unread: i64,
    pub favorites: i64,
    pub rated: i64,
    pub average_rating: f64,
    pub pages: i64,
    pub size_bytes: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ReadingSummary {
    pub total_secs: i64,
    pub sessions: i64,
    pub average_session_secs: i64,
    pub longest_session_secs: i64,
    pub pages_read: i64,
    pub pages_per_hour: f64,
    pub active_days: i64,
    pub current_streak: i64,
    pub longest_streak: i64,
    pub books_finished: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct RecentSession {
    pub title: String,
    pub source: String,
    pub started_at: String,
    pub duration_secs: i64,
    pub pages_read: i64,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct StatsOverview {
    pub generated_at: String,
    pub totals: Totals,
    pub reading: ReadingSummary,
    pub daily: Vec<DayStat>,
    pub by_weekday: Vec<i64>,
    pub by_hour: Vec<i64>,
    pub finished_by_month: Vec<MonthStat>,
    pub added_by_month: Vec<MonthStat>,
    pub formats: Vec<Bucket>,
    pub sources: Vec<Bucket>,
    pub ratings: Vec<i64>,
    pub genres: Vec<Bucket>,
    pub creators: Vec<Bucket>,
    pub time_by_format: Vec<TimeBucket>,
    pub top_series: Vec<TimeBucket>,
    pub top_books: Vec<TimeBucket>,
    pub recent: Vec<RecentSession>,
    pub warnings: Vec<String>,
}

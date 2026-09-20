import { invoke } from '@tauri-apps/api/core';

export interface Bucket {
  key: string;
  count: number;
}

export interface TimeBucket {
  key: string;
  secs: number;
}

export interface DayStat {
  date: string;
  secs: number;
  pages: number;
  books: number;
}

export interface MonthStat {
  month: string;
  count: number;
}

export interface StatsOverview {
  generated_at: string;
  totals: {
    books: number;
    series: number;
    read: number;
    reading: number;
    unread: number;
    favorites: number;
    rated: number;
    average_rating: number;
    pages: number;
    size_bytes: number;
  };
  reading: {
    total_secs: number;
    sessions: number;
    average_session_secs: number;
    longest_session_secs: number;
    pages_read: number;
    pages_per_hour: number;
    active_days: number;
    current_streak: number;
    longest_streak: number;
    books_finished: number;
  };
  daily: DayStat[];
  by_weekday: number[];
  by_hour: number[];
  finished_by_month: MonthStat[];
  added_by_month: MonthStat[];
  formats: Bucket[];
  sources: Bucket[];
  ratings: number[];
  genres: Bucket[];
  creators: Bucket[];
  time_by_format: TimeBucket[];
  top_series: TimeBucket[];
  top_books: TimeBucket[];
  recent: {
    title: string;
    source: string;
    started_at: string;
    duration_secs: number;
    pages_read: number;
    completed: boolean;
  }[];
  warnings: string[];
}

export type StatsSource = 'all' | 'local' | 'jellyfin';

export const getOverview = (
  source: StatsSource,
  serverId: string,
  refresh = false
): Promise<StatsOverview> =>
  invoke('stats_get_overview', {
    source,
    serverId: serverId || null,
    offsetMinutes: -new Date().getTimezoneOffset(),
    refresh,
  });

export const clearHistory = (): Promise<void> =>
  invoke('stats_clear_history', {});

export interface SessionMeta {
  source: 'local' | 'jellyfin';
  serverId?: string;
  bookRef: string;
  title: string;
  seriesTitle?: string;
  format?: string;
}

const HEARTBEAT_MS = 20_000;
const IDLE_AFTER_MS = 3 * 60_000;
const MIN_SECS_TO_KEEP = 5;
const ACTIVITY_EVENTS = [
  'pointerdown',
  'touchstart',
  'keydown',
  'wheel',
  'scroll',
] as const;

export class ReadingSessionTracker {
  private readonly id = crypto.randomUUID();
  private readonly startedAt = new Date();
  private activeSecs = 0;
  private lastActivity = Date.now();
  private visited = new Set<number>();
  private maxPage = 0;
  private pageCount = 0;
  private dirty = false;
  private timers: number[] = [];

  constructor(private readonly meta: SessionMeta) {}

  start() {
    const touch = () => (this.lastActivity = Date.now());
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, touch, { passive: true, capture: true })
    );
    const hide = () => {
      if (document.visibilityState === 'hidden') this.flush();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', this.flushNow);
    this.timers.push(
      window.setInterval(() => {
        if (
          document.visibilityState === 'visible' &&
          Date.now() - this.lastActivity < IDLE_AFTER_MS
        ) {
          this.activeSecs += 1;
          this.dirty = true;
        }
      }, 1000),
      window.setInterval(() => this.flush(), HEARTBEAT_MS)
    );
    this.stopListeners = () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, touch, { capture: true })
      );
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', this.flushNow);
    };
  }

  private stopListeners: () => void = () => {};

  private flushNow = () => this.flush();

  update(page: number, pageCount: number) {
    this.lastActivity = Date.now();
    this.pageCount = pageCount;
    if (!this.visited.has(page)) {
      this.visited.add(page);
      this.dirty = true;
    }
    this.maxPage = Math.max(this.maxPage, page);
  }

  private flush() {
    if (!this.dirty) return;
    if (this.activeSecs < MIN_SECS_TO_KEEP && this.visited.size < 2) return;
    this.dirty = false;
    invoke('stats_record_session', {
      session: {
        session_id: this.id,
        source: this.meta.source,
        server_id: this.meta.serverId ?? null,
        book_ref: this.meta.bookRef,
        title: this.meta.title,
        series_title: this.meta.seriesTitle ?? null,
        format: this.meta.format ?? null,
        started_at: this.startedAt.toISOString(),
        ended_at: new Date().toISOString(),
        duration_secs: this.activeSecs,
        pages_read: this.visited.size,
        page_count: this.pageCount,
        completed:
          this.pageCount > 1 &&
          this.maxPage >= this.pageCount - 1 &&
          this.visited.size > 1,
      },
    }).catch((e) => console.warn('Reading session not saved:', e));
  }

  stop() {
    this.stopListeners();
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    this.flush();
  }
}

/**
 * Dev-only harness: lets the UI run in a plain browser (no Rust backend) with
 * fake data, so layouts can be checked at any viewport size.
 *
 *   npm run dev:vite  →  http://localhost:1420/?mock=mobile   (or ?mock=desktop)
 *
 * The flavour is kept in sessionStorage by main.tsx (`?mock=off` clears it).
 * Only imported behind `import.meta.env.DEV`, so it never ships.
 */
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';

type Flavor = 'mobile' | 'desktop';

const SERIES = [
  { title: 'Nebula Riders', hue: 265, volumes: 6, read: 3 },
  { title: 'Iron Sparrow', hue: 12, volumes: 4, read: 4 },
  { title: 'Paper Moons', hue: 195, volumes: 5, read: 0 },
  { title: 'Kaiju Cafe', hue: 140, volumes: 3, read: 1 },
  { title: 'The Long Orbit', hue: 45, volumes: 8, read: 2 },
];
const PAGES_PER_BOOK = 24;

const hash = (s: string) =>
  [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;

const svgUri = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(
    /[()']/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )}`;

function coverUri(title: string, hue: number, volume?: number) {
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue},70%,45%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},70%,18%)"/>
  </linearGradient></defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <circle cx="300" cy="150" r="90" fill="hsl(${hue},90%,70%)" opacity=".35"/>
  <circle cx="90" cy="420" r="140" fill="hsl(${hue},80%,60%)" opacity=".2"/>
  <text x="30" y="470" font-family="Impact, sans-serif" font-size="46" fill="#fff">${title}</text>
  ${volume ? `<text x="30" y="530" font-family="sans-serif" font-size="30" fill="#fff" opacity=".8">Vol. ${volume}</text>` : ''}
</svg>`);
}

function pageUri(bookPath: string, page: number) {
  const hue = hash(bookPath) % 360;
  const wide = page % 11 === 10;
  const w = wide ? 1800 : 1200;
  const h = 1800;
  const panels = wide
    ? [[40, 40, 1720, 1720]]
    : page % 3 === 0
      ? [
          [40, 40, 1120, 700],
          [40, 780, 540, 980],
          [620, 780, 540, 980],
        ]
      : [
          [40, 40, 540, 840],
          [620, 40, 540, 840],
          [40, 920, 1120, 840],
        ];
  const rects = panels
    .map(
      (
        [x, y, pw, ph],
        i
      ) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="hsl(${(hue + i * 35) % 360},55%,${72 - i * 8}%)" stroke="#111" stroke-width="10"/>
      <circle cx="${x + pw * 0.65}" cy="${y + ph * 0.4}" r="${Math.min(pw, ph) * 0.22}" fill="hsl(${(hue + i * 35 + 180) % 360},60%,35%)"/>
      <text x="${x + 24}" y="${y + 70}" font-family="Impact, sans-serif" font-size="56" fill="#111">${i + 1}</text>`
    )
    .join('');
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#fbfaf5"/>${rects}
  <text x="${w / 2}" y="${h - 4}" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#555">${page}</text>
</svg>`);
}

const pageName = (i: number) => `page_${String(i + 1).padStart(3, '0')}.svg`;

interface MockBook {
  id: string;
  series_id: string;
  path: string;
  title: string;
  volume: number;
  hue: number;
  lastPage: number;
  status: 'read' | 'reading' | 'unread';
}

const seriesRows = SERIES.map((s, i) => ({ ...s, id: `series-${i}` }));
const books: MockBook[] = seriesRows.flatMap((s) =>
  Array.from({ length: s.volumes }, (_, v) => {
    const status =
      v < s.read ? 'read' : v === s.read && s.read > 0 ? 'reading' : 'unread';
    return {
      id: `${s.id}-vol-${v + 1}`,
      series_id: s.id,
      path: `/mock/library/${s.title}/Vol ${v + 1}`,
      title: `${s.title} #${v + 1}`,
      volume: v + 1,
      hue: s.hue,
      status: status as MockBook['status'],
      lastPage:
        status === 'read' ? PAGES_PER_BOOK - 1 : status === 'reading' ? 9 : 0,
    };
  })
);

const toBook = (b: MockBook) => ({
  id: b.id,
  external_id: '',
  provider_id: 0,
  provider_name: 'manual',
  title: b.title,
  path: b.path,
  cover_url: coverUri(
    seriesRows.find((s) => s.id === b.series_id)!.title,
    b.hue,
    b.volume
  ),
  description:
    'A mock issue used to check the layout without the Rust backend.',
  issue_number: String(b.volume),
  format: 'cbz',
  page_count: PAGES_PER_BOOK,
  creators: [{ name: 'Mock Author', role: 'writer' }],
  characters: [],
  read: b.status === 'read',
  reading: b.status === 'reading',
  unread: b.status === 'unread',
  favorite: b.volume === 1 && b.hue === 265,
  note: null,
  lock: false,
  reading_progress: {
    last_page: b.lastPage,
    page_count: PAGES_PER_BOOK,
    percentage: Math.round((b.lastPage / (PAGES_PER_BOOK - 1)) * 100),
  },
  extra: {},
  series_id: b.series_id,
});

const toSeries = (s: (typeof seriesRows)[number]) => ({
  id: s.id,
  external_id: '',
  provider_id: 0,
  provider_name: 'manual',
  title: s.title,
  path: `/mock/library/${s.title}`,
  cover_url: coverUri(s.title, s.hue),
  bg_url: coverUri(s.title, s.hue),
  description: 'A mock series.',
  status: 'Ongoing',
  start_date: '2021-01-01',
  end_date: '',
  score: 8,
  genres: ['Sci-Fi', 'Adventure'],
  volumes: s.volumes,
  chapters: null,
  characters: [],
  staff: [],
  note: null,
  favorite: false,
  lock: false,
  book_count: s.volumes,
  read_count: s.read,
  read_progress_text: `${s.read}/${s.volumes}`,
  extra: {},
});

const stats = () => ({
  generated_at: new Date().toISOString(),
  totals: {
    books: books.length,
    series: seriesRows.length,
    read: 8,
    reading: 2,
    unread: 16,
    favorites: 1,
    rated: 0,
    average_rating: 0,
    pages: 640,
    size_bytes: 1.2e9,
  },
  reading: {
    total_secs: 86400,
    sessions: 42,
    average_session_secs: 1800,
    longest_session_secs: 7200,
    pages_read: 900,
    pages_per_hour: 38,
    active_days: 19,
    current_streak: 4,
    longest_streak: 9,
    books_finished: 8,
  },
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10),
    secs: (hash(String(i)) % 3000) + 300,
    pages: hash(String(i)) % 90,
    books: hash(String(i)) % 3,
  })),
  by_weekday: [3, 5, 2, 6, 4, 9, 8],
  by_hour: Array.from({ length: 24 }, (_, i) => (i > 17 ? i - 15 : 1)),
  finished_by_month: [],
  added_by_month: [],
  formats: [
    { key: 'cbz', count: 20 },
    { key: 'pdf', count: 6 },
  ],
  sources: [{ key: 'local', count: 26 }],
  ratings: [0, 0, 1, 2, 3, 4, 3, 2, 1, 0],
  genres: [
    { key: 'Sci-Fi', count: 18 },
    { key: 'Adventure', count: 9 },
  ],
  creators: [{ key: 'Mock Author', count: 26 }],
  time_by_format: [{ key: 'cbz', secs: 70000 }],
  top_series: seriesRows.map((s, i) => ({
    key: s.title,
    secs: 20000 - i * 3000,
  })),
  top_books: books
    .slice(0, 5)
    .map((b, i) => ({ key: b.title, secs: 9000 - i * 1200 })),
  recent: books.slice(0, 4).map((b) => ({
    title: b.title,
    source: 'local',
    started_at: new Date().toISOString(),
    duration_secs: 1500,
    pages_read: 20,
    completed: false,
  })),
  warnings: [],
});

const bookmarks: { id: string; book_id: string; page: number }[] = [];

export function installTauriMock() {
  const flavor = (sessionStorage.getItem('mockTauri') ?? 'desktop') as Flavor;
  const mobile = flavor === 'mobile';

  mockWindows('main');
  mockIPC(
    (cmd, args) => {
      const a = (args ?? {}) as Record<string, any>;
      switch (cmd) {
        case 'get_platform_capabilities':
          return {
            platform: mobile ? 'ios' : 'macos',
            mobile,
            ai: !mobile,
            downloaders: !mobile,
            pdf: !mobile,
            documents: true,
            updater: !mobile,
            local_import: mobile,
            extensions: ['cbz', 'cbr', 'pdf', 'epub'],
          };
        case 'get_base_path':
          return '/mock';
        case 'get_app_version':
          return '3.0.0-mock';
        case 'get_user_config':
          return { Page_Counter: true, Background_color: 'rgb(0,0,0)' };
        case 'get_all_books':
          return books.map(toBook);
        case 'get_all_series':
          return seriesRows.map(toSeries);
        case 'get_book_by_id':
          return toBook(books.find((b) => b.id === a.bookId) ?? books[0]);
        case 'get_books_by_path':
          return books.filter((b) => b.path === a.path).map(toBook);
        case 'get_books_by_series':
          return books.filter((b) => b.series_id === a.seriesId).map(toBook);
        case 'get_series_by_id':
          return toSeries(
            seriesRows.find((s) => s.id === a.seriesId) ?? seriesRows[0]
          );
        case 'get_bookmarks':
          return bookmarks.filter((b) => !a.bookId || b.book_id === a.bookId);
        case 'create_bookmark':
          bookmarks.push({
            id: `bm-${bookmarks.length}`,
            book_id: a.bookId,
            page: a.page,
          });
          return null;
        case 'delete_bookmark': {
          const at = bookmarks.findIndex((b) => b.id === a.bookmarkId);
          if (at >= 0) bookmarks.splice(at, 1);
          return null;
        }
        case 'toggle_favorite':
          return true;
        case 'is_directory':
        case 'check_pdfium':
        case 'check_ai_model':
          return true;
        case 'path_exists':
          return true;
        case 'list_images_in_directory':
        case 'list_extracted_images':
          return Array.from({ length: PAGES_PER_BOOK }, (_, i) => pageName(i));
        case 'detect_panels':
        case 'get_credential_definitions':
        case 'get_all_scan_paths':
        case 'jellyfin_list_servers':
        case 'jellyfin_get_resume':
        case 'jellyfin_offline_list':
        case 'sync_peers':
          return [];
        case 'get_api_credentials':
          return {};
        case 'stats_get_overview':
          return stats();
        case 'get_progress':
          return { x: 0, of: 0, file: '' };
        case 'check_for_update':
          return null;
        case 'plugin:event|listen':
          return 0;
        default:
          return null;
      }
    },
    { shouldMockEvents: true }
  );

  const internals = (window as any).__TAURI_INTERNALS__;
  internals.convertFileSrc = (path: string) => {
    const match = /^(.*)\/page_(\d+)\.svg/.exec(path);
    return match ? `${pageUri(match[1], Number(match[2]))}#` : path;
  };
  console.info(`[mockTauri] ${flavor} mock active`);
}

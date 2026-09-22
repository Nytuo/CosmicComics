import * as JellyfinAPI from '@/API/JellyfinAPI';
import type {
  JellyfinItem,
  JellyfinServerInfo,
  OfflineBook,
} from '@/API/JellyfinAPI';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { providerEnum } from '@/utils/utils.ts';

export interface JellyfinRef {
  serverId: string;
  serverName: string;
  libraryId: string;
  libraryName: string;
  itemId: string;
  kind: 'book' | 'series';
  /** The book is kept on this device for offline reading. */
  offline?: boolean;
}

export interface JellyfinLibraryInfo {
  id: string;
  name: string;
  collectionType: string;
  hidden: boolean;
}

export interface JellyfinSource {
  server: JellyfinServerInfo;
  libraries: JellyfinLibraryInfo[];
  expired: boolean;
  /** The server could not be reached: only the offline books are shown. */
  offline?: boolean;
  error?: string;
}

/** A library whose books were not all loaded on Home. */
interface BookCursor {
  serverId: string;
  ref: LibraryRef;
  next: number;
  total: number;
}

export interface JellyfinLibraryData {
  series: DisplaySeries[];
  books: DisplayBook[];
  reading: DisplayBook[];
  /** Books kept on this device, from every server. */
  offline: DisplayBook[];
  sources: JellyfinSource[];
  /** Number of books on the servers, loaded or not. */
  bookTotal: number;
  cursors: BookCursor[];
}

/**
 * Which folders of a library are series. Folders `offset + 1` levels below the
 * library are series, and so are folders down to `offset + depth` levels that
 * hold books themselves. The defaults (0, 1) make every top-level folder a
 * series.
 */
export interface SeriesLayout {
  offset: number;
  depth: number;
}

type LibraryRef = Omit<JellyfinRef, 'itemId' | 'kind' | 'offline'>;

const BOOK_COLLECTIONS = new Set(['books', 'homevideos', 'mixed', '']);
const PAGE = 500;
export const MAX_BOOKS_PER_LIBRARY = 4000;
const MAX_FOLDERS_PER_LIBRARY = 20000;
const CACHE_MS = 60_000;
const HIDDEN_KEY = 'jellyfin.hiddenLibraries';
const LAYOUT_KEY = 'jellyfin.seriesLayout';
export const DEFAULT_SERIES_LAYOUT: SeriesLayout = { offset: 0, depth: 1 };

export function jellyfinRef(item: {
  extra?: Record<string, unknown>;
}): JellyfinRef | undefined {
  return item.extra?.jellyfin as JellyfinRef | undefined;
}

const libraryKey = (serverId: string, libraryId: string) =>
  `${serverId}:${libraryId}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readHidden(): Set<string> {
  return new Set(readJson<string[]>(HIDDEN_KEY, []));
}

export function setLibraryHidden(
  serverId: string,
  libraryId: string,
  hidden: boolean
) {
  const set = readHidden();
  if (hidden) set.add(libraryKey(serverId, libraryId));
  else set.delete(libraryKey(serverId, libraryId));
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  invalidateJellyfinCache();
}

const clampLevel = (value: number, min: number) =>
  Math.min(10, Math.max(min, Math.round(Number(value) || 0)));

export function getSeriesLayout(
  serverId: string,
  libraryId: string
): SeriesLayout {
  const stored = readJson<Record<string, SeriesLayout>>(LAYOUT_KEY, {})[
    libraryKey(serverId, libraryId)
  ];
  return stored
    ? {
        offset: clampLevel(stored.offset, 0),
        depth: clampLevel(stored.depth, 1),
      }
    : DEFAULT_SERIES_LAYOUT;
}

export function setSeriesLayout(
  serverId: string,
  libraryId: string,
  layout: SeriesLayout
) {
  const all = readJson<Record<string, SeriesLayout>>(LAYOUT_KEY, {});
  all[libraryKey(serverId, libraryId)] = {
    offset: clampLevel(layout.offset, 0),
    depth: clampLevel(layout.depth, 1),
  };
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  invalidateJellyfinCache();
}

function coverOf(serverId: string, item: JellyfinItem): string {
  return item.image_tag
    ? JellyfinAPI.coverUrl(serverId, item.id, item.image_tag)
    : '';
}

export function toDisplayBook(
  ref: LibraryRef,
  item: JellyfinItem,
  offline = false
): DisplayBook {
  const reading = JellyfinAPI.hasProgress(item);
  return {
    id: `jf:${ref.serverId}:${item.id}`,
    external_id: item.id,
    provider_id: providerEnum.MANUAL,
    provider_name: 'Jellyfin',
    title: item.name,
    path: item.path ?? '',
    cover_url: offline
      ? JellyfinAPI.coverUrl(ref.serverId, item.id, item.image_tag)
      : coverOf(ref.serverId, item),
    description: item.overview,
    issue_number: item.index_number != null ? String(item.index_number) : '',
    format: item.format?.toUpperCase() ?? '',
    page_count: 0,
    creators: item.people.map((p) => ({ name: p.name, role: p.role })),
    characters: [],
    read: item.played,
    reading,
    unread: !item.played && !reading,
    favorite: item.favorite,
    note: null,
    lock: false,
    reading_progress: {
      last_page: item.resume_page,
      page_count: 0,
      percentage: 0,
    },
    extra: { jellyfin: { ...ref, itemId: item.id, kind: 'book', offline } },
    series_id: null,
  };
}

function toDisplaySeries(
  ref: LibraryRef,
  item: JellyfinItem,
  cover: string,
  books: JellyfinItem[],
  complete: boolean
): DisplaySeries {
  const bookCount = complete
    ? books.length
    : Math.max(books.length, item.child_count ?? 0);
  const readCount = books.filter((b) => b.played).length;
  return {
    id: `jf:${ref.serverId}:${item.id}`,
    external_id: item.id,
    provider_id: providerEnum.MANUAL,
    provider_name: 'Jellyfin',
    title: item.name,
    path: item.path ?? '',
    cover_url: cover,
    bg_url: '',
    description: item.overview,
    status: '',
    start_date: item.year ? String(item.year) : '',
    end_date: '',
    score: 0,
    genres: item.genres,
    volumes: bookCount || item.child_count,
    chapters: null,
    characters: [],
    staff: item.people.map((p) => ({ name: p.name, role: p.role })),
    note: null,
    favorite: item.favorite,
    lock: false,
    book_count: bookCount,
    read_count: readCount,
    read_progress_text: bookCount ? `${readCount}/${bookCount}` : '',
    extra: { jellyfin: { ...ref, itemId: item.id, kind: 'series' } },
  };
}

/**
 * Picks the series folders of a library (see {@link SeriesLayout}) and the
 * books of each. A book belongs to its closest series folder.
 */
export function detectSeries(
  folders: JellyfinItem[],
  books: JellyfinItem[],
  layout: SeriesLayout
): { folder: JellyfinItem; books: JellyfinItem[] }[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const levels = new Map<string, number>();
  const levelOf = (id: string): number => {
    const known = levels.get(id);
    if (known !== undefined) return known;
    const chain: string[] = [];
    let current: string | null | undefined = id;
    while (current && byId.has(current) && !levels.has(current)) {
      if (chain.includes(current)) break;
      chain.push(current);
      current = byId.get(current)!.parent_id;
    }
    let level = current && levels.has(current) ? levels.get(current)! : 0;
    for (const folderId of chain.reverse()) levels.set(folderId, ++level);
    return levels.get(id) ?? 1;
  };

  const holdsBooks = new Set(
    books.map((b) => b.parent_id).filter((id): id is string => !!id)
  );
  const first = layout.offset + 1;
  const last = layout.offset + layout.depth;
  const isSeries = (folder: JellyfinItem) => {
    const level = levelOf(folder.id);
    return (
      level === last ||
      (level >= first && level < last && holdsBooks.has(folder.id))
    );
  };

  const series = new Map<
    string,
    { folder: JellyfinItem; books: JellyfinItem[] }
  >();
  for (const folder of folders) {
    if (isSeries(folder)) series.set(folder.id, { folder, books: [] });
  }
  for (const book of books) {
    let parent = book.parent_id;
    const seen = new Set<string>();
    while (parent && byId.has(parent) && !seen.has(parent)) {
      seen.add(parent);
      const found = series.get(parent);
      if (found) {
        found.books.push(book);
        break;
      }
      parent = byId.get(parent)!.parent_id;
    }
  }
  return [...series.values()];
}

async function allPages(
  serverId: string,
  query: JellyfinAPI.JellyfinItemsQuery,
  cap: number,
  start = 0
): Promise<{ items: JellyfinItem[]; total: number }> {
  const items: JellyfinItem[] = [];
  let total = 0;
  for (;;) {
    const page = await JellyfinAPI.getItems(serverId, {
      ...query,
      start_index: start + items.length,
      limit: Math.min(PAGE, cap - items.length),
    });
    items.push(...page.items);
    total = page.total;
    if (
      page.items.length === 0 ||
      start + items.length >= page.total ||
      items.length >= cap
    ) {
      return { items, total };
    }
  }
}

const booksQuery = (libraryId: string): JellyfinAPI.JellyfinItemsQuery => ({
  parent_id: libraryId,
  recursive: true,
  include_types: ['Book'],
  sort_by: 'SortName',
});

function seriesCover(
  serverId: string,
  folder: JellyfinItem,
  books: JellyfinItem[]
): string {
  if (folder.image_tag) {
    return JellyfinAPI.coverUrl(serverId, folder.id, folder.image_tag);
  }
  const covered = books.find((b) => b.image_tag);
  return covered
    ? JellyfinAPI.coverUrl(serverId, covered.id, covered.image_tag)
    : JellyfinAPI.coverUrl(serverId, folder.id, null, 400, true);
}

function offlineRef(server: JellyfinServerInfo, book: OfflineBook): LibraryRef {
  return {
    serverId: server.id,
    serverName: server.name,
    libraryId: book.context.library_id,
    libraryName: book.context.library_name,
  };
}

/** Home content of a server that cannot be reached: its offline books. */
function loadOffline(
  server: JellyfinServerInfo,
  kept: OfflineBook[],
  out: JellyfinLibraryData
): JellyfinLibraryInfo[] {
  const libraries = new Map<string, JellyfinLibraryInfo>();
  const series = new Map<
    string,
    { ref: LibraryRef; name: string; books: JellyfinItem[] }
  >();
  for (const book of kept) {
    const ref = offlineRef(server, book);
    out.books.push(toDisplayBook(ref, book.item, true));
    if (JellyfinAPI.hasProgress(book.item)) {
      out.reading.push(toDisplayBook(ref, book.item, true));
    }
    if (book.context.library_id) {
      libraries.set(book.context.library_id, {
        id: book.context.library_id,
        name: book.context.library_name,
        collectionType: 'books',
        hidden: false,
      });
    }
    const seriesId = book.context.series_id;
    if (seriesId) {
      const entry = series.get(seriesId) ?? {
        ref,
        name: book.context.series_name ?? '',
        books: [],
      };
      entry.books.push(book.item);
      series.set(seriesId, entry);
    }
  }
  for (const [id, entry] of series) {
    const folder: JellyfinItem = {
      ...entry.books[0],
      id,
      name: entry.name,
      kind: 'Folder',
      is_folder: true,
      is_book: false,
      image_tag: null,
      overview: '',
      favorite: false,
      people: [],
      genres: [],
      child_count: entry.books.length,
    };
    out.series.push(
      toDisplaySeries(
        entry.ref,
        folder,
        JellyfinAPI.coverUrl(server.id, id, null, 400, true),
        entry.books,
        true
      )
    );
  }
  out.bookTotal += kept.length;
  return [...libraries.values()];
}

async function loadServer(
  server: JellyfinServerInfo,
  hidden: Set<string>,
  kept: OfflineBook[],
  out: JellyfinLibraryData
): Promise<JellyfinSource> {
  const source: JellyfinSource = { server, libraries: [], expired: false };
  const keptIds = new Set(kept.map((b) => b.item.id));
  try {
    const views = await JellyfinAPI.getViews(server.id);
    await JellyfinAPI.flushOffline(server.id).catch(() => 0);
    source.libraries = views
      .filter((v) =>
        BOOK_COLLECTIONS.has((v.collection_type ?? '').toLowerCase())
      )
      .map((v) => ({
        id: v.id,
        name: v.name,
        collectionType: v.collection_type ?? '',
        hidden: hidden.has(libraryKey(server.id, v.id)),
      }));

    const libraryOfBook = new Map<string, JellyfinLibraryInfo>();
    await Promise.all(
      source.libraries
        .filter((library) => !library.hidden)
        .map(async (library) => {
          const ref: LibraryRef = {
            serverId: server.id,
            serverName: server.name,
            libraryId: library.id,
            libraryName: library.name,
          };
          const [folders, books] = await Promise.all([
            allPages(
              server.id,
              {
                parent_id: library.id,
                recursive: true,
                include_types: ['Folder', 'BoxSet'],
                sort_by: 'SortName',
              },
              MAX_FOLDERS_PER_LIBRARY
            ),
            allPages(server.id, booksQuery(library.id), MAX_BOOKS_PER_LIBRARY),
          ]);
          const complete = books.items.length >= books.total;
          out.bookTotal += books.total;
          if (!complete) {
            out.cursors.push({
              serverId: server.id,
              ref,
              next: books.items.length,
              total: books.total,
            });
          }
          const layout = getSeriesLayout(server.id, library.id);
          for (const { folder, books: own } of detectSeries(
            folders.items,
            books.items,
            layout
          )) {
            out.series.push(
              toDisplaySeries(
                ref,
                folder,
                seriesCover(server.id, folder, own),
                own,
                complete
              )
            );
          }
          for (const book of books.items) {
            libraryOfBook.set(book.id, library);
            out.books.push(toDisplayBook(ref, book, keptIds.has(book.id)));
          }
        })
    );

    const resumed = await JellyfinAPI.getResume(server.id, 30).catch(
      () => [] as JellyfinItem[]
    );
    for (const item of resumed) {
      const library = libraryOfBook.get(item.id);
      if (!library) continue;
      out.reading.push(
        toDisplayBook(
          {
            serverId: server.id,
            serverName: server.name,
            libraryId: library.id,
            libraryName: library.name,
          },
          item,
          keptIds.has(item.id)
        )
      );
    }
  } catch (e) {
    if (JellyfinAPI.isUnauthorized(e)) source.expired = true;
    else if (JellyfinAPI.isOfflineError(e) && kept.length > 0) {
      source.offline = true;
      source.libraries = loadOffline(server, kept, out);
    } else source.error = String(e);
  }
  return source;
}

let cache: { at: number; data: JellyfinLibraryData } | null = null;
let inflight: Promise<JellyfinLibraryData> | null = null;

export function invalidateJellyfinCache() {
  cache = null;
}

export function loadJellyfinLibrary(
  force = false
): Promise<JellyfinLibraryData> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return Promise.resolve(cache.data);
  }
  inflight ??= (async () => {
    const out: JellyfinLibraryData = {
      series: [],
      books: [],
      reading: [],
      offline: [],
      sources: [],
      bookTotal: 0,
      cursors: [],
    };
    try {
      const [servers, kept] = await Promise.all([
        JellyfinAPI.listServers(),
        JellyfinAPI.listOffline().catch(() => [] as OfflineBook[]),
      ]);
      const hidden = readHidden();
      out.sources = await Promise.all(
        servers.map((server) =>
          loadServer(
            server,
            hidden,
            kept.filter((b) => b.server_id === server.id),
            out
          )
        )
      );
      const loaded = new Map(out.books.map((b) => [b.id, b]));
      for (const book of kept) {
        const server = servers.find((s) => s.id === book.server_id);
        if (!server) continue;
        out.offline.push(
          loaded.get(`jf:${server.id}:${book.item.id}`) ??
            toDisplayBook(offlineRef(server, book), book.item, true)
        );
      }
      cache = { at: Date.now(), data: out };
      return out;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Loads the next {@link MAX_BOOKS_PER_LIBRARY} books of every library that
 * Home could not show in full.
 */
export async function loadMoreJellyfinBooks(
  data: JellyfinLibraryData
): Promise<JellyfinLibraryData> {
  const kept = new Set(
    data.offline
      .map((b) => jellyfinRef(b))
      .filter((r): r is JellyfinRef => !!r)
      .map((r) => `${r.serverId}:${r.itemId}`)
  );
  const books = [...data.books];
  const cursors: BookCursor[] = [];
  await Promise.all(
    data.cursors.map(async (cursor) => {
      const page = await allPages(
        cursor.serverId,
        booksQuery(cursor.ref.libraryId),
        MAX_BOOKS_PER_LIBRARY,
        cursor.next
      );
      books.push(
        ...page.items.map((item) =>
          toDisplayBook(
            cursor.ref,
            item,
            kept.has(`${cursor.serverId}:${item.id}`)
          )
        )
      );
      const next = cursor.next + page.items.length;
      if (page.items.length > 0 && next < page.total) {
        cursors.push({ ...cursor, next, total: page.total });
      }
    })
  );
  const next = { ...data, books, cursors };
  cache = { at: Date.now(), data: next };
  return next;
}

export interface JellyfinNav {
  serverId: string;
  trail: { id: string; name: string }[];
  bookId?: string;
}

export function navFor(ref: JellyfinRef, title: string): JellyfinNav {
  const library = { id: ref.libraryId, name: ref.libraryName };
  return ref.kind === 'series'
    ? {
        serverId: ref.serverId,
        trail: [library, { id: ref.itemId, name: title }],
      }
    : { serverId: ref.serverId, trail: [library], bookId: ref.itemId };
}

export async function listLibraries(
  serverId: string
): Promise<JellyfinLibraryInfo[]> {
  const hidden = readHidden();
  return (await JellyfinAPI.getViews(serverId))
    .filter((v) =>
      BOOK_COLLECTIONS.has((v.collection_type ?? '').toLowerCase())
    )
    .map((v) => ({
      id: v.id,
      name: v.name,
      collectionType: v.collection_type ?? '',
      hidden: hidden.has(libraryKey(serverId, v.id)),
    }));
}

import * as JellyfinAPI from '@/API/JellyfinAPI';
import type { JellyfinItem, JellyfinServerInfo } from '@/API/JellyfinAPI';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { providerEnum } from '@/utils/utils.ts';

export interface JellyfinRef {
  serverId: string;
  serverName: string;
  libraryId: string;
  libraryName: string;
  itemId: string;
  kind: 'book' | 'series';
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
  error?: string;
}

export interface JellyfinLibraryData {
  series: DisplaySeries[];
  books: DisplayBook[];
  reading: DisplayBook[];
  sources: JellyfinSource[];
}

const BOOK_COLLECTIONS = new Set(['books', 'homevideos', 'mixed', '']);
const PAGE = 500;
const MAX_BOOKS_PER_LIBRARY = 4000;
const CACHE_MS = 60_000;
const HIDDEN_KEY = 'jellyfin.hiddenLibraries';

export function jellyfinRef(item: {
  extra?: Record<string, unknown>;
}): JellyfinRef | undefined {
  return item.extra?.jellyfin as JellyfinRef | undefined;
}

const hiddenKey = (serverId: string, libraryId: string) =>
  `${serverId}:${libraryId}`;

function readHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function setLibraryHidden(
  serverId: string,
  libraryId: string,
  hidden: boolean
) {
  const set = readHidden();
  if (hidden) set.add(hiddenKey(serverId, libraryId));
  else set.delete(hiddenKey(serverId, libraryId));
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
  invalidateJellyfinCache();
}

function coverOf(serverId: string, item: JellyfinItem): string {
  return item.image_tag
    ? JellyfinAPI.coverUrl(serverId, item.id, item.image_tag)
    : '';
}

export function toDisplayBook(
  ref: Omit<JellyfinRef, 'itemId' | 'kind'>,
  item: JellyfinItem
): DisplayBook {
  const reading = JellyfinAPI.hasProgress(item);
  return {
    id: `jf:${ref.serverId}:${item.id}`,
    external_id: item.id,
    provider_id: providerEnum.MANUAL,
    provider_name: 'Jellyfin',
    title: item.name,
    path: item.path ?? '',
    cover_url: coverOf(ref.serverId, item),
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
    extra: { jellyfin: { ...ref, itemId: item.id, kind: 'book' } },
    series_id: null,
  };
}

function toDisplaySeries(
  ref: Omit<JellyfinRef, 'itemId' | 'kind'>,
  item: JellyfinItem
): DisplaySeries {
  return {
    id: `jf:${ref.serverId}:${item.id}`,
    external_id: item.id,
    provider_id: providerEnum.MANUAL,
    provider_name: 'Jellyfin',
    title: item.name,
    path: item.path ?? '',
    cover_url: coverOf(ref.serverId, item),
    bg_url: '',
    description: item.overview,
    status: '',
    start_date: item.year ? String(item.year) : '',
    end_date: '',
    score: 0,
    genres: item.genres,
    volumes: item.child_count,
    chapters: null,
    characters: [],
    staff: item.people.map((p) => ({ name: p.name, role: p.role })),
    note: null,
    favorite: item.favorite,
    lock: false,
    book_count: item.child_count ?? 0,
    read_count: 0,
    read_progress_text: '',
    extra: { jellyfin: { ...ref, itemId: item.id, kind: 'series' } },
  };
}

async function allPages(
  serverId: string,
  query: JellyfinAPI.JellyfinItemsQuery,
  cap: number
): Promise<JellyfinItem[]> {
  const items: JellyfinItem[] = [];
  for (;;) {
    const page = await JellyfinAPI.getItems(serverId, {
      ...query,
      start_index: items.length,
      limit: PAGE,
    });
    items.push(...page.items);
    if (
      page.items.length === 0 ||
      items.length >= page.total ||
      items.length >= cap
    ) {
      return items;
    }
  }
}

async function loadServer(
  server: JellyfinServerInfo,
  hidden: Set<string>,
  out: JellyfinLibraryData
): Promise<JellyfinSource> {
  const source: JellyfinSource = { server, libraries: [], expired: false };
  try {
    const views = await JellyfinAPI.getViews(server.id);
    source.libraries = views
      .filter((v) =>
        BOOK_COLLECTIONS.has((v.collection_type ?? '').toLowerCase())
      )
      .map((v) => ({
        id: v.id,
        name: v.name,
        collectionType: v.collection_type ?? '',
        hidden: hidden.has(hiddenKey(server.id, v.id)),
      }));

    const libraryOfBook = new Map<string, JellyfinLibraryInfo>();
    await Promise.all(
      source.libraries
        .filter((library) => !library.hidden)
        .map(async (library) => {
          const ref = {
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
                include_types: ['Folder', 'BoxSet'],
                sort_by: 'SortName',
              },
              PAGE
            ),
            allPages(
              server.id,
              {
                parent_id: library.id,
                recursive: true,
                include_types: ['Book'],
                sort_by: 'SortName',
              },
              MAX_BOOKS_PER_LIBRARY
            ),
          ]);
          out.series.push(...folders.map((f) => toDisplaySeries(ref, f)));
          for (const book of books) {
            libraryOfBook.set(book.id, library);
            out.books.push(toDisplayBook(ref, book));
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
          item
        )
      );
    }
  } catch (e) {
    if (JellyfinAPI.isUnauthorized(e)) source.expired = true;
    else source.error = String(e);
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
      sources: [],
    };
    try {
      const servers = await JellyfinAPI.listServers();
      const hidden = readHidden();
      out.sources = await Promise.all(
        servers.map((server) => loadServer(server, hidden, out))
      );
      cache = { at: Date.now(), data: out };
      return out;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
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
      hidden: hidden.has(hiddenKey(serverId, v.id)),
    }));
}

import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface JellyfinServerInfo {
  id: string;
  name: string;
  url: string;
  user_id: string;
  user_name: string;
  version: string;
  allow_insecure: boolean;
}

export interface JellyfinPublicInfo {
  url: string;
  id: string;
  name: string;
  version: string;
  quick_connect: boolean;
}

export interface JellyfinPerson {
  name: string;
  role: string;
}

export interface JellyfinItem {
  id: string;
  name: string;
  kind: string;
  is_folder: boolean;
  is_book: boolean;
  parent_id: string | null;
  series_name: string | null;
  overview: string;
  year: number | null;
  index_number: number | null;
  child_count: number | null;
  format: string | null;
  size: number | null;
  path: string | null;
  image_tag: string | null;
  aspect_ratio: number | null;
  played: boolean;
  favorite: boolean;
  resume_page: number;
  resume_fraction: number;
  play_count: number;
  played_percentage: number | null;
  last_played: string | null;
  rating: number | null;
  genres: string[];
  people: JellyfinPerson[];
  date_created: string | null;
  collection_type: string | null;
  etag: string | null;
}

export interface JellyfinItemsPage {
  items: JellyfinItem[];
  total: number;
  start_index: number;
}

export interface JellyfinItemsQuery {
  parent_id?: string;
  search_term?: string;
  sort_by?: string;
  sort_order?: 'Ascending' | 'Descending';
  filters?: string[];
  recursive?: boolean;
  include_types?: string[];
  start_index?: number;
  limit?: number;
}

export interface JellyfinPreparedBook {
  path: string;
  format: string;
  resume_page: number;
  resume_fraction: number;
  title: string;
  from_cache: boolean;
}

export interface JellyfinSession {
  serverId: string;
  itemId: string;
  title: string;
  seriesName?: string | null;
  format?: string | null;
  path: string;
}

export const READABLE_FORMATS = new Set([
  'cbz',
  'cbr',
  'cb7',
  'cbt',
  'zip',
  'rar',
  '7z',
  'tar',
  'pdf',
  'epub',
]);

export const isReadable = (item: { format: string | null }) =>
  !item.format || READABLE_FORMATS.has(item.format.toLowerCase());

export const hasProgress = (item: JellyfinItem) =>
  !item.played &&
  (item.format?.toLowerCase() === 'epub'
    ? item.resume_fraction > 0
    : item.resume_page > 0);

export const JELLYFIN_SESSION_KEY = 'jellyfinSession';
export const JELLYFIN_UNAUTHORIZED = 'unauthorized';

export const isUnauthorized = (error: unknown): boolean =>
  String(error) === JELLYFIN_UNAUTHORIZED;

export const discoverServer = (
  url: string,
  allowInsecure = false
): Promise<JellyfinPublicInfo> =>
  invoke('jellyfin_discover_server', { url, allowInsecure });

export const login = (
  url: string,
  username: string,
  password: string,
  allowInsecure = false
): Promise<JellyfinServerInfo> =>
  invoke('jellyfin_login', { url, username, password, allowInsecure });

export const quickConnectStart = (
  url: string,
  allowInsecure = false
): Promise<{ secret: string; code: string }> =>
  invoke('jellyfin_quick_connect_start', { url, allowInsecure });

export const quickConnectPoll = (
  url: string,
  secret: string,
  allowInsecure = false
): Promise<JellyfinServerInfo | null> =>
  invoke('jellyfin_quick_connect_poll', { url, secret, allowInsecure });

export const listServers = (): Promise<JellyfinServerInfo[]> =>
  invoke('jellyfin_list_servers', {});

export const removeServer = (serverId: string): Promise<void> =>
  invoke('jellyfin_remove_server', { serverId });

export const getViews = (serverId: string): Promise<JellyfinItem[]> =>
  invoke('jellyfin_get_views', { serverId });

export const getItems = (
  serverId: string,
  query: JellyfinItemsQuery
): Promise<JellyfinItemsPage> =>
  invoke('jellyfin_get_items', { serverId, query });

export const getItem = (
  serverId: string,
  itemId: string
): Promise<JellyfinItem> => invoke('jellyfin_get_item', { serverId, itemId });

export const getResume = (
  serverId: string,
  limit = 20
): Promise<JellyfinItem[]> =>
  invoke('jellyfin_get_resume', { serverId, limit });

export const setPlayed = (
  serverId: string,
  itemId: string,
  played: boolean
): Promise<void> => invoke('jellyfin_set_played', { serverId, itemId, played });

export const setFavorite = (
  serverId: string,
  itemId: string,
  favorite: boolean
): Promise<void> =>
  invoke('jellyfin_set_favorite', { serverId, itemId, favorite });

export const reportProgress = (
  serverId: string,
  itemId: string,
  page: number,
  pageCount: number
): Promise<void> =>
  invoke('jellyfin_report_progress', { serverId, itemId, page, pageCount });

export const reportFraction = (
  serverId: string,
  itemId: string,
  fraction: number
): Promise<void> =>
  invoke('jellyfin_report_fraction', { serverId, itemId, fraction });

export const prepareBook = (
  serverId: string,
  itemId: string
): Promise<JellyfinPreparedBook> =>
  invoke('jellyfin_prepare_book', { serverId, itemId });

export const clearCache = (serverId?: string): Promise<void> =>
  invoke('jellyfin_clear_cache', { serverId });

export interface DownloadProgress {
  item_id: string;
  written: number;
  total: number | null;
}

export const onDownloadProgress = (
  handler: (progress: DownloadProgress) => void
): Promise<() => void> =>
  listen<DownloadProgress>('jellyfin-download-progress', (event) =>
    handler(event.payload)
  );

export function coverUrl(
  serverId: string,
  itemId: string,
  tag: string | null | undefined,
  width = 400
): string {
  const params = new URLSearchParams({ w: String(width) });
  if (tag) params.set('tag', tag);
  const origin = convertFileSrc('_', 'jfimg').slice(0, -1);
  return `${origin}${encodeURIComponent(serverId)}/${encodeURIComponent(itemId)}?${params}`;
}

export function openInViewer(
  book: JellyfinPreparedBook,
  session: Omit<JellyfinSession, 'path'>
): void {
  localStorage.setItem('currentBook', book.path);
  if (book.resume_page > 0) {
    localStorage.setItem('currentPage', String(book.resume_page));
  } else {
    localStorage.removeItem('currentPage');
  }
  if (book.resume_fraction > 0) {
    localStorage.setItem('currentFraction', String(book.resume_fraction));
  } else {
    localStorage.removeItem('currentFraction');
  }
  localStorage.setItem(
    JELLYFIN_SESSION_KEY,
    JSON.stringify({ ...session, path: book.path })
  );
  localStorage.setItem('collectionnerView', 'jellyfin');
  window.location.href = '/viewer';
}

export function readJellyfinSession(): JellyfinSession | null {
  try {
    const raw = localStorage.getItem(JELLYFIN_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as JellyfinSession;
    return session.path === localStorage.getItem('currentBook')
      ? session
      : null;
  } catch {
    return null;
  }
}

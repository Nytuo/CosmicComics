import { invoke } from '@tauri-apps/api/core';
import type {
  DisplayBook,
  DisplaySeries,
  FieldSchema,
} from '@/interfaces/IDisplayBook';

export const getAllBooks = async (): Promise<DisplayBook[]> => {
  return await invoke('get_all_books', {});
};

export const getBookById = async (bookId: string): Promise<DisplayBook> => {
  return await invoke('get_book_by_id', { bookId });
};
export const getBooksByPath = async (path: string): Promise<DisplayBook[]> => {
  return await invoke('get_books_by_path', { path });
};

export const getBooksBySeries = async (
  seriesId: string
): Promise<DisplayBook[]> => {
  return await invoke('get_books_by_series', { seriesId });
};

export const deleteBook = async (bookId: string): Promise<void> => {
  return await invoke('delete_book', { bookId });
};

export const getAllSeries = async (): Promise<DisplaySeries[]> => {
  return await invoke('get_all_series', {});
};

export const getSeriesById = async (
  seriesId: string
): Promise<DisplaySeries> => {
  return await invoke('get_series_by_id', { seriesId });
};

export const deleteSeries = async (seriesId: string): Promise<void> => {
  return await invoke('delete_series', { seriesId });
};

export const updateBookStatusAll = async (
  setTo: string,
  title: string
): Promise<void> => {
  return await invoke('update_book_status_all', {
    payload: { set_to: setTo, title },
  });
};

export const updateBookStatusOne = async (
  setTo: string,
  bookId: string
): Promise<void> => {
  return await invoke('update_book_status_one', { setTo, bookId });
};

export const toggleFavorite = async (
  itemType: string,
  id: string
): Promise<boolean> => {
  return await invoke('toggle_favorite', { itemType, id });
};

export const updateRating = async (
  itemType: string,
  id: string,
  rating: number
): Promise<void> => {
  return await invoke('update_rating', { itemType, id, rating });
};

export const updateFields = async (
  itemType: string,
  id: string,
  fields: Record<string, unknown>
): Promise<void> => {
  return await invoke('update_fields', {
    payload: { item_type: itemType, id, fields },
  });
};

export const createManualBook = async (
  fields: Record<string, unknown>
): Promise<DisplayBook> => {
  return await invoke('create_manual_book', { fields });
};

export const createManualSeries = async (
  fields: Record<string, unknown>
): Promise<DisplaySeries> => {
  return await invoke('create_manual_series', { fields });
};

/**
 * Insert a new book via a provider: creates the record and fetches metadata in one step.
 */
export const insertNewBookByProvider = async (
  externalId: string,
  providerId: number
): Promise<DisplayBook> => {
  return await invoke('insert_new_book_by_provider', {
    externalId,
    providerId,
  });
};

/**
 * Rematch an item to a different provider and external ID.
 *
 * This updates the item's external_id and provider_id, then refreshes
 * its metadata from the new provider.
 *
 * @param oldId - The SurrealDB ID of the existing item
 * @param newExternalId - The new external ID from the target provider
 * @param providerId - The new provider ID
 * @param itemType - "book" or "series"
 */
export const rematchItem = async (
  oldId: string,
  newExternalId: string,
  providerId: number,
  itemType: string
): Promise<void> => {
  await updateFields(itemType, oldId, {
    external_id: newExternalId,
    provider_id: providerId,
  });

  await refreshMetadataByProvider(oldId, providerId, itemType);
};

export const getFieldSchema = async (
  providerId: number,
  itemType: string
): Promise<FieldSchema> => {
  return await invoke('get_field_schema', { providerId, itemType });
};

export const updateReadingProgress = async (
  bookId: string,
  pageNumber: number
): Promise<void> => {
  return await invoke('update_reading_progress', { bookId, pageNumber });
};

export const fillBlankImages = async (): Promise<void> => {
  return await invoke('fill_blank_images', {});
};

export const refreshMetadata = async (bookId: string): Promise<void> => {
  return await invoke('refresh_metadata', { bookId });
};
export const getFilesAndFoldersList = async (
  path: string
): Promise<
  Array<{
    name: string;
    path: string;
    is_dir: boolean;
  }>
> => {
  return await invoke('get_files_and_folders_list', { path });
};

export const isDirectory = async (path: string): Promise<boolean> => {
  return await invoke('is_directory', { path });
};

export const pathExists = async (path: string): Promise<boolean> => {
  return await invoke('path_exists', { path });
};

export const readTextFile = async (path: string): Promise<string> => {
  return await invoke('read_text_file', { path });
};

export const getAppVersion = async (): Promise<string> => {
  return await invoke('get_app_version');
};

export const getBasePath = async (): Promise<string> => {
  return await invoke('get_base_path');
};

export const getUserConfig = async (): Promise<Record<string, unknown>> => {
  return await invoke('get_user_config', {});
};

export const writeUserConfig = async (
  config: Record<string, unknown>
): Promise<void> => {
  return await invoke('write_user_config', { config });
};

export interface CredentialDefinition {
  key: string;
  label: string;
  description: string;
  is_secret: boolean;
  provider: string;
}

export const getCredentialDefinitions = async (): Promise<
  CredentialDefinition[]
> => {
  return await invoke('get_credential_definitions');
};

export const getApiCredentials = async (): Promise<Record<string, string>> => {
  return await invoke('get_api_credentials');
};

export const saveApiCredentials = async (
  credentials: Record<string, string>
): Promise<void> => {
  return await invoke('save_api_credentials', { credentials });
};

export const getProgress = async (
  key: string
): Promise<{
  status: string;
  percentage: string;
  current_file: string;
} | null> => {
  return await invoke('get_progress', { key });
};

export const ping = async (): Promise<string> => {
  return await invoke('ping');
};

export const marvelSearchOnly = async (
  name: string,
  date?: string
): Promise<unknown> => {
  return await invoke('marvel_search_only', { name, date });
};

export const marvelGetComics = async (
  name: string,
  date: string
): Promise<unknown> => {
  return await invoke('marvel_get_comics', { name, date });
};

export const anilistSearchOnly = async (name: string): Promise<unknown> => {
  return await invoke('anilist_search_only', { name });
};

export const googlebooksGetComics = async (name: string): Promise<unknown> => {
  return await invoke('googlebooks_get_comics', { name });
};

export const openlibraryGetComics = async (name: string): Promise<unknown> => {
  return await invoke('openlibrary_get_comics', { name });
};

export const metronSearchSeries = async (name: string): Promise<unknown> => {
  return await invoke('metron_search_series', { name });
};

export const metronGetComics = async (
  name: string,
  year?: string
): Promise<unknown> => {
  return await invoke('metron_get_comics', { name, year });
};

export const metronLinkPlaceholderToPath = async (
  seriesMetronId: number,
  issueNumber: string,
  filePath: string
): Promise<DisplayBook | null> => {
  return await invoke('metron_link_placeholder_to_path', {
    seriesMetronId,
    issueNumber,
    filePath,
  });
};

export const openMarvelUnlimitedAuth = async (): Promise<void> => {
  return await invoke('open_marvel_unlimited_auth');
};

export const getMarvelUnlimitedCookies = async (
  windowLabel: string
): Promise<Record<string, string>> => {
  return await invoke('get_marvel_unlimited_cookies', { windowLabel });
};

export const closeMarvelUnlimitedAuth = async (
  windowLabel: string
): Promise<void> => {
  return await invoke('close_marvel_unlimited_auth', { windowLabel });
};

export const loadSavedMarvelUnlimitedCookies = async (): Promise<
  Record<string, string>
> => {
  return await invoke('load_saved_marvel_unlimited_cookies');
};

export const clearSavedMarvelUnlimitedCookies = async (): Promise<void> => {
  return await invoke('clear_saved_marvel_unlimited_cookies');
};

export const hasSavedMarvelUnlimitedCookies = async (): Promise<boolean> => {
  return await invoke('has_saved_marvel_unlimited_cookies');
};

export const searchMarvelUnlimitedComics = async (
  query: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('search_marvel_unlimited_comics', { query, cookies });
};

export const searchMarvelUnlimitedSeries = async (
  query: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('search_marvel_unlimited_series', { query, cookies });
};

export const getMarvelSeriesComics = async (
  seriesId: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_marvel_series_comics', { seriesId, cookies });
};

export const getMarvelComicDetails = async (
  comicId: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_marvel_comic_details', { comicId, cookies });
};

export const saveMarvelImages = async (
  comicId: string,
  comicTitle: string,
  imageUrls: string[],
  savePath?: string
): Promise<void> => {
  return await invoke('save_marvel_images', {
    comicId,
    comicTitle,
    imageUrls,
    savePath,
  });
};

export const downloadMarvelUnlimitedComic = async (request: {
  comicId: string;
  comicTitle: string;
  cookies: Record<string, string>;
  savePath?: string;
}): Promise<void> => {
  return await invoke('download_marvel_unlimited_comic', { request });
};

export const getMarvelUnlimitedNewComics = async (
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_marvel_unlimited_new_comics', { cookies });
};

export const saveNewComicsCache = async (comics: unknown[]): Promise<void> => {
  return await invoke('save_new_comics_cache', { comics });
};

export const loadNewComicsCache = async (
  maxAgeSecs: number = 86400
): Promise<unknown[] | null> => {
  return await invoke('load_new_comics_cache', { maxAgeSecs });
};

export const insertMarvelUnlimitedBookToDB = async (
  comic: unknown,
  savedPath: string
): Promise<void> => {
  return await invoke('insert_marvel_unlimited_book_to_db', {
    comic,
    savedPath,
  });
};
export const mangadexAuthenticate = async (
  username: string,
  password: string,
  clientId: string,
  clientSecret: string
): Promise<unknown> => {
  return await invoke('mangadex_authenticate', {
    username,
    password,
    clientId,
    clientSecret,
  });
};

export const loadSavedMangadexTokens = async (): Promise<unknown> => {
  return await invoke('load_saved_mangadex_tokens');
};

export const clearSavedMangadexTokens = async (): Promise<void> => {
  return await invoke('clear_saved_mangadex_tokens');
};

export const hasSavedMangadexTokens = async (): Promise<boolean> => {
  return await invoke('has_saved_mangadex_tokens');
};

export const searchMangadexManga = async (query: string): Promise<unknown> => {
  return await invoke('search_mangadex_manga', { query });
};

export const getMangadexMangaDetails = async (
  mangaId: string
): Promise<unknown> => {
  return await invoke('get_mangadex_manga_details', { mangaId });
};

export const getMangadexChapters = async (
  mangaId: string,
  language?: string
): Promise<unknown> => {
  return await invoke('get_mangadex_chapters', { mangaId, language });
};

export const downloadMangadexChapter = async (request: {
  chapterId: string;
  chapterTitle: string;
  mangaId: string;
  mangaTitle: string;
  savePath?: string;
  dataQuality?: string;
}): Promise<string> => {
  return await invoke('download_mangadex_chapter', { request });
};

export const getMangadexRecentlyUpdated = async (): Promise<unknown> => {
  return await invoke('get_mangadex_recently_updated');
};

export const insertMangadexBookToDB = async (
  manga: unknown,
  chapter: unknown,
  savedPath: string
): Promise<void> => {
  return await invoke('insert_mangadex_book_to_db', {
    manga,
    chapter,
    savedPath,
  });
};

export const searchGetcomics = async (query: string): Promise<unknown> => {
  return await invoke('search_getcomics', { query });
};

export const getGetcomicsLatest = async (): Promise<unknown> => {
  return await invoke('get_getcomics_latest');
};

export const getGetcomicsDetail = async (postUrl: string): Promise<unknown> => {
  return await invoke('get_getcomics_detail', { postUrl });
};

export const downloadGetcomics = async (request: {
  postId: string;
  postTitle: string;
  downloadUrl: string;
  savePath?: string;
}): Promise<string> => {
  return await invoke('download_getcomics', { request });
};

export const saveGetcomicsLatestCache = async (
  posts: unknown[]
): Promise<void> => {
  return await invoke('save_getcomics_latest_cache', { posts });
};

export const loadGetcomicsLatestCache = async (
  maxAgeSecs: number = 86400
): Promise<unknown[] | null> => {
  return await invoke('load_getcomics_latest_cache', { maxAgeSecs });
};

export const insertGetcomicsBookToDB = async (
  post: unknown,
  detail: unknown | null,
  savedPath: string
): Promise<void> => {
  return await invoke('insert_getcomics_book_to_db', {
    post,
    detail,
    savedPath,
  });
};

export const openDCInfiniteAuth = async (): Promise<void> => {
  return await invoke('open_dc_infinite_auth');
};

export const getDCInfiniteCookies = async (
  windowLabel: string
): Promise<Record<string, string>> => {
  return await invoke('get_dc_infinite_cookies', { windowLabel });
};

export const closeDCInfiniteAuth = async (
  windowLabel: string
): Promise<void> => {
  return await invoke('close_dc_infinite_auth', { windowLabel });
};

export const loadSavedDCInfiniteCookies = async (): Promise<
  Record<string, string>
> => {
  return await invoke('load_saved_dc_infinite_cookies');
};

export const clearSavedDCInfiniteCookies = async (): Promise<void> => {
  return await invoke('clear_saved_dc_infinite_cookies');
};

export const hasSavedDCInfiniteCookies = async (): Promise<boolean> => {
  return await invoke('has_saved_dc_infinite_cookies');
};

export const searchDCInfiniteComics = async (
  query: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('search_dc_infinite_comics', { query, cookies });
};

export const searchDCInfiniteSeries = async (
  query: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('search_dc_infinite_series', { query, cookies });
};

export const getDCSeriesComics = async (
  seriesId: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_dc_series_comics', { seriesId, cookies });
};

export const getDCComicDetails = async (
  comicId: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_dc_comic_details', { comicId, cookies });
};

export const downloadDCInfiniteComic = async (request: {
  comicId: string;
  comicTitle: string;
  cookies: Record<string, string>;
  savePath?: string;
}): Promise<void> => {
  return await invoke('download_dc_infinite_comic', { request });
};

export const getDCInfiniteNewComics = async (
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_dc_infinite_new_comics', { cookies });
};

export const saveDCNewComicsCache = async (
  comics: unknown[]
): Promise<void> => {
  return await invoke('save_dc_new_comics_cache', { comics });
};

export const loadDCNewComicsCache = async (
  maxAgeSecs: number = 86400
): Promise<unknown[] | null> => {
  return await invoke('load_dc_new_comics_cache', { maxAgeSecs });
};

export const insertDCInfiniteBookToDB = async (
  comic: unknown,
  savedPath: string
): Promise<void> => {
  return await invoke('insert_dc_infinite_book_to_db', { comic, savedPath });
};

export const openVizAuth = async (): Promise<void> => {
  return await invoke('open_viz_auth');
};

export const getVizCookies = async (
  windowLabel: string
): Promise<Record<string, string>> => {
  return await invoke('get_viz_cookies', { windowLabel });
};

export const closeVizAuth = async (windowLabel: string): Promise<void> => {
  return await invoke('close_viz_auth', { windowLabel });
};

export const loadSavedVizCookies = async (): Promise<
  Record<string, string>
> => {
  return await invoke('load_saved_viz_cookies');
};

export const clearSavedVizCookies = async (): Promise<void> => {
  return await invoke('clear_saved_viz_cookies');
};

export const hasSavedVizCookies = async (): Promise<boolean> => {
  return await invoke('has_saved_viz_cookies');
};

export const searchVizManga = async (
  query: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('search_viz_manga', { query, cookies });
};

export const searchVizSeries = async (
  query: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('search_viz_series', { query, cookies });
};

export const getVizSeriesChapters = async (
  seriesId: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_viz_series_chapters', { seriesId, cookies });
};

export const getVizChapterDetails = async (
  chapterId: string,
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_viz_chapter_details', { chapterId, cookies });
};

export const downloadVizChapter = async (request: {
  chapterId: string;
  chapterTitle: string;
  cookies: Record<string, string>;
  savePath?: string;
  seriesSlug?: string;
  chapterNumber?: string;
}): Promise<void> => {
  return await invoke('download_viz_chapter', { request });
};

export const getVizLatestChapters = async (
  cookies: Record<string, string>
): Promise<unknown> => {
  return await invoke('get_viz_latest_chapters', { cookies });
};

export const saveVizLatestCache = async (
  chapters: unknown[]
): Promise<void> => {
  return await invoke('save_viz_latest_cache', { chapters });
};

export const loadVizLatestCache = async (
  maxAgeSecs: number = 86400
): Promise<unknown[] | null> => {
  return await invoke('load_viz_latest_cache', { maxAgeSecs });
};

export const insertVizBookToDB = async (
  chapter: unknown,
  savedPath: string
): Promise<void> => {
  return await invoke('insert_viz_book_to_db', { chapter, savedPath });
};

export const unzipBook = async (path: string): Promise<void> => {
  return await invoke('unzip_book', { path });
};

export const listExtractedImages = async (): Promise<string[]> => {
  return await invoke('list_extracted_images', {});
};

export const listImagesInDirectory = async (
  path: string
): Promise<string[]> => {
  return await invoke('list_images_in_directory', { path });
};

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const detectPanels = async (
  page: string,
  method: string,
  mangaMode: boolean,
  bookPath?: string
): Promise<PanelRect[]> => {
  return await invoke('detect_panels', { page, method, mangaMode, bookPath });
};

export const detectPanelsBatch = async (
  pages: string[],
  method: string,
  mangaMode: boolean,
  bookPath?: string
): Promise<void> => {
  return await invoke('detect_panels_batch', {
    pages,
    method,
    mangaMode,
    bookPath,
  });
};

export const clearPanelCache = async (): Promise<void> => {
  return await invoke('clear_panel_cache');
};

export const createScanPath = async (
  name: string,
  path: string
): Promise<string> => {
  return await invoke('create_scan_path', { name, path });
};

export const getAllScanPaths = async (): Promise<
  { id: string; name: string; path: string }[]
> => {
  return await invoke('get_all_scan_paths', {});
};

export const deleteScanPath = async (scanPathId: string): Promise<void> => {
  return await invoke('delete_scan_path', { scanPathId });
};

export const updateScanPath = async (
  scanPathId: string,
  name: string,
  path: string
): Promise<void> => {
  return await invoke('update_scan_path', { scanPathId, name, path });
};

export const scanAllLibraries = async (): Promise<void> => {
  return await invoke('scan_all_libraries', {});
};

export const getBookmarks = async (
  bookId?: string
): Promise<
  {
    id: string;
    book_id: string;
    page: number;
    note?: string;
  }[]
> => {
  return await invoke('get_bookmarks', { bookId });
};

export const createBookmark = async (
  bookId: string,
  page: number
): Promise<void> => {
  return await invoke('create_bookmark', { bookId, page });
};

export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
  return await invoke('delete_bookmark', { bookmarkId });
};

export const refreshMetadataByProvider = async (
  id: string,
  provider: number,
  itemType: string
): Promise<void> => {
  return await invoke('refresh_metadata_by_provider', {
    id,
    provider,
    itemType,
  });
};

export const downloadBookFromUrl = async (
  url: string,
  name?: string,
  vol?: string
): Promise<string> => {
  return await invoke('download_book_from_url', { url, name, vol });
};

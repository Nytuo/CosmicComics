import { useCallback, useEffect, useMemo, useState } from 'react';
import * as TauriAPI from '@/API/TauriAPI.ts';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import {
  loadJellyfinLibrary,
  loadMoreJellyfinBooks,
  type JellyfinLibraryData,
} from '@/API/jellyfinLibrary.ts';

/**
 * Loads the local + Jellyfin library once and exposes the merged lists.
 * Shared by the desktop and mobile home screens so both show the same data.
 */
export function useLibraryData(CosmicComicsTemp: string, refreshKey?: number) {
  const [allBooks, setAllBooks] = useState<DisplayBook[]>([]);
  const [allSeries, setAllSeries] = useState<DisplaySeries[]>([]);
  const [readingBooks, setReadingBooks] = useState<DisplayBook[]>([]);
  const [downloadBooks, setDownloadBooks] = useState<DisplayBook[]>([]);
  const [jellyfin, setJellyfin] = useState<JellyfinLibraryData | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [jellyfinLoading, setJellyfinLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLocalLoading(true);

      try {
        const books = await TauriAPI.getAllBooks();
        const realBooks = books.filter((b) => b.path && b.path.trim() !== '');
        setAllBooks(realBooks);
        setReadingBooks(realBooks.filter((b) => b.reading));

        const downloadPath = CosmicComicsTemp + '/downloads';
        setDownloadBooks(books.filter((b) => b.path?.includes(downloadPath)));
      } catch (e) {
        console.error('Failed to load books:', e);
      }

      try {
        setAllSeries(await TauriAPI.getAllSeries());
      } catch (e) {
        console.error('Failed to load series:', e);
      }

      setLocalLoading(false);
    };

    loadData();

    let alive = true;
    setJellyfinLoading(true);
    loadJellyfinLibrary(!!refreshKey)
      .then((data) => alive && setJellyfin(data))
      .catch((e) => console.error('Failed to load Jellyfin:', e))
      .finally(() => alive && setJellyfinLoading(false));
    return () => {
      alive = false;
    };
  }, [CosmicComicsTemp, refreshKey]);

  const books = useMemo(
    () => [...allBooks, ...(jellyfin?.books ?? [])],
    [allBooks, jellyfin]
  );
  const series = useMemo(
    () => [...allSeries, ...(jellyfin?.series ?? [])],
    [allSeries, jellyfin]
  );
  const reading = useMemo(
    () => [...readingBooks, ...(jellyfin?.reading ?? [])],
    [readingBooks, jellyfin]
  );

  const downloads = useMemo(
    () => [...downloadBooks, ...(jellyfin?.offline ?? [])],
    [downloadBooks, jellyfin]
  );

  const loadMore = useCallback(async () => {
    if (!jellyfin || jellyfin.cursors.length === 0) return;
    setLoadingMore(true);
    try {
      setJellyfin(await loadMoreJellyfinBooks(jellyfin));
    } catch (e) {
      console.error('Failed to load more Jellyfin books:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [jellyfin]);

  const jellyfinLoaded = jellyfin?.books.length ?? 0;
  const jellyfinTotal = Math.max(jellyfin?.bookTotal ?? 0, jellyfinLoaded);

  return {
    books,
    series,
    reading,
    downloads,
    jellyfin,
    isLoading: localLoading || jellyfinLoading,
    bookTotal: allBooks.length + jellyfinTotal,
    hasMoreBooks: (jellyfin?.cursors.length ?? 0) > 0,
    loadingMore,
    loadMore,
    expiredServers: (jellyfin?.sources ?? []).filter((s) => s.expired),
  };
}

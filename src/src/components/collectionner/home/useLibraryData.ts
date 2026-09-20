import { useEffect, useMemo, useState } from 'react';
import * as TauriAPI from '@/API/TauriAPI.ts';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import {
  loadJellyfinLibrary,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

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

      setIsLoading(false);
    };

    loadData();

    let alive = true;
    loadJellyfinLibrary(!!refreshKey)
      .then((data) => alive && setJellyfin(data))
      .catch((e) => console.error('Failed to load Jellyfin:', e));
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

  return {
    books,
    series,
    reading,
    downloads: downloadBooks,
    jellyfin,
    isLoading,
    expiredServers: (jellyfin?.sources ?? []).filter((s) => s.expired),
  };
}

import * as React from 'react';
import * as TauriAPI from '@/API/TauriAPI';
import { readJellyfinSession } from '@/API/JellyfinAPI';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';

export interface BookContext {
  book: DisplayBook | null;
  seriesId: string | null;
  seriesTitle: string | null;
  previous: DisplayBook | null;
  next: DisplayBook | null;
  loaded: boolean;
}

const EMPTY: BookContext = {
  book: null,
  seriesId: null,
  seriesTitle: null,
  previous: null,
  next: null,
  loaded: false,
};

const numeric = new Intl.Collator(undefined, { numeric: true });

function byIssue(a: DisplayBook, b: DisplayBook) {
  const na = parseFloat(a.issue_number);
  const nb = parseFloat(b.issue_number);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return numeric.compare(a.title, b.title);
}

export function useBookContext(bookPath: string | null): BookContext {
  const [context, setContext] = React.useState<BookContext>(EMPTY);

  React.useEffect(() => {
    if (!bookPath || readJellyfinSession()) {
      setContext({ ...EMPTY, loaded: true });
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [book] = await TauriAPI.getBooksByPath(bookPath);
        if (!book) return { ...EMPTY, loaded: true };
        if (!book.series_id) return { ...EMPTY, book, loaded: true };

        const [siblings, series] = await Promise.all([
          TauriAPI.getBooksBySeries(book.series_id),
          TauriAPI.getSeriesById(book.series_id).catch(() => null),
        ]);
        const ordered = siblings.filter((b) => b.path).sort(byIssue);
        const at = ordered.findIndex((b) => b.id === book.id);
        return {
          book,
          seriesId: book.series_id,
          seriesTitle: series?.title ?? null,
          previous: at > 0 ? ordered[at - 1] : null,
          next: at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : null,
          loaded: true,
        };
      } catch {
        return { ...EMPTY, loaded: true };
      }
    })().then((next) => alive && setContext(next));
    return () => {
      alive = false;
    };
  }, [bookPath]);

  return context;
}

export async function openBookInReader(book: DisplayBook) {
  await TauriAPI.updateBookStatusOne('reading', book.id).catch(() => {});
  localStorage.setItem('currentBook', book.path);
  localStorage.removeItem('currentPage');
  window.location.href = '/viewer';
}

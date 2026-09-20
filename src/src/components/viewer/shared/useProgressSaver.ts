import * as React from 'react';
import * as TauriAPI from '@/API/TauriAPI';

const SAVE_DELAY_MS = 800;

/**
 * Persists the reading position whenever the page changes (slider, thumbnail,
 * swipe, bookmark jump…) — not just on "next". Reaching the last page marks
 * the book as read.
 */
export function useProgressSaver(
  bookId: string | null | undefined,
  page: number,
  lastIndex: number
) {
  const pending = React.useRef<number | null>(null);
  const finished = React.useRef(false);

  const flush = React.useCallback(() => {
    const value = pending.current;
    pending.current = null;
    if (value === null || !bookId) return;
    TauriAPI.updateReadingProgress(bookId, value).catch(() => {});
    if (lastIndex > 0 && value >= lastIndex && !finished.current) {
      finished.current = true;
      TauriAPI.updateBookStatusOne('read', bookId).catch(() => {});
    }
  }, [bookId, lastIndex]);

  React.useEffect(() => {
    if (!bookId || lastIndex <= 0) return;
    pending.current = page;
    const timer = window.setTimeout(flush, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [bookId, page, lastIndex, flush]);

  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);
}

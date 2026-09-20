import * as React from 'react';
import * as TauriAPI from '@/API/TauriAPI';

export interface PageBookmark {
  id: string;
  page: number;
}

export function useBookmarks(bookId: string | null | undefined) {
  const [bookmarks, setBookmarks] = React.useState<PageBookmark[]>([]);

  const refresh = React.useCallback(async () => {
    if (!bookId) {
      setBookmarks([]);
      return;
    }
    try {
      const all = await TauriAPI.getBookmarks(bookId);
      setBookmarks(
        all
          .map((b) => ({ id: b.id, page: b.page }))
          .sort((a, b) => a.page - b.page)
      );
    } catch {
      setBookmarks([]);
    }
  }, [bookId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const has = React.useCallback(
    (page: number) => bookmarks.some((b) => b.page === page),
    [bookmarks]
  );

  const toggle = React.useCallback(
    async (page: number) => {
      if (!bookId) return false;
      const existing = bookmarks.find((b) => b.page === page);
      if (existing) {
        await TauriAPI.deleteBookmark(existing.id);
      } else {
        await TauriAPI.createBookmark(bookId, page);
      }
      await refresh();
      return !existing;
    },
    [bookId, bookmarks, refresh]
  );

  const remove = React.useCallback(
    async (id: string) => {
      await TauriAPI.deleteBookmark(id);
      await refresh();
    },
    [refresh]
  );

  return { bookmarks, has, toggle, remove, enabled: !!bookId };
}

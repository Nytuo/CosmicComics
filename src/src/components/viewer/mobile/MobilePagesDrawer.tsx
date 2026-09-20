import * as React from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer.tsx';
import { cn } from '@/lib/utils.ts';
import type { PageBookmark } from '../shared/useBookmarks.ts';

type Tab = 'pages' | 'bookmarks';

interface MobilePagesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: string[];
  current: number;
  bookmarks: PageBookmark[];
  onJump: (index: number) => void;
  onRemoveBookmark: (id: string) => void;
}

/** Thumbnail grid of every page, plus this book's bookmarks. */
export default function MobilePagesDrawer({
  open,
  onOpenChange,
  pages,
  current,
  bookmarks,
  onJump,
  onRemoveBookmark,
}: MobilePagesDrawerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>('pages');
  const marked = React.useMemo(
    () => new Set(bookmarks.map((b) => b.page)),
    [bookmarks]
  );

  const jump = (index: number) => {
    onOpenChange(false);
    onJump(index);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[82dvh] max-h-[82dvh] rounded-t-3xl">
        <DrawerHeader className="pb-2 text-left">
          <DrawerTitle className="sr-only">{t('reader_pages')}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t('reader_pages')}
          </DrawerDescription>
          <div
            role="tablist"
            className="flex gap-1 rounded-full bg-muted/70 p-1"
          >
            {(['pages', 'bookmarks'] as const).map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  tab === id
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground'
                )}
              >
                {t(id === 'pages' ? 'reader_pages' : 'Bookmark')}
                <span className="ml-1.5 text-xs opacity-60">
                  {id === 'pages' ? pages.length : bookmarks.length}
                </span>
              </button>
            ))}
          </div>
        </DrawerHeader>

        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {tab === 'pages' ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {pages.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  ref={
                    i === current
                      ? (el) => el?.scrollIntoView({ block: 'center' })
                      : undefined
                  }
                  onClick={() => jump(i)}
                  className="group text-center"
                >
                  <span
                    className={cn(
                      'relative block aspect-2/3 overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-transform active:scale-95',
                      i === current && 'ring-2 ring-secondary'
                    )}
                  >
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                    {marked.has(i) && (
                      <Bookmark className="absolute top-1 right-1 size-5 fill-secondary text-secondary drop-shadow" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-xs tabular-nums',
                      i === current
                        ? 'font-semibold text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Bookmark className="size-10 opacity-50" />
              <p className="max-w-64 text-sm">{t('reader_no_bookmarks')}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((bookmark) => (
                <li
                  key={bookmark.id}
                  className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2"
                >
                  <button
                    type="button"
                    onClick={() => jump(bookmark.page)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <img
                      src={pages[bookmark.page]}
                      alt=""
                      loading="lazy"
                      className="h-16 w-11 shrink-0 rounded-lg object-cover"
                    />
                    <span className="text-sm font-medium">
                      {t('nav_page_of', {
                        page: bookmark.page + 1,
                        total: pages.length,
                      })}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t('DELETE')}
                    onClick={() => onRemoveBookmark(bookmark.id)}
                    className="flex size-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

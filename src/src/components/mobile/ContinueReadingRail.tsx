import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl } from '@/utils/imageUrl.ts';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';

/** Horizontally snapping rail of in-progress books with a one-tap resume. */
export default function ContinueReadingRail({
  books,
  onOpen,
  onResume,
}: {
  books: DisplayBook[];
  onOpen: (book: DisplayBook) => void;
  onResume: (book: DisplayBook) => void;
}) {
  const { t } = useTranslation();
  if (books.length === 0) return null;

  return (
    <section aria-label={t('continue_reading')} className="-mx-4">
      <h2 className="mb-2 px-4 text-base font-semibold">
        {t('continue_reading')}
      </h2>
      <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => {
          const percent = Math.round(book.reading_progress?.percentage ?? 0);
          const cover = resolveImageUrl(book.cover_url);
          return (
            <div
              key={book.id}
              className="relative w-[78%] max-w-80 shrink-0 snap-start overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-border/60"
            >
              <div
                aria-hidden
                className="absolute inset-0 scale-125 bg-cover bg-center opacity-40 blur-2xl"
                style={{ backgroundImage: `url("${cover}")` }}
              />
              <button
                type="button"
                onClick={() => onOpen(book)}
                className="relative flex w-full items-center gap-3 p-3 text-left outline-none"
              >
                <img
                  src={cover}
                  alt=""
                  draggable={false}
                  className="h-28 w-[4.75rem] shrink-0 rounded-xl object-cover shadow-md"
                  onError={(event) => {
                    event.currentTarget.src = '/Images/fileDefault.png';
                  }}
                />
                <div className="min-w-0 flex-1 pr-12">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold">
                    {book.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('nav_page_of', {
                      page: (book.reading_progress?.last_page ?? 0) + 1,
                      total:
                        book.page_count || book.reading_progress?.page_count,
                    })}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </button>
              <button
                type="button"
                aria-label={t('nav_resume')}
                onClick={() => onResume(book)}
                className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg transition-transform active:scale-90"
              >
                <Play className="size-5 fill-current" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

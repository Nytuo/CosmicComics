import { CheckCircle2, Download, Heart } from 'lucide-react';
import { resolveImageUrl } from '@/utils/imageUrl.ts';
import { jellyfinRef } from '@/API/jellyfinLibrary.ts';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';

type BookOrSeries = DisplayBook | DisplaySeries;

const isBook = (item: BookOrSeries): item is DisplayBook =>
  'page_count' in item;

function progressOf(item: BookOrSeries): number {
  if (isBook(item)) {
    if (item.read) return 100;
    return item.reading_progress?.percentage ?? 0;
  }
  return item.book_count > 0 ? (item.read_count * 100) / item.book_count : 0;
}

/** Cover-first grid cell: poster, thin progress line, two lines of text. */
export default function MobileCard({
  item,
  onOpen,
}: {
  item: BookOrSeries;
  onOpen: () => void;
}) {
  const progress = progressOf(item);
  const subtitle = isBook(item)
    ? item.issue_number
      ? `#${item.issue_number}`
      : item.format?.toUpperCase()
    : `${item.read_count}/${item.book_count}`;
  const remote = !!jellyfinRef(item);
  const offline = !!jellyfinRef(item)?.offline;
  const done = isBook(item) ? item.read : progress >= 100;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full min-w-0 text-left outline-none"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-2xl bg-muted shadow-md ring-1 ring-border/60 transition-transform duration-150 group-active:scale-[0.97]">
        <img
          src={resolveImageUrl(item.cover_url)}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
          onError={(event) => {
            event.currentTarget.src = '/Images/fileDefault.png';
          }}
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
          {remote ? (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              Jellyfin
              {offline && <Download className="size-3" />}
            </span>
          ) : (
            <span />
          )}
          {item.favorite && (
            <span className="flex size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur">
              <Heart className="size-3.5 fill-red-500 text-red-500" />
            </span>
          )}
        </div>
        {done && (
          <CheckCircle2 className="absolute right-1.5 bottom-2.5 size-5 text-green-400 drop-shadow" />
        )}
        {progress > 0 && !done && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div
              className="h-full bg-secondary"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-tight font-medium">
        {item.title}
      </p>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {subtitle}
        </p>
      )}
    </button>
  );
}

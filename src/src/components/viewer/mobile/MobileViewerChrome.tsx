import * as React from 'react';
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  Bookmark,
  LayoutGrid,
  Moon,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import type { ReadingMode } from '../shared/readerPrefs.ts';
import Scrubber from './Scrubber.tsx';

interface MobileViewerChromeProps {
  visible: boolean;
  title: string;
  subtitle?: string | null;
  page: number;
  lastIndex: number;
  pages: string[];
  readingMode: ReadingMode;
  nightOn: boolean;
  bookmarked: boolean;
  bookmarksEnabled: boolean;
  onBack: () => void;
  onToggleBookmark: () => void;
  onOpenPages: () => void;
  onCycleMode: () => void;
  onToggleNight: () => void;
  onOpenSettings: () => void;
  onScrub: (index: number) => void;
}

const MODE_ICON: Record<ReadingMode, React.ElementType> = {
  ltr: ArrowLeftRight,
  rtl: ArrowRightLeft,
  vertical: ArrowDownUp,
};

/** Auto-hiding top bar (title, bookmark) and bottom dock (scrubber, tools). */
export default function MobileViewerChrome({
  visible,
  title,
  subtitle,
  page,
  lastIndex,
  pages,
  readingMode,
  nightOn,
  bookmarked,
  bookmarksEnabled,
  onBack,
  onToggleBookmark,
  onOpenPages,
  onCycleMode,
  onToggleNight,
  onOpenSettings,
  onScrub,
}: MobileViewerChromeProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = React.useState<number | null>(null);
  const ModeIcon = MODE_ICON[readingMode];
  const modeLabel = t(`reader_mode_${readingMode}`);
  const rtl = readingMode === 'rtl';

  const tools = [
    {
      id: 'pages',
      label: t('reader_pages'),
      icon: LayoutGrid,
      onClick: onOpenPages,
      active: false,
    },
    {
      id: 'mode',
      label: modeLabel,
      icon: ModeIcon,
      onClick: onCycleMode,
      active: false,
    },
    {
      id: 'night',
      label: t('reader_night'),
      icon: Moon,
      onClick: onToggleNight,
      active: nightOn,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: SlidersHorizontal,
      onClick: onOpenSettings,
      active: false,
    },
  ];

  return (
    <>
      <header
        className={cn(
          'absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/85 via-black/60 to-transparent pt-[env(safe-area-inset-top)] pb-6 text-white transition-all duration-200',
          !visible && '-translate-y-full opacity-0 pointer-events-none'
        )}
      >
        <div className="flex h-14 items-center gap-1 px-2">
          <button
            type="button"
            aria-label={t('go_back')}
            onClick={onBack}
            className="flex size-11 items-center justify-center rounded-full active:bg-white/15"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-[15px] leading-tight font-semibold">
              {title}
            </p>
            {subtitle && (
              <p className="truncate text-xs leading-tight text-white/60">
                {subtitle}
              </p>
            )}
          </div>
          {bookmarksEnabled && (
            <button
              type="button"
              aria-label={t('Bookmark')}
              aria-pressed={bookmarked}
              onClick={onToggleBookmark}
              className="flex size-11 items-center justify-center rounded-full active:bg-white/15"
            >
              <Bookmark
                className={cn(
                  'size-5',
                  bookmarked && 'fill-secondary text-secondary'
                )}
              />
            </button>
          )}
        </div>
      </header>

      <footer
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/90 via-black/70 to-transparent px-4 pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white transition-all duration-200',
          !visible && 'translate-y-full opacity-0 pointer-events-none'
        )}
      >
        {preview !== null && (
          <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center pb-2">
            <div className="overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl">
              <img
                src={pages[preview]}
                alt=""
                className="h-44 w-auto max-w-[60vw] object-contain"
              />
              <p className="py-1 text-center text-xs tabular-nums">
                {preview + 1} / {lastIndex + 1}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="w-9 text-right text-xs tabular-nums text-white/70">
            {rtl ? lastIndex + 1 : page + 1}
          </span>
          <div className="min-w-0 flex-1">
            <Scrubber
              value={page}
              max={lastIndex}
              reversed={rtl}
              label={t('pageSlider')}
              onPreview={setPreview}
              onCommit={onScrub}
            />
          </div>
          <span className="w-9 text-xs tabular-nums text-white/70">
            {rtl ? page + 1 : lastIndex + 1}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {tools.map(({ id, label, icon: Icon, onClick, active }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition-colors active:bg-white/15',
                active ? 'text-secondary' : 'text-white/85'
              )}
            >
              <Icon className={cn('size-5', active && 'fill-current')} />
              <span className="max-w-full truncate px-1">{label}</span>
            </button>
          ))}
        </div>
      </footer>
    </>
  );
}

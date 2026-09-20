import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as TauriAPI from '@/API/TauriAPI';
import { useBookPages } from '../hooks/useBookPages.ts';
import { useJellyfinProgress } from '../hooks/useJellyfinProgress.ts';
import { useReadingSession } from '../hooks/useReadingSession.ts';
import { useBookContext, openBookInReader } from '../shared/useBookContext.ts';
import { useBookmarks } from '../shared/useBookmarks.ts';
import { useProgressSaver } from '../shared/useProgressSaver.ts';
import { useWakeLock } from '../shared/useWakeLock.ts';
import { ReaderFilterOverlay } from '../shared/ReaderFilterOverlay.tsx';
import EndOfBookCard from '../shared/EndOfBookCard.tsx';
import {
  loadSeriesMemory,
  useReaderPrefs,
  type Backdrop,
  type ReadingMode,
} from '../shared/readerPrefs.ts';
import { buildGroups, groupOf } from './spreads.ts';
import PagedStage, { type PagedStageHandle } from './PagedStage.tsx';
import VerticalStage, { type VerticalStageHandle } from './VerticalStage.tsx';
import MobileViewerChrome from './MobileViewerChrome.tsx';
import MobilePagesDrawer from './MobilePagesDrawer.tsx';
import MobileReaderSettings from './MobileReaderSettings.tsx';

const BACKDROP: Record<Backdrop, string> = {
  black: '#000000',
  dark: '#1a1a1a',
  white: '#ffffff',
};
const MODE_ORDER: ReadingMode[] = ['ltr', 'rtl', 'vertical'];
const WEBTOON_RATIO = 2.2;
const NIGHT_WARMTH = 45;
const SPREAD_MIN_WIDTH = 900;
const isWideLandscape = () =>
  window.innerWidth >= SPREAD_MIN_WIDTH &&
  window.innerWidth > window.innerHeight;

const fileName = (path: string | null) =>
  path
    ?.split(/[\\/]/)
    .pop()
    ?.replace(/\.[^.]+$/, '') ?? '';

/**
 * Touch-first reader for phones and tablets: full-bleed pages, gesture zoom,
 * swipe / tap-zone navigation, an immersive auto-hiding UI, and every option
 * in bottom sheets instead of desktop dialogs.
 */
export default function MobileViewer() {
  const { t } = useTranslation();
  const bookPath = localStorage.getItem('currentBook');
  const source = useBookPages();
  const context = useBookContext(bookPath);
  const { prefs, update, reset } = useReaderPrefs(context.seriesId);

  const total = source.pages.length;
  const lastIndex = Math.max(0, total - 1);
  const [index, setIndex] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const [chromeVisible, setChromeVisible] = React.useState(true);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [pagesOpen, setPagesOpen] = React.useState(false);
  const [jump, setJump] = React.useState<{
    index: number;
    nonce: number;
  } | null>(null);
  const [wide, setWide] = React.useState(isWideLandscape);
  const paged = React.useRef<PagedStageHandle>(null);
  const vertical = React.useRef<VerticalStageHandle>(null);

  const rtl = prefs.readingMode === 'rtl';
  const isVertical = prefs.readingMode === 'vertical';
  const spreadOn = prefs.spread && wide && !isVertical;
  // With two pages on screen, "read" means the *last* of them was reached.
  const groups = React.useMemo(
    () => buildGroups(total, spreadOn, prefs.coverAlone),
    [total, spreadOn, prefs.coverAlone]
  );
  const shown = groups[groupOf(groups, index)] ?? [Math.min(index, lastIndex)];
  const page = Math.min(index, lastIndex);
  const furthest = shown[shown.length - 1];
  const bookId = context.book?.id ?? null;
  const title = context.book?.title ?? fileName(bookPath);
  const bookmarks = useBookmarks(bookId);

  // Resume where the reader left off (a bookmark can request a specific page).
  React.useEffect(() => {
    if (started || source.status !== 'ready' || !context.loaded) return;
    const requested = localStorage.getItem('currentPage');
    localStorage.removeItem('currentPage');
    const saved = context.book?.reading_progress?.last_page ?? 0;
    const finishedBefore = context.book?.read && saved >= total - 1;
    const start =
      requested !== null ? parseInt(requested) : finishedBefore ? 0 : saved;
    setIndex(Math.min(Math.max(0, Number.isNaN(start) ? 0 : start), total - 1));
    setStarted(true);
    if (context.book?.unread) {
      TauriAPI.updateBookStatusOne('reading', context.book.id).catch(() => {});
    }
  }, [started, source.status, context.loaded, context.book, total]);

  useProgressSaver(started ? bookId : null, furthest, lastIndex);
  useReadingSession(furthest, false, lastIndex);
  useJellyfinProgress(furthest, false, lastIndex);
  useWakeLock(prefs.keepAwake);

  // The chrome greets the reader, then gets out of the way.
  React.useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => setChromeVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [started]);

  React.useEffect(() => {
    const onResize = () => setWide(isWideLandscape());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    document.body.style.background = BACKDROP[prefs.backdrop];
  }, [prefs.backdrop]);

  // A very tall first page means a long-strip comic: switch to vertical once.
  React.useEffect(() => {
    if (
      source.status !== 'ready' ||
      !context.loaded ||
      loadSeriesMemory(context.seriesId).readingMode
    )
      return;
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalHeight / probe.naturalWidth > WEBTOON_RATIO) {
        update({ readingMode: 'vertical' });
      }
    };
    probe.src = source.pages[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.status, context.loaded]);

  const buzz = React.useCallback(() => {
    if (prefs.haptics) navigator.vibrate?.(6);
  }, [prefs.haptics]);

  const goTo = React.useCallback(
    (target: number) => {
      const next = Math.min(Math.max(0, target), total);
      setIndex(next);
      if (isVertical) setJump({ index: next, nonce: Date.now() });
      else paged.current?.resetZoom();
    },
    [total, isVertical]
  );

  const turn = React.useCallback(
    (direction: 1 | -1) => {
      if (isVertical) vertical.current?.turn(direction);
      else paged.current?.turn(direction);
    },
    [isVertical]
  );

  // Auto-turn pages (paged) — vertical mode scrolls continuously instead.
  React.useEffect(() => {
    if (isVertical || prefs.autoTurn <= 0 || !started) return;
    const timer = window.setInterval(() => {
      if (index < total) paged.current?.turn(1);
    }, prefs.autoTurn * 1000);
    return () => window.clearInterval(timer);
  }, [isVertical, prefs.autoTurn, started, index, total]);

  // Hardware keyboards (iPad, Android tablets, desktop windows).
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (settingsOpen || pagesOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [role="slider"]')) return;
      const physical =
        event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (physical) {
        turn((rtl && !isVertical ? -physical : physical) as 1 | -1);
      } else if (
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        event.key === ' '
      ) {
        turn(1);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        turn(-1);
      } else if (event.key === 'Home') {
        goTo(0);
      } else if (event.key === 'End') {
        goTo(lastIndex);
      } else {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [turn, goTo, lastIndex, rtl, isVertical, settingsOpen, pagesOpen]);

  const exit = () => {
    window.location.href = '/collectionner';
  };

  const toggleBookmark = async () => {
    const added = await bookmarks.toggle(page);
    ToasterHandler(
      t(added ? 'bookmark_added' : 'bookmark_removed'),
      added ? 'success' : 'info'
    );
  };

  const endSlide = (
    <EndOfBookCard
      title={title}
      next={context.next}
      onNext={() => context.next && openBookInReader(context.next)}
      onExit={exit}
      onReadAgain={() => goTo(0)}
    />
  );

  const insets = {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  };

  if (source.status !== 'ready') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black px-8 text-center text-white">
        {source.status === 'error' ? (
          <>
            <AlertTriangle className="size-10 text-amber-400" />
            <p className="max-w-xs text-sm text-white/80">
              {source.error === 'no-images-to-load'
                ? t('no-images-to-load')
                : t('error_loading_local')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={exit}
              >
                {t('go_back')}
              </Button>
              <Button className="rounded-full" onClick={source.reload}>
                <RotateCw className="size-4" />
                {t('reader_retry')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Spinner className="size-8" />
            <div className="w-full max-w-xs space-y-3">
              <Progress value={source.percentage} />
              <p className="truncate text-xs text-white/60">
                {source.currentFile || t('loading_cache')}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: BACKDROP[prefs.backdrop] }}
    >
      {started && (
        <div className="absolute" style={{ ...insets }}>
          {isVertical ? (
            <VerticalStage
              handleRef={vertical}
              pages={source.pages}
              initialIndex={index}
              onIndexChange={setIndex}
              jump={jump}
              tapZones={prefs.tapZones}
              autoScroll={prefs.autoTurn}
              endSlide={endSlide}
              onToggleChrome={() => setChromeVisible((v) => !v)}
            />
          ) : (
            <PagedStage
              handleRef={paged}
              pages={source.pages}
              index={index}
              onIndexChange={setIndex}
              rtl={rtl}
              fit={prefs.fit}
              transition={prefs.transition}
              tapZones={prefs.tapZones}
              cropBorders={prefs.cropBorders}
              spread={spreadOn}
              coverAlone={prefs.coverAlone}
              endSlide={endSlide}
              onToggleChrome={() => setChromeVisible((v) => !v)}
              onTurned={buzz}
            />
          )}
        </div>
      )}

      <ReaderFilterOverlay prefs={prefs} className="z-10" />

      {prefs.pageNumber && started && !chromeVisible && index < total && (
        <>
          <div className="pointer-events-none absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white/90 tabular-nums backdrop-blur">
            {shown.length > 1 ? `${shown[0] + 1}–${furthest + 1}` : page + 1} /{' '}
            {total}
          </div>
          <div
            className="pointer-events-none absolute bottom-0 left-0 z-10 h-0.5 bg-secondary"
            style={{ width: `${((page + 1) / total) * 100}%` }}
          />
        </>
      )}

      <MobileViewerChrome
        visible={chromeVisible}
        title={title}
        subtitle={context.seriesTitle}
        page={page}
        lastIndex={lastIndex}
        pages={source.pages}
        readingMode={prefs.readingMode}
        nightOn={prefs.warmth > 0}
        bookmarked={bookmarks.has(page)}
        bookmarksEnabled={bookmarks.enabled}
        onBack={exit}
        onToggleBookmark={toggleBookmark}
        onOpenPages={() => setPagesOpen(true)}
        onCycleMode={() =>
          update({
            readingMode:
              MODE_ORDER[
                (MODE_ORDER.indexOf(prefs.readingMode) + 1) % MODE_ORDER.length
              ],
          })
        }
        onToggleNight={() =>
          update({ warmth: prefs.warmth > 0 ? 0 : NIGHT_WARMTH })
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onScrub={goTo}
      />

      <MobilePagesDrawer
        open={pagesOpen}
        onOpenChange={setPagesOpen}
        pages={source.pages}
        current={page}
        bookmarks={bookmarks.bookmarks}
        onJump={goTo}
        onRemoveBookmark={bookmarks.remove}
      />
      <MobileReaderSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        prefs={prefs}
        update={update}
        reset={reset}
        seriesTitle={context.seriesTitle}
        canSpread={wide}
      />
    </div>
  );
}

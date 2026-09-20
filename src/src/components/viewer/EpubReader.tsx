import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { convertFileSrc } from '@tauri-apps/api/core';
import ePub, { type Book, type NavItem, type Rendition } from 'epubjs';
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Palette,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Slider } from '@/components/ui/slider.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.tsx';
import * as TauriAPI from '@/API/TauriAPI';
import * as JellyfinAPI from '@/API/JellyfinAPI';
import { ReadingSessionTracker } from '@/API/StatsAPI';
import { resolveSessionMeta } from '@/utils/readingSession';

const SETTINGS_KEY = 'epub.settings';
const LOCATION_SIZE = 1024;
const SAVE_DELAY_MS = 1500;
const FINISHED_FRACTION = 0.98;
const SWIPE_MIN = 50;
const FONT_MIN = 70;
const FONT_MAX = 220;
const FONT_STEP = 10;

type ThemeName = 'light' | 'sepia' | 'dark';

const THEMES: Record<ThemeName, { bg: string; fg: string }> = {
  light: { bg: '#ffffff', fg: '#1a1a1a' },
  sepia: { bg: '#f4ecd8', fg: '#5b4636' },
  dark: { bg: '#121212', fg: '#dcdcdc' },
};
const THEME_ORDER: ThemeName[] = ['light', 'sepia', 'dark'];

interface Settings {
  fontSize: number;
  theme: ThemeName;
}

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      fontSize: Math.min(FONT_MAX, Math.max(FONT_MIN, saved.fontSize ?? 110)),
      theme: THEME_ORDER.includes(saved.theme) ? saved.theme : 'dark',
    };
  } catch {
    return { fontSize: 110, theme: 'dark' };
  }
}

function applyTheme(rendition: Rendition, settings: Settings) {
  const { bg, fg } = THEMES[settings.theme];
  rendition.themes.override('color', fg);
  rendition.themes.override('background', bg);
  rendition.themes.fontSize(`${settings.fontSize}%`);
}

export default function EpubReader({ path }: { path: string }) {
  const { t } = useTranslation();
  const host = React.useRef<HTMLDivElement>(null);
  const rendition = React.useRef<Rendition | null>(null);
  const book = React.useRef<Book | null>(null);
  const [title, setTitle] = React.useState('');
  const [toc, setToc] = React.useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = React.useState(false);
  const [settings, setSettings] = React.useState<Settings>(loadSettings);
  const [progress, setProgress] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const settingsRef = React.useRef(settings);
  React.useLayoutEffect(() => {
    settingsRef.current = settings;
  });

  const next = React.useCallback(() => rendition.current?.next(), []);
  const prev = React.useCallback(() => rendition.current?.prev(), []);

  React.useEffect(() => {
    if (!host.current) return;
    let disposed = false;
    const cfiKey = `epub.cfi:${path}`;
    const jellyfin = JellyfinAPI.readJellyfinSession();
    let localBookId: string | undefined;
    let tracker: ReadingSessionTracker | null = null;
    let saveTimer: number | undefined;
    let pending: { fraction: number; index: number; total: number } | null =
      null;
    let finishedSent = false;

    const flush = () => {
      window.clearTimeout(saveTimer);
      const report = pending;
      pending = null;
      if (!report) return;
      if (jellyfin) {
        JellyfinAPI.reportFraction(
          jellyfin.serverId,
          jellyfin.itemId,
          report.fraction
        ).catch((e) => console.warn('Jellyfin progress not saved:', e));
      } else if (localBookId) {
        TauriAPI.updateReadingProgress(localBookId, report.index).catch(
          () => {}
        );
        if (report.fraction >= FINISHED_FRACTION && !finishedSent) {
          finishedSent = true;
          TauriAPI.updateBookStatusOne('read', localBookId).catch(() => {});
        }
      }
    };

    (async () => {
      try {
        const meta = await resolveSessionMeta(path);
        if (meta.source === 'local' && !meta.bookRef.startsWith('file:')) {
          localBookId = meta.bookRef;
        }
        tracker = new ReadingSessionTracker(meta);
        setTitle(meta.title);

        const data = await (await fetch(convertFileSrc(path))).arrayBuffer();
        if (disposed || !host.current) return;
        const opened = ePub(data);
        book.current = opened;
        const view = opened.renderTo(host.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: window.innerWidth >= 1100 ? 'auto' : 'none',
          allowScriptedContent: false,
        });
        rendition.current = view;
        applyTheme(view, settingsRef.current);

        opened.loaded.navigation.then((nav) => !disposed && setToc(nav.toc));
        opened.loaded.metadata.then(
          (m) => !disposed && m.title && setTitle(m.title)
        );

        const savedCfi = localStorage.getItem(cfiKey);
        const savedFraction = Number(
          localStorage.getItem('currentFraction') ?? 0
        );
        await view.display(jellyfin ? undefined : (savedCfi ?? undefined));
        if (disposed) return;
        setReady(true);
        tracker.start();

        view.on('relocated', (location: any) => {
          const cfi: string = location.start.cfi;
          const locations = opened.locations;
          const total = locations.length();
          const fraction = total > 0 ? locations.percentageFromCfi(cfi) : 0;
          const index = total > 0 ? locations.locationFromCfi(cfi) : 0;
          setProgress(fraction);
          localStorage.setItem(cfiKey, cfi);
          if (total > 0) {
            tracker?.update(Number(index), total);
            pending = { fraction, index: Number(index), total };
            window.clearTimeout(saveTimer);
            saveTimer = window.setTimeout(flush, SAVE_DELAY_MS);
          }
        });

        let swipeStart: { x: number; y: number } | null = null;
        view.on('touchstart', (e: TouchEvent) => {
          const touch = e.changedTouches[0];
          swipeStart = { x: touch.clientX, y: touch.clientY };
        });
        view.on('touchend', (e: TouchEvent) => {
          const touch = e.changedTouches[0];
          const start = swipeStart;
          swipeStart = null;
          if (!start) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) view.next();
            else view.prev();
          }
        });
        view.on('keyup', (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight') view.next();
          if (e.key === 'ArrowLeft') view.prev();
        });

        await opened.ready;
        await opened.locations.generate(LOCATION_SIZE);
        if (disposed) return;
        if (jellyfin && savedFraction > 0 && savedFraction < 1) {
          await view.display(opened.locations.cfiFromPercentage(savedFraction));
        } else {
          const cfi = view.currentLocation() as any;
          if (cfi?.start?.cfi) {
            setProgress(opened.locations.percentageFromCfi(cfi.start.cfi));
          }
        }
      } catch (e) {
        if (!disposed) setError(String(e));
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') rendition.current?.next();
      if (e.key === 'ArrowLeft') rendition.current?.prev();
    };
    const onResize = () =>
      rendition.current?.resize(
        host.current?.clientWidth ?? 0,
        host.current?.clientHeight ?? 0
      );
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    return () => {
      disposed = true;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
      tracker?.stop();
      book.current?.destroy();
      book.current = null;
      rendition.current = null;
    };
  }, [path]);

  React.useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (rendition.current) applyTheme(rendition.current, settings);
  }, [settings]);

  const colors = THEMES[settings.theme];

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <header className="flex items-center gap-1 border-b border-black/10 bg-background/90 px-2 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] text-foreground backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('go_back')}
          onClick={() => (window.location.href = '/collectionner')}
        >
          <BookMarked className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('epub_contents')}
          onClick={() => setTocOpen(true)}
        >
          <List className="h-5 w-5" />
        </Button>
        <p className="min-w-0 flex-1 truncate px-2 text-center text-sm">
          {title}
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('zoom_out')}
          onClick={() =>
            setSettings((s) => ({
              ...s,
              fontSize: Math.max(FONT_MIN, s.fontSize - FONT_STEP),
            }))
          }
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('zoom_in')}
          onClick={() =>
            setSettings((s) => ({
              ...s,
              fontSize: Math.min(FONT_MAX, s.fontSize + FONT_STEP),
            }))
          }
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('epub_theme')}
          onClick={() =>
            setSettings((s) => ({
              ...s,
              theme:
                THEME_ORDER[
                  (THEME_ORDER.indexOf(s.theme) + 1) % THEME_ORDER.length
                ],
            }))
          }
        >
          <Palette className="h-4 w-4" />
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="size-8" />
          </div>
        )}
        {error && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          aria-label={t('go_previous')}
          className="absolute inset-y-0 left-0 hidden w-10 items-center justify-center opacity-30 hover:opacity-100 md:flex"
          onClick={prev}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          aria-label={t('go_next')}
          className="absolute inset-y-0 right-0 hidden w-10 items-center justify-center opacity-30 hover:opacity-100 md:flex"
          onClick={next}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <footer className="flex items-center gap-3 border-t border-black/10 bg-background/90 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-foreground">
        <Slider
          value={[Math.round(progress * 1000)]}
          min={0}
          max={1000}
          step={1}
          onValueChange={(v) => setProgress(v[0] / 1000)}
          onValueCommit={(v) => {
            const opened = book.current;
            if (opened && opened.locations.length() > 0) {
              rendition.current?.display(
                opened.locations.cfiFromPercentage(v[0] / 1000)
              );
            }
          }}
        />
        <span className="w-12 text-right text-sm tabular-nums">
          {Math.round(progress * 100)}%
        </span>
      </footer>

      <Sheet open={tocOpen} onOpenChange={setTocOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('epub_contents')}</SheetTitle>
          </SheetHeader>
          <TocList
            items={toc}
            onPick={(href) => {
              setTocOpen(false);
              rendition.current?.display(href);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TocList({
  items,
  onPick,
  depth = 0,
}: {
  items: NavItem[];
  onPick: (href: string) => void;
  depth?: number;
}) {
  return (
    <ul className="space-y-1 px-4 pb-4">
      {items.map((item) => (
        <li key={item.id ?? item.href}>
          <button
            className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            style={{ paddingLeft: `${0.5 + depth}rem` }}
            onClick={() => onPick(item.href)}
          >
            {item.label.trim()}
          </button>
          {item.subitems && item.subitems.length > 0 && (
            <TocList items={item.subitems} onPick={onPick} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

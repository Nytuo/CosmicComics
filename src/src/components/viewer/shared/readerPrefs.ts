import * as React from 'react';
import { looksMobile } from '@/hooks/use-platform.ts';

export type ReadingMode = 'ltr' | 'rtl' | 'vertical';
export type FitMode = 'screen' | 'width' | 'height';
export type PageTransition = 'slide' | 'fade' | 'none';
export type Backdrop = 'black' | 'dark' | 'white';

export interface ReaderPrefs {
  readingMode: ReadingMode;
  fit: FitMode;
  spread: boolean;
  coverAlone: boolean;
  transition: PageTransition;
  tapZones: boolean;
  backdrop: Backdrop;
  brightness: number;
  contrast: number;
  warmth: number;
  grayscale: boolean;
  invert: boolean;
  cropBorders: boolean;
  keepAwake: boolean;
  haptics: boolean;
  pageNumber: boolean;
  autoTurn: number;
}

export const SERIES_KEYS = ['readingMode', 'fit', 'spread'] as const;
type SeriesKey = (typeof SERIES_KEYS)[number];

export const DEFAULT_PREFS: ReaderPrefs = {
  readingMode: 'ltr',
  fit: 'screen',
  spread: false,
  coverAlone: true,
  transition: 'slide',
  tapZones: true,
  backdrop: 'black',
  brightness: 100,
  contrast: 100,
  warmth: 0,
  grayscale: false,
  invert: false,
  cropBorders: false,
  keepAwake: looksMobile,
  haptics: true,
  pageNumber: true,
  autoTurn: 0,
};

const GLOBAL_KEY = 'reader.prefs.v1';
const seriesStorageKey = (seriesId: string) => `reader.series.v1:${seriesId}`;

function read<T>(key: string): Partial<T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(key: string, value: object) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: prefs just won't persist */
  }
}

export function loadSeriesMemory(
  seriesId: string | null | undefined
): Partial<ReaderPrefs> {
  return seriesId ? read<ReaderPrefs>(seriesStorageKey(seriesId)) : {};
}

export function saveSeriesMemory(
  seriesId: string | null | undefined,
  patch: Partial<ReaderPrefs>
) {
  if (!seriesId) return;
  write(seriesStorageKey(seriesId), {
    ...loadSeriesMemory(seriesId),
    ...patch,
  });
}

/**
 * Reader preferences, persisted locally. Filters, comfort and behaviour
 * settings are global; reading mode, fit and spread stick to the series so a
 * manga and a western comic each open the way you last read them.
 */
export function useReaderPrefs(seriesId?: string | null) {
  const [global, setGlobal] = React.useState<Partial<ReaderPrefs>>(() =>
    read<ReaderPrefs>(GLOBAL_KEY)
  );
  const [remembered, setRemembered] = React.useState<Partial<ReaderPrefs>>(() =>
    loadSeriesMemory(seriesId)
  );

  React.useEffect(() => {
    setRemembered(loadSeriesMemory(seriesId));
  }, [seriesId]);

  const prefs = React.useMemo<ReaderPrefs>(
    () => ({ ...DEFAULT_PREFS, ...global, ...remembered }),
    [global, remembered]
  );

  const update = React.useCallback(
    (patch: Partial<ReaderPrefs>) => {
      const perSeries: Partial<ReaderPrefs> = {};
      const shared: Partial<ReaderPrefs> = {};
      for (const [key, value] of Object.entries(patch)) {
        const target =
          seriesId && (SERIES_KEYS as readonly string[]).includes(key)
            ? perSeries
            : shared;
        (target as Record<string, unknown>)[key as SeriesKey] = value;
      }
      if (Object.keys(perSeries).length > 0) {
        saveSeriesMemory(seriesId, perSeries);
        setRemembered((prev) => ({ ...prev, ...perSeries }));
      }
      if (Object.keys(shared).length > 0) {
        setGlobal((prev) => {
          const next = { ...prev, ...shared };
          write(GLOBAL_KEY, next);
          return next;
        });
      }
    },
    [seriesId]
  );

  const reset = React.useCallback(() => {
    write(GLOBAL_KEY, {});
    setGlobal({});
  }, []);

  return { prefs, update, reset, remembered };
}

import type { ReaderPrefs } from './readerPrefs.ts';

type FilterPrefs = Pick<
  ReaderPrefs,
  'brightness' | 'contrast' | 'warmth' | 'grayscale' | 'invert'
>;

export function hasReaderFilters(p: FilterPrefs): boolean {
  return (
    p.brightness !== 100 ||
    p.contrast !== 100 ||
    p.warmth > 0 ||
    p.grayscale ||
    p.invert
  );
}

/**
 * Screen-wide colour adjustments drawn *over* the pages (and under the UI):
 * brightness / contrast / grayscale / invert through `backdrop-filter`, and a
 * warm multiply layer for a blue-light "night" tint. Because it doesn't touch
 * the images themselves it works identically in every reading layout.
 */
export function ReaderFilterOverlay({
  prefs,
  className = 'z-4',
}: {
  prefs: FilterPrefs;
  className?: string;
}) {
  const filter = [
    prefs.brightness !== 100 && `brightness(${prefs.brightness / 100})`,
    prefs.contrast !== 100 && `contrast(${prefs.contrast / 100})`,
    prefs.grayscale && 'grayscale(1)',
    prefs.invert && 'invert(1)',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {filter && (
        <div
          aria-hidden
          className={`pointer-events-none fixed inset-0 ${className}`}
          style={{ backdropFilter: filter, WebkitBackdropFilter: filter }}
        />
      )}
      {prefs.warmth > 0 && (
        <div
          aria-hidden
          className={`pointer-events-none fixed inset-0 mix-blend-multiply ${className}`}
          style={{
            background: `rgb(255 150 60 / ${0.06 + prefs.warmth * 0.0046})`,
          }}
        />
      )}
    </>
  );
}

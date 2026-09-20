import * as React from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import CardWrapper from './CardWrapper.tsx';
import { GRID_CARD_CLASS } from './Card.tsx';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';

type BookOrSeries = DisplayBook | DisplaySeries;

// Mirrors Card.tsx's actual footprint: `w-3xs` (256px) + `m-2` (16px horizontal
// margin on each side), so the computed column count matches what the plain
// flex-wrap layout would have produced at the same container width.
const ITEM_SLOT_WIDTH = 288;

const NARROW_BREAKPOINT = 640;

// A rough initial guess for a row's height before it has been measured for
// real.
const ROW_HEIGHT_ESTIMATE = 420;

interface VirtualizedCardGridProps {
  items: BookOrSeries[];
  handleOpenDetails: (
    isBook: boolean,
    item: BookOrSeries,
    id: string | number
  ) => void;
  renderItem?: (item: BookOrSeries) => React.ReactNode;
  rowEstimate?: number;
}

const COMPACT_GAP = 14;

/**
 * Windowed replacement for the `.cards-list` + `.map(CardWrapper)` pattern.
 * Only renders the rows of cards currently near the viewport
 */
function VirtualizedCardGrid({
  items,
  handleOpenDetails,
  renderItem,
  rowEstimate,
}: VirtualizedCardGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [columns, setColumns] = React.useState(1);
  const [scrollMargin, setScrollMargin] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      setColumns(
        renderItem
          ? Math.max(2, Math.floor(width / 150))
          : width < NARROW_BREAKPOINT
            ? 2
            : Math.max(1, Math.floor(width / ITEM_SLOT_WIDTH))
      );
      setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [renderItem]);

  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowEstimate ?? ROW_HEIGHT_ESTIMATE,
    overscan: 3,
    scrollMargin,
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: virtualizer.getTotalSize(),
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const startIndex = virtualRow.index * columns;
        const rowItems = items.slice(startIndex, startIndex + columns);

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className={renderItem ? undefined : 'cards-list'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
              ...(renderItem && {
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: COMPACT_GAP,
                paddingBottom: COMPACT_GAP,
              }),
            }}
          >
            {rowItems.map((item, i) =>
              renderItem ? (
                <React.Fragment key={startIndex + i}>
                  {renderItem(item)}
                </React.Fragment>
              ) : (
                <CardWrapper
                  key={startIndex + i}
                  provider={item.provider_id}
                  handleOpenDetails={handleOpenDetails}
                  book={item}
                  type="book"
                  className={GRID_CARD_CLASS}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export default VirtualizedCardGrid;

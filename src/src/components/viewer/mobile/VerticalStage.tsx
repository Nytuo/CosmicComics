import * as React from 'react';
import { Spinner } from '@/components/ui/spinner.tsx';

const TAP_SLOP = 10;
const TAP_MAX_MS = 350;
const SCROLL_STEP = 0.85;
const EDGE_ZONE = 0.28;

export interface VerticalStageHandle {
  turn: (direction: 1 | -1) => void;
}

interface VerticalStageProps {
  pages: string[];
  initialIndex: number;
  onIndexChange: (index: number) => void;
  jump: { index: number; nonce: number } | null;
  tapZones: boolean;
  autoScroll: number;
  endSlide: React.ReactNode;
  onToggleChrome: () => void;
  handleRef?: React.Ref<VerticalStageHandle>;
}

/** Continuous top-to-bottom reading (webtoons, long-strip manhwa). */
export default function VerticalStage({
  pages,
  initialIndex,
  onIndexChange,
  jump,
  tapZones,
  autoScroll,
  endSlide,
  onToggleChrome,
  handleRef,
}: VerticalStageProps) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState<ReadonlySet<number>>(new Set());
  const pointer = React.useRef<{ x: number; y: number; at: number } | null>(
    null
  );
  const holding = React.useRef(false);

  const scrollToPage = React.useCallback((index: number, smooth = false) => {
    scroller.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({
        block: 'start',
        behavior: smooth ? 'smooth' : 'instant',
      });
  }, []);

  const turn = React.useCallback((direction: 1 | -1) => {
    const el = scroller.current;
    if (el) {
      el.scrollBy({
        top: direction * el.clientHeight * SCROLL_STEP,
        behavior: 'smooth',
      });
    }
  }, []);
  React.useImperativeHandle(handleRef, () => ({ turn }), [turn]);

  React.useLayoutEffect(() => {
    if (initialIndex > 0) scrollToPage(initialIndex);
    // Only on mount: later jumps go through `jump`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (jump) scrollToPage(jump.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.nonce]);

  React.useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIndexChange(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root, rootMargin: '-35% 0px -64% 0px' }
    );
    root.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages.length, onIndexChange]);

  React.useEffect(() => {
    const el = scroller.current;
    if (!el || autoScroll <= 0) return;
    let frame = 0;
    let last = performance.now();
    let position = el.scrollTop;
    let expected = position;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (Math.abs(el.scrollTop - expected) > 2) position = el.scrollTop;
      if (!holding.current) {
        position += (el.clientHeight / autoScroll) * (dt / 1000);
        el.scrollTop = position;
        expected = el.scrollTop;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll]);

  const onTap = (clientY: number) => {
    const el = scroller.current;
    if (!el) return;
    const ratio = (clientY - el.getBoundingClientRect().top) / el.clientHeight;
    if (tapZones && ratio < EDGE_ZONE) turn(-1);
    else if (tapZones && ratio > 1 - EDGE_ZONE) turn(1);
    else onToggleChrome();
  };

  return (
    <div
      ref={scroller}
      className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onPointerDown={(event) => {
        holding.current = true;
        pointer.current = {
          x: event.clientX,
          y: event.clientY,
          at: event.timeStamp,
        };
      }}
      onPointerUp={(event) => {
        holding.current = false;
        const start = pointer.current;
        pointer.current = null;
        if (
          start &&
          event.timeStamp - start.at <= TAP_MAX_MS &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) <=
            TAP_SLOP
        ) {
          onTap(event.clientY);
        }
      }}
      onPointerCancel={() => {
        holding.current = false;
        pointer.current = null;
      }}
    >
      {pages.map((src, i) => (
        <div
          key={src}
          data-index={i}
          className="relative w-full"
          style={{ minHeight: loaded.has(i) ? undefined : '60svh' }}
        >
          {!loaded.has(i) && (
            <div className="absolute inset-0 grid place-items-center">
              <Spinner className="size-6 text-white/50" />
            </div>
          )}
          <img
            src={src}
            alt=""
            loading={i <= initialIndex + 2 ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className="block h-auto w-full select-none"
            onLoad={() =>
              setLoaded((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
            }
          />
        </div>
      ))}
      <div
        data-index={pages.length}
        className="grid min-h-[85svh] place-items-center py-10"
      >
        {endSlide}
      </div>
    </div>
  );
}

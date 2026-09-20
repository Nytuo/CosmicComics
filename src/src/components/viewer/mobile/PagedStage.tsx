import * as React from 'react';
import { Spinner } from '@/components/ui/spinner.tsx';
import { prefetchCropped, useCroppedSrc } from '../shared/useCroppedSrc.ts';
import type { FitMode, PageTransition } from '../shared/readerPrefs.ts';
import { buildGroups, groupOf } from './spreads.ts';

interface Size {
  w: number;
  h: number;
}
interface Box {
  x: number;
  y: number;
  s: number;
}
type Gesture =
  | null
  | { kind: 'pending'; x: number; y: number; at: number }
  | { kind: 'swipe'; x: number; samples: { t: number; x: number }[] }
  | { kind: 'pan'; x: number; y: number }
  | {
      kind: 'pinch';
      dist: number;
      startScale: number;
      anchor: { x: number; y: number };
    };

const MAX_ZOOM = 5;
const DOUBLE_TAP_MS = 260;
const TAP_SLOP = 10;
const TAP_MAX_MS = 350;
const COMMIT_RATIO = 0.2;
const FLICK_VELOCITY = 0.45;
const ANIMATION_MS = 220;
const SIDE_ZONE = 0.3;
const PRELOAD_AHEAD = 3;
const PRELOAD_BEHIND = 2;

export interface PagedStageHandle {
  turn: (direction: 1 | -1) => void;
  resetZoom: () => void;
}

interface PagedStageProps {
  pages: string[];
  index: number;
  onIndexChange: (index: number) => void;
  rtl: boolean;
  fit: FitMode;
  transition: PageTransition;
  tapZones: boolean;
  cropBorders: boolean;
  spread: boolean;
  coverAlone: boolean;
  endSlide: React.ReactNode;
  onToggleChrome: () => void;
  onTurned?: () => void;
  onZoomChange?: (zoomed: boolean) => void;
  handleRef?: React.Ref<PagedStageHandle>;
}

function baseBox(
  size: Size,
  cw: number,
  ch: number,
  fit: FitMode,
  rtl: boolean,
  align: 'start' | 'end'
): Box {
  const s =
    fit === 'width'
      ? cw / size.w
      : fit === 'height'
        ? ch / size.h
        : Math.min(cw / size.w, ch / size.h);
  const w = size.w * s;
  const h = size.h * s;
  return {
    s,
    x: w <= cw ? (cw - w) / 2 : rtl ? cw - w : 0,
    y: h <= ch ? (ch - h) / 2 : align === 'end' ? ch - h : 0,
  };
}

function clampBox(box: Box, size: Size, cw: number, ch: number): Box {
  const w = size.w * box.s;
  const h = size.h * box.s;
  return {
    s: box.s,
    x: w <= cw ? (cw - w) / 2 : Math.min(0, Math.max(cw - w, box.x)),
    y: h <= ch ? (ch - h) / 2 : Math.min(0, Math.max(ch - h, box.y)),
  };
}

function PageImage({
  src,
  crop,
  box,
  smooth,
  onNatural,
}: {
  src: string;
  crop: boolean;
  box: { x: number; y: number; w: number; h: number } | null;
  smooth: boolean;
  onNatural: (size: Size) => void;
}) {
  const shown = useCroppedSrc(src, crop);
  return (
    <img
      src={shown ?? src}
      alt=""
      draggable={false}
      decoding="async"
      onLoad={(event) =>
        onNatural({
          w: event.currentTarget.naturalWidth,
          h: event.currentTarget.naturalHeight,
        })
      }
      className="pointer-events-none absolute top-0 left-0 max-w-none select-none"
      style={{
        width: box?.w,
        height: box?.h,
        transform: box ? `translate3d(${box.x}px, ${box.y}px, 0)` : undefined,
        visibility: box ? 'visible' : 'hidden',
        transition: smooth
          ? 'transform 250ms ease-out, width 250ms ease-out, height 250ms ease-out'
          : 'none',
      }}
    />
  );
}

function Slide({
  srcs,
  crop,
  block,
  pageSizes,
  smooth,
  onNatural,
}: {
  srcs: { page: number; src: string }[];
  crop: boolean;
  block: (Box & Size) | null;
  pageSizes: (Size | undefined)[];
  smooth: boolean;
  onNatural: (page: number, size: Size) => void;
}) {
  let cursor = 0;
  return (
    <>
      {!block && (
        <div className="absolute inset-0 grid place-items-center">
          <Spinner className="size-6 text-white/60" />
        </div>
      )}
      {srcs.map(({ page, src }, at) => {
        const natural = pageSizes[at];
        let box = null;
        if (block && natural) {
          const width = natural.w * (block.h / natural.h);
          box = {
            x: block.x + cursor * block.s,
            y: block.y,
            w: width * block.s,
            h: block.h * block.s,
          };
          cursor += width;
        }
        return (
          <PageImage
            key={page}
            src={src}
            crop={crop}
            box={box}
            smooth={smooth}
            onNatural={(size) => onNatural(page, size)}
          />
        );
      })}
    </>
  );
}

export default function PagedStage({
  pages,
  index: page,
  onIndexChange,
  rtl,
  fit,
  transition,
  tapZones,
  cropBorders,
  spread,
  coverAlone,
  endSlide,
  onToggleChrome,
  onTurned,
  onZoomChange,
  handleRef,
}: PagedStageProps) {
  const host = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const [container, setContainer] = React.useState({ w: 0, h: 0 });
  const [pageSizes, setPageSizes] = React.useState<Record<number, Size>>({});
  const [view, setView] = React.useState<(Box & { index: number }) | null>(
    null
  );
  const [offset, setOffset] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);
  const [smooth, setSmooth] = React.useState(false);

  const groups = React.useMemo(
    () => buildGroups(pages.length, spread, coverAlone),
    [pages.length, spread, coverAlone]
  );
  const total = groups.length;
  const index = groupOf(groups, page);
  const dir = rtl ? -1 : 1;
  const [arrival, setArrival] = React.useState<{
    index: number;
    align: 'start' | 'end';
  }>({ index, align: 'start' });

  const sizes = React.useMemo(() => {
    const result: Record<number, Size> = {};
    groups.forEach((group, g) => {
      const known = group.map((p) => pageSizes[p]);
      if (known.some((size) => !size)) return;
      const height = Math.max(...known.map((size) => size!.h));
      result[g] = {
        h: height,
        w: known.reduce((sum, size) => sum + size!.w * (height / size!.h), 0),
      };
    });
    return result;
  }, [groups, pageSizes]);

  if (arrival.index !== index) {
    setArrival({ index, align: index < arrival.index ? 'end' : 'start' });
  }

  React.useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      setContainer({ w: el.clientWidth, h: el.clientHeight });
      setView(null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const boxFor = React.useCallback(
    (i: number): (Box & Size) | null => {
      const size = sizes[i];
      if (!size || container.w === 0) return null;
      if (i === index && view?.index === index) {
        return { x: view.x, y: view.y, s: view.s, ...size };
      }
      const align = i === index ? arrival.align : i < index ? 'end' : 'start';
      return {
        ...baseBox(size, container.w, container.h, fit, rtl, align),
        ...size,
      };
    },
    [sizes, container, index, view, arrival.align, fit, rtl]
  );

  const current = boxFor(index);
  const baseScale = React.useMemo(() => {
    const size = sizes[index];
    return size && container.w
      ? baseBox(size, container.w, container.h, fit, rtl, 'start').s
      : 1;
  }, [sizes, index, container, fit, rtl]);
  const zoomed = !!current && current.s > baseScale * 1.04;

  React.useEffect(() => {
    onZoomChange?.(zoomed);
  }, [zoomed, onZoomChange]);

  React.useEffect(() => {
    for (let g = index - PRELOAD_BEHIND; g <= index + PRELOAD_AHEAD; g++) {
      if (g === index) continue;
      for (const p of groups[g] ?? []) {
        if (cropBorders) prefetchCropped(pages[p]);
        else new Image().src = pages[p];
      }
    }
  }, [index, groups, pages, cropBorders]);

  const fadeNext = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!fadeNext.current) return;
    fadeNext.current = false;
    track.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 180,
      easing: 'ease-out',
    });
  }, [index]);

  const latest = React.useRef({
    index,
    total,
    container,
    current,
    baseScale,
    sizes,
  });
  latest.current = { index, total, container, current, baseScale, sizes };

  const commitView = React.useCallback((box: Box, animate = false) => {
    const { index: at, container: c, sizes: all } = latest.current;
    const size = all[at];
    if (!size) return;
    if (animate) {
      setSmooth(true);
      window.setTimeout(() => setSmooth(false), 280);
    }
    setView({ ...clampBox(box, size, c.w, c.h), index: at });
  }, []);

  const toPage = React.useCallback(
    (group: number) =>
      group >= groups.length ? pages.length : groups[group][0],
    [groups, pages.length]
  );

  const finishTurn = React.useCallback(
    (target: number, animated: boolean) => {
      const { total: n, container: c } = latest.current;
      const clamped = Math.max(0, Math.min(n, target));
      if (clamped === latest.current.index) {
        setAnimating(true);
        setOffset(0);
        window.setTimeout(() => setAnimating(false), ANIMATION_MS);
        return;
      }
      onTurned?.();
      if (!animated || transition !== 'slide') {
        fadeNext.current = transition === 'fade';
        setOffset(0);
        setAnimating(false);
        onIndexChange(toPage(clamped));
        return;
      }
      setAnimating(true);
      setOffset(-Math.sign(clamped - latest.current.index) * dir * c.w);
      window.setTimeout(() => {
        setAnimating(false);
        setOffset(0);
        onIndexChange(toPage(clamped));
      }, ANIMATION_MS);
    },
    [dir, onIndexChange, onTurned, transition, toPage]
  );

  const turn = React.useCallback(
    (direction: 1 | -1) => {
      if (animating) return;
      const {
        current: box,
        container: c,
        index: at,
        sizes: all,
      } = latest.current;
      const size = all[at];
      if (box && size) {
        const h = size.h * box.s;
        if (h > c.h + 2) {
          const minY = c.h - h;
          const step = c.h * 0.85;
          if (direction === 1 && box.y > minY + 2) {
            commitView({ ...box, y: box.y - step }, true);
            return;
          }
          if (direction === -1 && box.y < -2) {
            commitView({ ...box, y: box.y + step }, true);
            return;
          }
        }
      }
      finishTurn(at + direction, true);
    },
    [animating, commitView, finishTurn]
  );

  const resetZoom = React.useCallback(() => setView(null), []);
  React.useImperativeHandle(handleRef, () => ({ turn, resetZoom }), [
    turn,
    resetZoom,
  ]);

  const zoomAt = React.useCallback(
    (px: number, py: number, nextScale: number, animate: boolean) => {
      const { current: box, baseScale: base } = latest.current;
      if (!box) return;
      const s = Math.max(base, Math.min(base * MAX_ZOOM, nextScale));
      const anchor = { x: (px - box.x) / box.s, y: (py - box.y) / box.s };
      commitView({ s, x: px - anchor.x * s, y: py - anchor.y * s }, animate);
    },
    [commitView]
  );

  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<Gesture>(null);
  const lastTap = React.useRef<{ t: number; x: number; y: number } | null>(
    null
  );
  const chromeTimer = React.useRef<number | undefined>(undefined);
  const settings = React.useRef({ tapZones, rtl });
  settings.current = { tapZones, rtl };

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const rect = host.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
  };

  const onTap = (event: React.PointerEvent) => {
    const { x, y, rect } = localPoint(event);
    const { tapZones: zones, rtl: reversed } = settings.current;
    const { current: box, baseScale: base, container: c } = latest.current;
    const isZoomed = !!box && box.s > base * 1.04;
    const ratio = x / rect.width;
    const inCenter = ratio > SIDE_ZONE && ratio < 1 - SIDE_ZONE;
    const now = event.timeStamp;
    const previous = lastTap.current;

    if (
      previous &&
      now - previous.t < DOUBLE_TAP_MS &&
      Math.hypot(x - previous.x, y - previous.y) < 40 &&
      (isZoomed || inCenter || !zones)
    ) {
      window.clearTimeout(chromeTimer.current);
      lastTap.current = null;
      if (isZoomed) {
        const size = latest.current.sizes[latest.current.index];
        if (size) {
          commitView(baseBox(size, c.w, c.h, fit, reversed, 'start'), true);
        }
      } else {
        zoomAt(x, y, base * 2.5, true);
      }
      return;
    }

    lastTap.current = { t: now, x, y };
    if (!zones || isZoomed || inCenter) {
      window.clearTimeout(chromeTimer.current);
      chromeTimer.current = window.setTimeout(onToggleChrome, DOUBLE_TAP_MS);
      return;
    }
    const forward = reversed ? ratio < 0.5 : ratio > 0.5;
    turn(forward ? 1 : -1);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (animating) return;
    host.current?.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size === 1) {
      gesture.current = {
        kind: 'pending',
        x: event.clientX,
        y: event.clientY,
        at: event.timeStamp,
      };
      return;
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const { current: box } = latest.current;
      if (!box) return;
      if (gesture.current?.kind === 'swipe') setOffset(0);
      const rect = host.current!.getBoundingClientRect();
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      gesture.current = {
        kind: 'pinch',
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startScale: box.s,
        anchor: { x: (midX - box.x) / box.s, y: (midY - box.y) / box.s },
      };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const known = pointers.current.get(event.pointerId);
    if (!known) return;
    const dx = event.clientX - known.x;
    const dy = event.clientY - known.y;
    known.x = event.clientX;
    known.y = event.clientY;
    const g = gesture.current;
    if (!g) return;
    const {
      current: box,
      container: c,
      sizes: all,
      index: at,
      total: n,
    } = latest.current;
    const size = all[at];

    if (g.kind === 'pinch' && pointers.current.size >= 2 && box) {
      const [a, b] = [...pointers.current.values()];
      const rect = host.current!.getBoundingClientRect();
      const midX = (a.x + b.x) / 2 - rect.left;
      const midY = (a.y + b.y) / 2 - rect.top;
      const s = Math.max(
        latest.current.baseScale * 0.85,
        Math.min(
          latest.current.baseScale * MAX_ZOOM,
          (g.startScale * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist
        )
      );
      setView({
        index: at,
        s,
        x: midX - g.anchor.x * s,
        y: midY - g.anchor.y * s,
      });
      return;
    }

    if (g.kind === 'pending') {
      if (Math.hypot(event.clientX - g.x, event.clientY - g.y) <= TAP_SLOP)
        return;
      const totalX = event.clientX - g.x;
      const totalY = event.clientY - g.y;
      window.clearTimeout(chromeTimer.current);
      const wide = !!box && !!size && size.w * box.s > c.w + 1;
      const tall = !!box && !!size && size.h * box.s > c.h + 1;
      const horizontal = Math.abs(totalX) >= Math.abs(totalY);
      let canPanX = false;
      if (horizontal && wide && box && size) {
        const atLeft = box.x >= -1;
        const atRight = box.x <= c.w - size.w * box.s + 1;
        canPanX = totalX > 0 ? !atLeft : !atRight;
      }
      if (horizontal && !canPanX) {
        gesture.current = {
          kind: 'swipe',
          x: g.x,
          samples: [{ t: event.timeStamp, x: event.clientX }],
        };
        setOffset(totalX);
      } else if ((horizontal && canPanX) || (!horizontal && tall)) {
        gesture.current = { kind: 'pan', x: event.clientX, y: event.clientY };
      } else {
        gesture.current = null;
      }
      return;
    }

    if (g.kind === 'swipe') {
      const raw = event.clientX - g.x;
      const towardsNext = raw * dir < 0;
      const blocked = towardsNext ? at >= n : at <= 0;
      g.samples.push({ t: event.timeStamp, x: event.clientX });
      if (g.samples.length > 5) g.samples.shift();
      setOffset(blocked ? raw * 0.25 : raw);
      return;
    }

    if (g.kind === 'pan' && box && size) {
      commitView({ ...box, x: box.x + dx, y: box.y + dy });
    }
  };

  const release = (event: React.PointerEvent, cancelled: boolean) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const g = gesture.current;

    if (g?.kind === 'pinch') {
      const remaining = [...pointers.current.values()][0];
      const { current: box, baseScale: base } = latest.current;
      if (box && box.s < base * 1.04) {
        setView(null);
        gesture.current = null;
      } else if (remaining) {
        gesture.current = { kind: 'pan', x: remaining.x, y: remaining.y };
      } else {
        gesture.current = null;
      }
      return;
    }
    if (pointers.current.size > 0) return;
    gesture.current = null;

    if (g?.kind === 'pending' && !cancelled) {
      if (event.timeStamp - g.at <= TAP_MAX_MS) onTap(event);
      return;
    }
    if (g?.kind === 'swipe') {
      const { container: c, index: at } = latest.current;
      const first = g.samples[0];
      const last = g.samples[g.samples.length - 1];
      const velocity =
        last && first && last.t > first.t
          ? (last.x - first.x) / (last.t - first.t)
          : 0;
      const flick = Math.abs(velocity) > FLICK_VELOCITY;
      const moved = event.clientX - g.x;
      const commit =
        !cancelled && (flick || Math.abs(moved) > c.w * COMMIT_RATIO);
      const direction = (flick ? velocity : moved) * dir < 0 ? 1 : -1;
      finishTurn(commit ? at + direction : at, true);
    }
  };

  const wheelBudget = React.useRef(0);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const { current: box, baseScale: base } = latest.current;
      if (!box) return;
      if (event.ctrlKey) {
        zoomAt(
          event.clientX - rect.left,
          event.clientY - rect.top,
          box.s * Math.exp(-event.deltaY * 0.01),
          false
        );
        return;
      }
      if (box.s > base * 1.04) {
        commitView({
          ...box,
          x: box.x - event.deltaX,
          y: box.y - event.deltaY,
        });
        return;
      }
      wheelBudget.current += event.deltaY + event.deltaX;
      if (Math.abs(wheelBudget.current) > 70) {
        const direction = wheelBudget.current > 0 ? 1 : -1;
        wheelBudget.current = 0;
        turn(direction);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [commitView, turn, zoomAt]);

  React.useEffect(() => () => window.clearTimeout(chromeTimer.current), []);

  const slides = [index - 1, index, index + 1].filter(
    (i) => i >= 0 && i <= total && (i < total || endSlide)
  );

  return (
    <div
      ref={host}
      className="absolute inset-0 touch-none overflow-hidden select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => release(event, false)}
      onPointerCancel={(event) => release(event, true)}
    >
      <div
        ref={track}
        className="absolute inset-0"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: animating
            ? `transform ${ANIMATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
            : 'none',
        }}
      >
        {slides.map((i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              transform: `translate3d(${(i - index) * dir * container.w}px, 0, 0)`,
            }}
          >
            {i === total ? (
              <div className="grid size-full place-items-center overflow-y-auto">
                {endSlide}
              </div>
            ) : (
              <Slide
                srcs={(rtl ? [...groups[i]].reverse() : groups[i]).map((p) => ({
                  page: p,
                  src: pages[p],
                }))}
                crop={cropBorders}
                block={boxFor(i)}
                pageSizes={(rtl ? [...groups[i]].reverse() : groups[i]).map(
                  (p) => pageSizes[p]
                )}
                smooth={smooth && i === index}
                onNatural={(p, size) =>
                  setPageSizes((prev) =>
                    prev[p]?.w === size.w && prev[p]?.h === size.h
                      ? prev
                      : { ...prev, [p]: size }
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

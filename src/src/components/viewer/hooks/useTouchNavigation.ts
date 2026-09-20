import * as React from 'react';

const SWIPE_MIN_DISTANCE = 50;
const TAP_MAX_DISTANCE = 12;
const TAP_MAX_MS = 350;
const EDGE_ZONE = 0.28;

const IGNORED =
  'button, a, input, textarea, select, header, [role="dialog"], [role="menu"], [role="slider"], [data-radix-popper-content-wrapper]';

interface Options {
  enabled: boolean;
  continuous: boolean;
  onNext: () => void;
  onPrev: () => void;
  onToggleBar: () => void;
}

export function useTouchNavigation({
  enabled,
  continuous,
  onNext,
  onPrev,
  onToggleBar,
}: Options) {
  const handlers = React.useRef({ onNext, onPrev, onToggleBar, continuous });
  handlers.current = { onNext, onPrev, onToggleBar, continuous };

  React.useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; at: number; ignored: boolean } | null =
      null;

    const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.02;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const touch = event.touches[0];
      const target = event.target as Element | null;
      start = {
        x: touch.clientX,
        y: touch.clientY,
        at: Date.now(),
        ignored: !!target?.closest?.(IGNORED) || zoomed(),
      };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const began = start;
      start = null;
      if (!began || began.ignored || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - began.x;
      const dy = touch.clientY - began.y;
      const { onNext, onPrev, onToggleBar, continuous } = handlers.current;

      if (
        Math.abs(dx) >= SWIPE_MIN_DISTANCE &&
        Math.abs(dx) > Math.abs(dy) * 1.5
      ) {
        if (continuous) return;
        if (dx < 0) onNext();
        else onPrev();
        return;
      }

      const isTap =
        Math.hypot(dx, dy) <= TAP_MAX_DISTANCE &&
        Date.now() - began.at <= TAP_MAX_MS;
      if (!isTap) return;
      const ratio = touch.clientX / window.innerWidth;
      if (!continuous && ratio < EDGE_ZONE) onPrev();
      else if (!continuous && ratio > 1 - EDGE_ZONE) onNext();
      else onToggleBar();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled]);
}

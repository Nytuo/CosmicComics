import * as React from 'react';
import { cn } from '@/lib/utils.ts';

interface ScrubberProps {
  value: number;
  max: number;
  reversed: boolean;
  onPreview: (index: number | null) => void;
  onCommit: (index: number) => void;
  label: string;
}

/**
 * Thumb-friendly page scrubber: a 44px touch target around a slim track.
 * Dragging previews the target page; lifting the finger jumps there.
 */
export default function Scrubber({
  value,
  max,
  reversed,
  onPreview,
  onCommit,
  label,
}: ScrubberProps) {
  const track = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState<number | null>(null);

  const indexAt = (clientX: number) => {
    const rect = track.current!.getBoundingClientRect();
    const raw = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round((reversed ? 1 - raw : raw) * max);
  };

  const shown = dragging ?? value;
  const ratio = max > 0 ? shown / max : 0;
  const position = (reversed ? 1 - ratio : ratio) * 100;

  return (
    <div
      ref={track}
      role="slider"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={max + 1}
      aria-valuenow={shown + 1}
      tabIndex={0}
      className="relative flex h-11 touch-none items-center select-none"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const next = indexAt(event.clientX);
        setDragging(next);
        onPreview(next);
      }}
      onPointerMove={(event) => {
        if (dragging === null) return;
        const next = indexAt(event.clientX);
        setDragging(next);
        onPreview(next);
      }}
      onPointerUp={(event) => {
        if (dragging === null) return;
        const next = indexAt(event.clientX);
        setDragging(null);
        onPreview(null);
        onCommit(next);
      }}
      onPointerCancel={() => {
        setDragging(null);
        onPreview(null);
      }}
      onKeyDown={(event) => {
        const step =
          event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (step)
          onCommit(
            Math.min(max, Math.max(0, value + (reversed ? -step : step)))
          );
      }}
    >
      <div className="h-1 w-full rounded-full bg-white/25">
        <div
          className={cn(
            'h-full rounded-full bg-secondary',
            reversed && 'ml-auto'
          )}
          style={{ width: `${reversed ? 100 - position : position}%` }}
        />
      </div>
      <div
        className={cn(
          'absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform',
          dragging !== null && 'scale-125'
        )}
        style={{ left: `${position}%` }}
      />
    </div>
  );
}

import { cn } from '@/lib/utils.ts';

/**
 * Thin reading-progress line along the bottom edge. It grows under the
 * pointer and doubles as a seek bar (click anywhere to jump).
 */
export default function ViewerProgressBar({
  page,
  lastIndex,
  reversed,
  onSeek,
}: {
  page: number;
  lastIndex: number;
  reversed: boolean;
  onSeek: (page: number) => void;
}) {
  if (lastIndex <= 0) return null;
  const ratio = Math.min(1, (page + 1) / (lastIndex + 1));

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={lastIndex + 1}
      aria-valuenow={page + 1}
      className="group fixed inset-x-0 bottom-0 z-6 flex h-3 cursor-pointer items-end"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const raw = (event.clientX - rect.left) / rect.width;
        onSeek(Math.round((reversed ? 1 - raw : raw) * lastIndex));
      }}
    >
      <div className="h-0.5 w-full bg-white/10 transition-all group-hover:h-2">
        <div
          className={cn('h-full bg-secondary', reversed && 'ml-auto')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

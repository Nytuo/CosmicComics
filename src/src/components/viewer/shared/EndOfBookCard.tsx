import { CheckCircle2, Library, RotateCcw, StepForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { resolveImageUrl } from '@/utils/imageUrl.ts';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';

interface EndOfBookCardProps {
  title: string;
  next: DisplayBook | null;
  onNext: () => void;
  onExit: () => void;
  onReadAgain?: () => void;
}

/** "You finished it" panel with a one-tap jump to the next volume of the series. */
export default function EndOfBookCard({
  title,
  next,
  onNext,
  onExit,
  onReadAgain,
}: EndOfBookCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5 px-6 text-center">
      <CheckCircle2 className="size-14 text-green-400" />
      <div>
        <p className="text-xl font-semibold">{t('reader_finished')}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {title}
        </p>
      </div>

      {next && (
        <button
          type="button"
          onClick={onNext}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/70 p-3 text-left transition-transform active:scale-[0.98]"
        >
          <img
            src={resolveImageUrl(next.cover_url)}
            alt=""
            className="h-20 w-14 shrink-0 rounded-lg object-cover"
            onError={(event) => {
              event.currentTarget.src = '/Images/fileDefault.png';
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">
              {t('reader_next_volume')}
            </span>
            <span className="line-clamp-2 text-sm font-semibold">
              {next.title}
            </span>
          </span>
          <StepForward className="size-5 shrink-0" />
        </button>
      )}

      <div className="flex w-full flex-col gap-2">
        <Button
          variant={next ? 'outline' : 'default'}
          className="h-11 rounded-full"
          onClick={onExit}
        >
          <Library className="size-4" />
          {t('go_back')}
        </Button>
        {onReadAgain && (
          <Button
            variant="ghost"
            className="h-10 rounded-full text-muted-foreground"
            onClick={onReadAgain}
          >
            <RotateCcw className="size-4" />
            {t('reader_read_again')}
          </Button>
        )}
      </div>
    </div>
  );
}

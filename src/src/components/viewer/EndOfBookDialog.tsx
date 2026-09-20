import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import EndOfBookCard from './shared/EndOfBookCard.tsx';
import { openBookInReader } from './shared/useBookContext.ts';

/** Shown when the reader tries to go past the last page of a book. */
export default function EndOfBookDialog({
  open,
  onOpenChange,
  title,
  next,
  onReadAgain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  next: DisplayBook | null;
  onReadAgain: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t('reader_finished')}</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <EndOfBookCard
            title={title}
            next={next}
            onNext={() => next && openBookInReader(next)}
            onExit={() => {
              window.location.href = '/collectionner';
            }}
            onReadAgain={() => {
              onOpenChange(false);
              onReadAgain();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

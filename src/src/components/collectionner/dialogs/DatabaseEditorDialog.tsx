import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook';
import DatabaseEditorSkeleton from './DatabaseEditorSkeleton.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';

type BookOrSeries = DisplayBook | DisplaySeries;

export default function DatabaseEditorDialog({
  onClose,
  openModal,
  TheBook,
  type,
  onSuccess,
}: {
  onClose: any;
  openModal: boolean;
  TheBook: BookOrSeries;
  type: 'series' | 'book';
  onSuccess?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [send, setSend] = React.useState(false);

  const handleClose = async () => {
    setSend(false);
    onClose();
  };

  const handleSave = async () => {
    setSend(true);
    setTimeout(async () => {
      if (onSuccess) await onSuccess();
      await handleClose();
    }, 500);
  };

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:w-150">
        <DialogHeader>
          <DialogTitle>{t('EDIT')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <DatabaseEditorSkeleton
            TheBook={TheBook}
            type={type}
            providerId={TheBook.provider_id}
            triggerSend={send}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave}>{t('send')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

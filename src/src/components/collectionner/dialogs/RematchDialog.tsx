import { useTranslation } from 'react-i18next';
import RematchSkeleton from './RematchSkeleton.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';

export default function RematchDialog({
  onClose,
  openModal,
  provider,
  type,
  oldID,
  onSuccess,
}: {
  onClose: any;
  openModal: boolean;
  provider: any;
  type: 'book' | 'series';
  oldID: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:w-200 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('rematchTitle')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RematchSkeleton
            provider={provider}
            type={type}
            oldID={oldID}
            onSuccess={onSuccess}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

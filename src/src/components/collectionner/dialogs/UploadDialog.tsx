import { useTranslation } from 'react-i18next';
import { ToasterHandler } from '../../common/ToasterHandler.tsx';
import { open } from '@tauri-apps/plugin-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';

export default function UploadDialog({
  onClose,
  openModal,
}: {
  onClose: any;
  openModal: boolean;
}) {
  const { t } = useTranslation();

  async function selectAndOpen(): Promise<void> {
    try {
      const selected = await open({
        multiple: false,
        title: t('open_file'),
        filters: [
          {
            name: 'Comics',
            extensions: [
              'cbz',
              'cbr',
              'cbt',
              'zip',
              'rar',
              '7z',
              'epub',
              'pdf',
            ],
          },
        ],
      });

      if (selected) {
        localStorage.setItem('currentBook', selected);
        window.location.href = '/viewer';
      } else {
        ToasterHandler(t('Failedtoloadfile'), 'error');
      }
    } catch (error) {
      ToasterHandler(t('Failedtoloadfile'), 'error');
      console.error(error);
    }
  }

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:w-150">
        <DialogHeader>
          <DialogTitle>{t('open_file')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{t('open_file')}</p>
          <Button onClick={selectAndOpen}>{t('open_file')}</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

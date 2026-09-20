import * as React from 'react';
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
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import * as TauriAPI from '@/API/TauriAPI';
import { usePlatform } from '@/hooks/use-platform.ts';

const DESKTOP_EXTENSIONS = [
  'cbz',
  'cbr',
  'cb7',
  'cbt',
  'zip',
  'rar',
  '7z',
  'tar',
  'epub',
  'pdf',
];
const MOBILE_EXTENSIONS = [
  'cbz',
  'cbr',
  'cb7',
  'cbt',
  'zip',
  'rar',
  '7z',
  'tar',
];

export default function UploadDialog({
  onClose,
  openModal,
  onImported,
}: {
  onClose: any;
  openModal: boolean;
  onImported?: () => void;
}) {
  const { t } = useTranslation();
  const platform = usePlatform();
  const [series, setSeries] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function selectAndOpen(): Promise<void> {
    try {
      const selected = await open({
        multiple: false,
        title: t('open_file'),
        filters: [{ name: 'Comics', extensions: DESKTOP_EXTENSIONS }],
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

  async function pickAndImport(): Promise<void> {
    try {
      const picked = await open({
        multiple: true,
        title: t('import_files'),
        filters: [{ name: 'Comics', extensions: MOBILE_EXTENSIONS }],
      });
      const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
      if (paths.length === 0) return;

      setBusy(true);
      const result = await TauriAPI.importLocalFiles(
        paths,
        series.trim() || undefined
      );
      if (result.imported.length > 0) {
        await TauriAPI.scanAllLibraries();
        ToasterHandler(
          t('import_done', { count: result.imported.length }),
          'success'
        );
      }
      if (result.failed.length > 0) {
        ToasterHandler(
          t('import_failed', {
            count: result.failed.length,
            first: `${result.failed[0].name}: ${result.failed[0].error}`,
          }),
          'error'
        );
      }
      if (result.imported.length > 0) {
        setSeries('');
        onClose();
        onImported?.();
      }
    } catch (error) {
      ToasterHandler(`${t('Failedtoloadfile')} ${String(error)}`, 'error');
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={openModal}
      onOpenChange={(isOpen) => {
        if (!isOpen && !busy) onClose();
      }}
    >
      <DialogContent className="sm:w-150">
        <DialogHeader>
          <DialogTitle>
            {platform.local_import ? t('import_files') : t('open_file')}
          </DialogTitle>
        </DialogHeader>
        {platform.local_import ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              {t('import_files_desc')}
            </p>
            <Input
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder={t('import_series_placeholder')}
              disabled={busy}
            />
            <Button className="w-full" onClick={pickAndImport} disabled={busy}>
              {busy && <Spinner className="mr-2" />}
              {t('import_files')}
            </Button>
          </div>
        ) : (
          <div className="py-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{t('open_file')}</p>
            <Button onClick={selectAndOpen}>{t('open_file')}</Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

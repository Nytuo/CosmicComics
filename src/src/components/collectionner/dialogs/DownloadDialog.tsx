import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as TauriAPI from '@/API/TauriAPI';
import { ToasterHandler } from '../../common/ToasterHandler.tsx';
import Logger from '@/logger.ts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Progress } from '@/components/ui/progress.tsx';

export default function DownloadDialog({
  onClose,
  openModal,
  onDownloadComplete,
}: {
  onClose: any;
  openModal: boolean;
  onDownloadComplete?: () => void;
}) {
  const { t } = useTranslation();
  const [downloadStarted, setDownloadStarted] = React.useState(false);
  const [downloadPath, setDownloadPath] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [progressMessage, setProgressMessage] = React.useState('');
  const nameRef = React.useRef<HTMLInputElement>(null);
  const volRef = React.useRef<HTMLInputElement>(null);
  const urlRef = React.useRef<HTMLInputElement>(null);
  const progressIntervalRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  async function downloader(): Promise<void> {
    const url = urlRef.current?.value ?? '';
    const name = nameRef.current?.value ?? '';
    const vol = volRef.current?.value ?? '1';

    if (!url || !name) {
      ToasterHandler(t('please-fill-in-all-required-fields'), 'error');
      return;
    }

    setDownloadStarted(true);
    setDownloadPath(null);
    setProgress(0);
    setProgressMessage(t('starting-download'));

    progressIntervalRef.current = window.setInterval(async () => {
      try {
        const progressData = await TauriAPI.getProgress('download');
        if (progressData) {
          const percentage = parseInt(progressData.percentage) || 0;
          setProgress(percentage);
          setProgressMessage(progressData.current_file || '');
        }
      } catch (err) {
        Logger.error(`Error getting progress: ${err}`);
      }
    }, 500);

    try {
      const path = await TauriAPI.downloadBookFromUrl(url, name, vol);
      ToasterHandler(t('downloaded'), 'success');
      setDownloadPath(path);
      setProgress(100);
      onDownloadComplete?.();
    } catch (err) {
      ToasterHandler(t('download-failed'), 'error');
      Logger.error(err);
    } finally {
      setDownloadStarted(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }

  function OpenDownloadDir() {
    if (downloadPath) {
      localStorage.setItem('currentBook', downloadPath);
      window.location.href = '/viewer';
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
          <DialogTitle>{t('Downloader')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-destructive">{t('downloaderSpeech')}</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dl-name">{t('nameOfTheSeries')}</Label>
              <Input id="dl-name" ref={nameRef} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dl-vol">{t('chapterVolume')}</Label>
              <Input id="dl-vol" ref={volRef} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dl-url">{t('url')}</Label>
              <Input id="dl-url" ref={urlRef} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <Button onClick={() => downloader()} disabled={downloadStarted}>
              {downloadStarted ? t('loading') + '...' : t('startDownload')}
            </Button>
            {downloadStarted && (
              <div className="space-y-2">
                <Progress value={progress} className="mt-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progressMessage}
                </p>
              </div>
            )}
            {downloadPath && (
              <Button variant="outline" onClick={() => OpenDownloadDir()}>
                {t('openDL')}
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('back')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

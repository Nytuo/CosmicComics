import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import * as TauriAPI from '@/API/TauriAPI.ts';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import Logger from '@/logger.ts';
import MarvelUnlimitedDownloader from './MarvelUnlimitedDownloader.tsx';
import MangaDexDownloader from './MangaDexDownloader.tsx';
import GetComicsDownloader from './GetComicsDownloader.tsx';
import DCInfiniteDownloader from './DCInfiniteDownloader.tsx';
import VizDownloader from './VizDownloader.tsx';

function UrlDownloaderTab() {
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
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
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
          setProgress(parseInt(progressData.percentage) || 0);
          setProgressMessage(progressData.current_file || '');
        }
      } catch (err) {
        Logger.error(`Error getting progress: ${err}`);
      }
    }, 500);

    try {
      const path = await TauriAPI.downloadBookFromUrl(url, name, vol);
      ToasterHandler(t('downloaded-successfully'), 'success');
      setDownloadPath(path);
      setProgress(100);
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

  function openInViewer() {
    if (downloadPath) {
      localStorage.setItem('currentBook', downloadPath);
      window.location.href = '/viewer';
    }
  }

  return (
    <div className="max-w-lg space-y-4 py-4">
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
      <div className="space-y-2">
        <Button onClick={() => downloader()} disabled={downloadStarted}>
          {downloadStarted ? t('loading') + '...' : t('startDownload')}
        </Button>
        {downloadStarted && (
          <div className="space-y-2">
            <Progress value={progress} className="mt-2" />
            <p className="text-sm text-muted-foreground">{progressMessage}</p>
          </div>
        )}
        {downloadPath && (
          <Button variant="outline" onClick={openInViewer}>
            {t('openDL')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DownloadersWrapperPage({
  CosmicComicsTemp,
}: {
  CosmicComicsTemp: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="w-full space-y-4">
      <h1 className="text-2xl font-bold">{t('downloaders')}</h1>
      <Tabs defaultValue="marvel">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="marvel">Marvel Unlimited</TabsTrigger>
          <TabsTrigger value="mangadex">MangaDex</TabsTrigger>
          <TabsTrigger value="getcomics">GetComics</TabsTrigger>
          <TabsTrigger value="dc">DC Infinite</TabsTrigger>
          <TabsTrigger value="viz">VIZ Media</TabsTrigger>
          <TabsTrigger value="url">{t('URL Downloader')}</TabsTrigger>
        </TabsList>

        <TabsContent value="marvel">
          <MarvelUnlimitedDownloader CosmicComicsTemp={CosmicComicsTemp} />
        </TabsContent>
        <TabsContent value="mangadex">
          <MangaDexDownloader CosmicComicsTemp={CosmicComicsTemp} />
        </TabsContent>
        <TabsContent value="getcomics">
          <GetComicsDownloader CosmicComicsTemp={CosmicComicsTemp} />
        </TabsContent>
        <TabsContent value="dc">
          <DCInfiniteDownloader CosmicComicsTemp={CosmicComicsTemp} />
        </TabsContent>
        <TabsContent value="viz">
          <VizDownloader CosmicComicsTemp={CosmicComicsTemp} />
        </TabsContent>
        <TabsContent value="url">
          <UrlDownloaderTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

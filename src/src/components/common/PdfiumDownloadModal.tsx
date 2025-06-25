import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';

type Phase = 'checking' | 'idle' | 'downloading' | 'done' | 'error';
type DownloadStage = 'downloading' | 'extracting' | 'done';

interface ProgressPayload {
  stage: DownloadStage;
  downloaded: number;
  total: number;
  percentage: number;
}

interface PlatformInfo {
  os: string;
  arch: string;
  archive: string;
  lib_file: string;
  url: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function PdfiumDownloadModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('checking');
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [downloadStage, setDownloadStage] =
    useState<DownloadStage>('downloading');
  const [errorMsg, setErrorMsg] = useState('');
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);

  useEffect(() => {
    const unlistenPromise = listen<ProgressPayload>(
      'pdfium-download-progress',
      (event) => {
        const { stage, downloaded, total, percentage } = event.payload;
        setDownloadStage(stage);
        setDownloaded(downloaded);
        setTotal(total);
        setProgress(percentage);
      }
    );

    invoke<PlatformInfo>('get_pdfium_platform_info')
      .then((info) => setPlatformInfo(info))
      .catch(() => {});

    invoke<boolean>('check_pdfium')
      .then((exists) => {
        if (!exists) {
          setPhase('idle');
          setOpen(true);
        } else {
          setPhase('done');
        }
      })
      .catch(() => {
        setPhase('idle');
        setOpen(true);
      });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  async function handleDownload() {
    setPhase('downloading');
    setProgress(0);
    setDownloadStage('downloading');
    setErrorMsg('');

    try {
      await invoke('download_pdfium');
      setPhase('done');
    } catch (err) {
      setErrorMsg(String(err));
      setPhase('error');
    }
  }

  if (!open) return null;

  const isDone = phase === 'done';
  const isDownloading = phase === 'downloading';
  const isError = phase === 'error';
  const isExtracting = isDownloading && downloadStage === 'extracting';

  const stageLabel = isExtracting ? 'Extracting…' : 'Downloading…';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isDone) setOpen(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          if (!isDone) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (!isDone) e.preventDefault();
        }}
        className="max-w-md"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="text-primary size-5 shrink-0" />
            <DialogTitle>PDF Rendering Library Required</DialogTitle>
          </div>
          <DialogDescription>
            CosmicComics uses{' '}
            <a
              href="https://pdfium.googlesource.com/pdfium/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              PDFium
            </a>{' '}
            to display PDF files. The library is not bundled with the app and
            needs to be downloaded once.
          </DialogDescription>
        </DialogHeader>

        {platformInfo && (
          <div className="bg-muted rounded-md px-3 py-2 text-xs font-mono">
            <span className="text-muted-foreground">Package: </span>
            <span className="font-semibold">{platformInfo.archive}</span>
            <span className="text-muted-foreground ml-2">→ </span>
            <span>{platformInfo.lib_file}</span>
          </div>
        )}

        <div className="flex flex-col gap-4 pt-1">
          {phase === 'idle' && (
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="size-4" />
              Download PDFium
            </Button>
          )}

          {isDownloading && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  {stageLabel}
                </span>
                <span className="tabular-nums font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              {total > 0 && downloadStage === 'downloading' && (
                <p className="text-muted-foreground text-right text-xs tabular-nums">
                  {formatBytes(downloaded)} / {formatBytes(total)}
                </p>
              )}
            </div>
          )}

          {isError && (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full gap-2"
              >
                <Download className="size-4" />
                Retry Download
              </Button>
            </div>
          )}

          {isDone && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>PDFium downloaded and initialised successfully.</span>
              </div>
              <Button onClick={() => setOpen(false)} className="w-full">
                Continue
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

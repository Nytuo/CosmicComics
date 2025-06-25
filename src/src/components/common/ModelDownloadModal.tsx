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
  BrainCircuit,
  CheckCircle2,
  Download,
} from 'lucide-react';

const MODEL_DOWNLOAD_URL =
  'https://download.nytuo.fr/CosmicComics/model/model.onnx';

type Phase = 'checking' | 'idle' | 'downloading' | 'done' | 'error';

interface ProgressPayload {
  downloaded: number;
  total: number;
  percentage: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ModelDownloadModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('checking');
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unlistenPromise = listen<ProgressPayload>(
      'model-download-progress',
      (event) => {
        const { downloaded, total, percentage } = event.payload;
        setDownloaded(downloaded);
        setTotal(total);
        setProgress(percentage);
      }
    );

    invoke<boolean>('check_ai_model')
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
    setErrorMsg('');

    try {
      await invoke('download_ai_model', { url: MODEL_DOWNLOAD_URL });
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
            <BrainCircuit className="text-primary size-5 shrink-0" />
            <DialogTitle>AI Panel-Detection Model Required</DialogTitle>
          </div>
          <DialogDescription>
            The panel-detection model (<code>model.onnx</code>) is not bundled
            with the app due to its size. It needs to be downloaded once before
            the feature is available.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {phase === 'idle' && (
            <Button onClick={handleDownload} className="w-full gap-2">
              <Download className="size-4" />
              Download Model
            </Button>
          )}

          {isDownloading && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Downloading…</span>
                <span className="tabular-nums font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              {total > 0 && (
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
                <span>Model downloaded and initialised successfully.</span>
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

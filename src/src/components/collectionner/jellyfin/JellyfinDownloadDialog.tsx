import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { formatBytes } from '../stats/format.ts';

export interface DownloadState {
  written: number;
  total: number | null;
}

export default function JellyfinDownloadDialog({
  open,
  title,
  state,
}: {
  open: boolean;
  title: string;
  state: DownloadState;
}) {
  const { t } = useTranslation();
  const percent = state.total ? (state.written * 100) / state.total : 0;
  const preparing = !state.total || percent >= 100;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription>
            {preparing
              ? t('jellyfin_preparing')
              : t('jellyfin_downloading', { title })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Progress value={preparing ? 100 : percent} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              {preparing && <Spinner />}
              {state.total
                ? `${formatBytes(state.written)} / ${formatBytes(state.total)}`
                : formatBytes(state.written)}
            </span>
            {!preparing && (
              <span className="tabular-nums">{Math.round(percent)}%</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

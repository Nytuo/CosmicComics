import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as JellyfinAPI from '@/API/JellyfinAPI';
import { invalidateJellyfinCache } from '@/API/jellyfinLibrary.ts';
import { formatBytes } from '../stats/format.ts';

interface Props {
  serverId: string;
  /** A book, or a folder whose books are all kept. */
  item: { id: string; name: string; is_book: boolean };
  context: JellyfinAPI.OfflineContext;
  size?: 'sm' | 'default';
  onChanged?: () => void;
}

/** Keeps a Jellyfin book (or every book of a folder) on the device. */
export default function JellyfinOfflineButton({
  serverId,
  item,
  context,
  size = 'sm',
  onChanged,
}: Props) {
  const { t } = useTranslation();
  const [kept, setKept] = React.useState<JellyfinAPI.OfflineBook[]>([]);
  const [progress, setProgress] =
    React.useState<JellyfinAPI.OfflineProgress | null>(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const all = await JellyfinAPI.listOffline().catch(
      () => [] as JellyfinAPI.OfflineBook[]
    );
    setKept(
      all.filter(
        (b) =>
          b.server_id === serverId &&
          (item.is_book
            ? b.item.id === item.id
            : b.context.series_id === item.id)
      )
    );
  }, [serverId, item.id, item.is_book]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function download() {
    setBusy(true);
    setProgress(null);
    const stop = await JellyfinAPI.onOfflineProgress((p) => {
      if (p.root_id === item.id) setProgress(p);
    });
    try {
      const done = await JellyfinAPI.downloadOffline(
        serverId,
        item.id,
        context
      );
      ToasterHandler(
        t('jellyfin_offline_done', { count: done.length }),
        'success'
      );
      invalidateJellyfinCache();
      onChanged?.();
    } catch (e) {
      ToasterHandler(`${t('jellyfin_offline_failed')}: ${String(e)}`, 'error');
    } finally {
      stop();
      setBusy(false);
      setProgress(null);
      refresh();
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await JellyfinAPI.removeOffline(
        serverId,
        kept.map((b) => b.item.id)
      );
      ToasterHandler(t('jellyfin_offline_removed'), 'success');
      invalidateJellyfinCache();
      onChanged?.();
    } catch (e) {
      ToasterHandler(String(e), 'error');
    } finally {
      setBusy(false);
      refresh();
    }
  }

  if (busy && progress) {
    const percent = progress.total
      ? Math.round((progress.written * 100) / progress.total)
      : null;
    return (
      <Button variant="outline" size={size} disabled className="gap-1.5">
        <Spinner />
        <span className="max-w-56 truncate tabular-nums">
          {progress.count > 1
            ? `${progress.index + 1}/${progress.count} · `
            : ''}
          {percent !== null ? `${percent}%` : formatBytes(progress.written)}
        </span>
      </Button>
    );
  }

  if (kept.length > 0) {
    const bytes = kept.reduce((sum, b) => sum + b.size, 0);
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size={size}
          className="gap-1.5"
          disabled={busy}
          onClick={remove}
          title={t('jellyfin_offline_remove')}
        >
          <Check className="h-4 w-4 text-green-500" />
          {item.is_book
            ? t('jellyfin_offline_kept', { size: formatBytes(bytes) })
            : t('jellyfin_offline_kept_count', {
                count: kept.length,
                size: formatBytes(bytes),
              })}
          <Trash2 className="h-3.5 w-3.5 opacity-60" />
        </Button>
        {!item.is_book && (
          <Button
            variant="ghost"
            size={size}
            disabled={busy}
            onClick={download}
            title={t('jellyfin_offline_update')}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      className="gap-1.5"
      disabled={busy}
      onClick={download}
    >
      {busy ? <Spinner /> : <Download className="h-4 w-4" />}
      {item.is_book
        ? t('jellyfin_offline_download')
        : t('jellyfin_offline_download_folder')}
    </Button>
  );
}

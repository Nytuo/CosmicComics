import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Copy,
  Laptop,
  Link2,
  Pencil,
  RefreshCw,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as SyncAPI from '@/API/SyncAPI';
import { invalidateJellyfinCache } from '@/API/jellyfinLibrary.ts';
import { formatBytes } from '../stats/format.ts';

const MOBILE_PLATFORMS = new Set(['android', 'ios']);

function PlatformIcon({ platform }: { platform: string }) {
  const Icon = MOBILE_PLATFORMS.has(platform) ? Smartphone : Laptop;
  return <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />;
}

function reportLines(
  t: (key: string, options?: Record<string, unknown>) => string,
  report: SyncAPI.MergeReport
): string[] {
  const lines: string[] = [];
  if (report.books_updated) {
    lines.push(t('sync_report_books', { count: report.books_updated }));
  }
  if (report.series_updated) {
    lines.push(t('sync_report_series', { count: report.series_updated }));
  }
  if (report.bookmarks_added) {
    lines.push(t('sync_report_bookmarks', { count: report.bookmarks_added }));
  }
  if (report.sessions_added) {
    lines.push(t('sync_report_sessions', { count: report.sessions_added }));
  }
  if (report.credentials_added || report.jellyfin_servers_added) {
    lines.push(
      t('sync_report_secrets', {
        count: report.credentials_added + report.jellyfin_servers_added,
      })
    );
  }
  return lines;
}

interface SeriesGroup {
  key: string;
  title: string;
  books: SyncAPI.RemoteBook[];
}

function groupBySeries(books: SyncAPI.RemoteBook[]): SeriesGroup[] {
  const groups = new Map<string, SeriesGroup>();
  for (const book of books) {
    const key = book.series_id ?? `book:${book.id}`;
    const group = groups.get(key) ?? {
      key,
      title: book.series_title ?? book.title,
      books: [],
    };
    group.books.push(book);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function RemoteBooksPicker({
  peer,
  books,
  onCopied,
}: {
  peer: SyncAPI.SyncPeer;
  books: SyncAPI.RemoteBook[];
  onCopied: (copied: string[]) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [progress, setProgress] =
    React.useState<SyncAPI.TransferProgress | null>(null);
  const [copying, setCopying] = React.useState(false);
  const groups = React.useMemo(() => groupBySeries(books), [books]);

  const toggle = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const chosen = books.filter((b) => selected.has(b.id));
  const bytes = chosen.reduce((sum, b) => sum + b.size, 0);

  async function copy() {
    setCopying(true);
    const stop = await SyncAPI.onTransferProgress(setProgress);
    try {
      const ids = chosen.map((b) => b.id);
      const result = await SyncAPI.transferBooks(peer.id, ids);
      if (result.copied) {
        ToasterHandler(
          t('sync_copied', { count: result.copied, name: peer.name }),
          'success'
        );
      }
      for (const failure of result.failed) {
        ToasterHandler(`${failure.title}: ${failure.error}`, 'error');
      }
      const failed = new Set(result.failed.map((f) => f.title));
      onCopied(chosen.filter((b) => !failed.has(b.title)).map((b) => b.id));
      setSelected(new Set());
    } catch (e) {
      ToasterHandler(String(e), 'error');
    } finally {
      stop();
      setCopying(false);
      setProgress(null);
    }
  }

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('sync_nothing_to_copy')}
      </p>
    );
  }

  const overall =
    progress && progress.count
      ? ((progress.index +
          (progress.total ? progress.written / progress.total : 0)) *
          100) /
        progress.count
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {t('sync_books_on_peer', { count: books.length, name: peer.name })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            toggle(
              books.map((b) => b.id),
              selected.size !== books.length
            )
          }
          disabled={copying}
        >
          {selected.size === books.length
            ? t('sync_select_none')
            : t('sync_select_all')}
        </Button>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
        {groups.map((group) => {
          const ids = group.books.map((b) => b.id);
          const all = ids.every((id) => selected.has(id));
          const some = !all && ids.some((id) => selected.has(id));
          const single = group.books.length === 1;
          return (
            <div key={group.key} className="space-y-1">
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent/50">
                <Checkbox
                  checked={all ? true : some ? 'indeterminate' : false}
                  onCheckedChange={(v) => toggle(ids, !!v)}
                  disabled={copying}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {group.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {single
                    ? formatBytes(group.books[0].size)
                    : t('sync_series_books', { count: group.books.length })}
                </span>
              </label>
              {!single &&
                group.books.map((book) => (
                  <label
                    key={book.id}
                    className="ml-6 flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={selected.has(book.id)}
                      onCheckedChange={(v) => toggle([book.id], !!v)}
                      disabled={copying}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {book.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(book.size)}
                    </span>
                  </label>
                ))}
            </div>
          );
        })}
      </div>
      {copying && progress && (
        <div className="space-y-1">
          <Progress value={overall} />
          <p className="truncate text-xs text-muted-foreground">
            {progress.title
              ? `${progress.index + 1}/${progress.count} · ${progress.title}`
              : t('loading')}
          </p>
        </div>
      )}
      <Button
        className="w-full"
        onClick={copy}
        disabled={copying || chosen.length === 0}
      >
        {copying ? (
          <Spinner className="mr-2" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        {t('sync_copy_selected', {
          count: chosen.length,
          size: formatBytes(bytes),
        })}
      </Button>
    </div>
  );
}

function PeerRow({
  peer,
  onChanged,
  onLibraryChanged,
}: {
  peer: SyncAPI.SyncPeer;
  onChanged: () => void;
  onLibraryChanged: () => void;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = React.useState('');
  const [pairing, setPairing] = React.useState(false);
  const [busy, setBusy] = React.useState<'pair' | 'sync' | null>(null);
  const [result, setResult] = React.useState<SyncAPI.SyncResult | null>(null);

  async function pair() {
    setBusy('pair');
    try {
      await SyncAPI.pairPeer(peer.id, pin);
      ToasterHandler(t('sync_paired_with', { name: peer.name }), 'success');
      setPairing(false);
      setPin('');
      onChanged();
    } catch (e) {
      ToasterHandler(String(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy('sync');
    try {
      const done = await SyncAPI.runSync(peer.id);
      setResult(done);
      invalidateJellyfinCache();
      onLibraryChanged();
      ToasterHandler(t('sync_done', { name: peer.name }), 'success');
    } catch (e) {
      ToasterHandler(String(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function forget() {
    await SyncAPI.forgetPeer(peer.id).catch((e) =>
      ToasterHandler(String(e), 'error')
    );
    setResult(null);
    onChanged();
  }

  const pulled = result ? reportLines(t, result.pulled) : [];
  const pushed = result ? reportLines(t, result.pushed) : [];

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <PlatformIcon platform={peer.platform} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{peer.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {peer.last_sync
              ? t('sync_last_sync', {
                  date: new Date(peer.last_sync * 1000).toLocaleString(),
                })
              : (peer.addresses[0] ?? '')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {peer.online ? (
            <Badge variant="secondary" className="gap-1">
              <Wifi className="h-3 w-3" />
              {t('sync_nearby')}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <WifiOff className="h-3 w-3" />
              {t('sync_not_nearby')}
            </Badge>
          )}
          {peer.paired ? (
            <>
              <Button size="sm" onClick={sync} disabled={busy !== null}>
                {busy === 'sync' ? (
                  <Spinner className="mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t('sync_now')}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
                title={t('sync_forget')}
                onClick={forget}
                disabled={busy !== null}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant={pairing ? 'secondary' : 'default'}
              onClick={() => setPairing((v) => !v)}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {t('sync_pair')}
            </Button>
          )}
        </div>
      </div>

      {pairing && !peer.paired && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            pair();
          }}
        >
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder={t('sync_pin_placeholder', { name: peer.name })}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="min-w-40 flex-1 font-mono tracking-widest"
          />
          <Button
            type="submit"
            disabled={busy !== null || pin.replace(/\D/g, '').length !== 6}
          >
            {busy === 'pair' ? (
              <Spinner className="mr-2" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {t('sync_confirm_pin')}
          </Button>
        </form>
      )}

      {result && (
        <div className="space-y-3 border-t pt-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t('sync_received')}
              </p>
              {(pulled.length ? pulled : [t('sync_up_to_date')]).map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t('sync_sent', { name: peer.name })}
              </p>
              {(pushed.length ? pushed : [t('sync_up_to_date')]).map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>
          <RemoteBooksPicker
            peer={peer}
            books={result.remote_books}
            onCopied={(ids) => {
              setResult((current) =>
                current
                  ? {
                      ...current,
                      remote_books: current.remote_books.filter(
                        (b) => !ids.includes(b.id)
                      ),
                    }
                  : current
              );
              onLibraryChanged();
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Pairs this device with others on the same network and syncs their library
 * database. The device is visible to the others only while this is open.
 */
export default function SyncDialog({
  open,
  onClose,
  onLibraryChanged,
}: {
  open: boolean;
  onClose: () => void;
  onLibraryChanged: () => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<SyncAPI.SyncStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [peers, setPeers] = React.useState<SyncAPI.SyncPeer[]>([]);
  const [address, setAddress] = React.useState('');
  const [probing, setProbing] = React.useState(false);
  const [editingName, setEditingName] = React.useState<string | null>(null);
  // The server must stay up while the dialog is open: keep the callbacks out
  // of the effect dependencies so a parent render does not restart it.
  const changedRef = React.useRef(onLibraryChanged);
  const tRef = React.useRef(t);
  React.useEffect(() => {
    changedRef.current = onLibraryChanged;
    tRef.current = t;
  });

  const refreshPeers = React.useCallback(() => {
    SyncAPI.listPeers()
      .then(setPeers)
      .catch(() => {});
  }, []);
  const refreshStatus = React.useCallback(() => {
    SyncAPI.syncStatus()
      .then((s) => s && setStatus(s))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    const unlisten: Promise<() => void>[] = [];
    setError(null);
    SyncAPI.startSync()
      .then((s) => alive && setStatus(s))
      .catch((e) => alive && setError(String(e)));
    refreshPeers();
    unlisten.push(SyncAPI.onPeersChanged(refreshPeers));
    unlisten.push(SyncAPI.onPinChanged(refreshStatus));
    unlisten.push(
      SyncAPI.onPaired((device) =>
        ToasterHandler(
          tRef.current('sync_paired_with', { name: device.name }),
          'success'
        )
      )
    );
    unlisten.push(
      SyncAPI.onMerged(({ peer }) => {
        invalidateJellyfinCache();
        changedRef.current();
        ToasterHandler(tRef.current('sync_done', { name: peer }), 'success');
      })
    );
    return () => {
      alive = false;
      unlisten.forEach((p) => p.then((stop) => stop()));
      SyncAPI.stopSync().catch(() => {});
    };
  }, [open, refreshPeers, refreshStatus]);

  async function probe() {
    setProbing(true);
    try {
      await SyncAPI.probePeer(address);
      setAddress('');
      refreshPeers();
    } catch (e) {
      ToasterHandler(String(e), 'error');
    } finally {
      setProbing(false);
    }
  }

  async function saveName() {
    if (editingName === null) return;
    try {
      await SyncAPI.setDeviceName(editingName);
      setEditingName(null);
      refreshStatus();
    } catch (e) {
      ToasterHandler(String(e), 'error');
    }
  }

  const pin = status?.pin ?? '';

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('sync_title')}</DialogTitle>
          <DialogDescription>{t('sync_description')}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {status && <PlatformIcon platform={status.device.platform} />}
            {editingName !== null ? (
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveName();
                }}
              >
                <Input
                  autoFocus
                  value={editingName}
                  maxLength={60}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-8"
                />
                <Button size="sm" type="submit">
                  {t('save')}
                </Button>
              </form>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <p className="truncate font-medium">
                  {status?.device.name ?? t('loading')}
                </p>
                {status && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title={t('sync_rename')}
                    onClick={() => setEditingName(status.device.name)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('sync_pin')}</p>
              <p className="font-mono text-2xl font-semibold tracking-widest tabular-nums">
                {pin ? `${pin.slice(0, 3)} ${pin.slice(3)}` : '––– –––'}
              </p>
            </div>
          </div>
          {status && (
            <p className="text-xs text-muted-foreground">
              {status.discoverable
                ? t('sync_visible')
                : t('sync_not_announced')}{' '}
              {status.addresses.length > 0 && (
                <>
                  {t('sync_address')}{' '}
                  <span className="font-mono text-foreground">
                    {status.addresses.join(' · ')}
                  </span>
                </>
              )}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t('sync_devices')}</h3>
            {status && peers.every((p) => !p.online) && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                {t('sync_searching')}
              </span>
            )}
          </div>
          {peers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('sync_no_devices')}
            </p>
          )}
          {peers.map((peer) => (
            <PeerRow
              key={peer.id}
              peer={peer}
              onChanged={refreshPeers}
              onLibraryChanged={onLibraryChanged}
            />
          ))}
        </section>

        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            probe();
          }}
        >
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('sync_address_placeholder')}
            className="min-w-48 flex-1 font-mono"
            inputMode="url"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={probing || !address.trim()}
          >
            {probing && <Spinner className="mr-2" />}
            {t('sync_connect')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

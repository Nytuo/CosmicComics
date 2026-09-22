import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, LogIn, Plus, RefreshCw, Server, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as JellyfinAPI from '@/API/JellyfinAPI';
import {
  getSeriesLayout,
  invalidateJellyfinCache,
  listLibraries,
  setLibraryHidden,
  setSeriesLayout,
  type JellyfinLibraryInfo,
  type SeriesLayout,
} from '@/API/jellyfinLibrary.ts';
import { formatBytes } from '../stats/format.ts';
import JellyfinServerDialog from './JellyfinServerDialog.tsx';

interface ServerState {
  server: JellyfinAPI.JellyfinServerInfo;
  libraries: JellyfinLibraryInfo[];
  expired: boolean;
  error?: string;
}

function SeriesLayoutFields({
  serverId,
  libraryId,
}: {
  serverId: string;
  libraryId: string;
}) {
  const { t } = useTranslation();
  const [layout, setLayout] = React.useState<SeriesLayout>(() =>
    getSeriesLayout(serverId, libraryId)
  );
  const change = (key: keyof SeriesLayout, value: string) => {
    const next = { ...layout, [key]: Number(value) };
    setLayout(next);
    setSeriesLayout(serverId, libraryId, next);
  };
  const id = `jf-layout-${serverId}-${libraryId}`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-muted-foreground">
      <label htmlFor={`${id}-offset`} className="flex items-center gap-1.5">
        {t('jellyfin_series_offset')}
        <Input
          id={`${id}-offset`}
          type="number"
          min={0}
          max={10}
          value={layout.offset}
          onChange={(e) => change('offset', e.target.value)}
          className="h-7 w-14 px-2 text-xs"
        />
      </label>
      <label htmlFor={`${id}-depth`} className="flex items-center gap-1.5">
        {t('jellyfin_series_depth')}
        <Input
          id={`${id}-depth`}
          type="number"
          min={1}
          max={10}
          value={layout.depth}
          onChange={(e) => change('depth', e.target.value)}
          className="h-7 w-14 px-2 text-xs"
        />
      </label>
    </div>
  );
}

export default function JellyfinServersSection() {
  const { t } = useTranslation();
  const [servers, setServers] = React.useState<ServerState[] | null>(null);
  const [dialog, setDialog] = React.useState<{ open: boolean; url?: string }>({
    open: false,
  });
  const [offline, setOffline] = React.useState<JellyfinAPI.OfflineBook[]>([]);

  const refreshOffline = React.useCallback(() => {
    JellyfinAPI.listOffline()
      .then(setOffline)
      .catch(() => setOffline([]));
  }, []);

  React.useEffect(refreshOffline, [refreshOffline]);

  async function removeOffline(server: JellyfinAPI.JellyfinServerInfo) {
    await JellyfinAPI.removeOffline(server.id);
    invalidateJellyfinCache();
    refreshOffline();
    ToasterHandler(t('jellyfin_offline_removed'), 'success');
  }

  const refresh = React.useCallback(async () => {
    const list = await JellyfinAPI.listServers();
    setServers(
      await Promise.all(
        list.map(async (server): Promise<ServerState> => {
          try {
            return {
              server,
              libraries: await listLibraries(server.id),
              expired: false,
            };
          } catch (e) {
            return {
              server,
              libraries: [],
              expired: JellyfinAPI.isUnauthorized(e),
              error: JellyfinAPI.isUnauthorized(e) ? undefined : String(e),
            };
          }
        })
      )
    );
  }, []);

  React.useEffect(() => {
    refresh().catch((e) => ToasterHandler(String(e), 'error'));
  }, [refresh]);

  const onSignedIn = React.useCallback(
    async (added: JellyfinAPI.JellyfinServerInfo) => {
      setDialog({ open: false });
      invalidateJellyfinCache();
      await refresh();
      ToasterHandler(
        t('jellyfin_connected_to', { name: added.name }),
        'success'
      );
    },
    [refresh, t]
  );

  async function remove(server: JellyfinAPI.JellyfinServerInfo) {
    await JellyfinAPI.removeServer(server.id);
    invalidateJellyfinCache();
    ToasterHandler(t('jellyfin_server_removed'), 'success');
    await refresh();
  }

  const [refreshing, setRefreshing] = React.useState<string | null>(null);

  async function refreshServer(server: JellyfinAPI.JellyfinServerInfo) {
    setRefreshing(server.id);
    try {
      const result = await JellyfinAPI.refreshServer(server.id);
      invalidateJellyfinCache();
      await refresh();
      if (!result.session_ok) {
        ToasterHandler(t('jellyfin_refresh_sign_in'), 'error');
        setDialog({ open: true, url: server.url });
      } else if (result.rebound) {
        ToasterHandler(t('jellyfin_refresh_rebound'), 'success');
      } else {
        ToasterHandler(
          `${t('jellyfin_refresh_done')} ${result.rebind_error ?? ''}`.trim(),
          'info'
        );
      }
    } catch (e) {
      ToasterHandler(String(e), 'error');
    } finally {
      setRefreshing(null);
    }
  }

  async function clearCache(server: JellyfinAPI.JellyfinServerInfo) {
    await JellyfinAPI.clearCache(server.id);
    ToasterHandler(t('jellyfin_cache_cleared'), 'success');
  }

  function toggle(serverId: string, libraryId: string, shown: boolean) {
    setLibraryHidden(serverId, libraryId, !shown);
    setServers((current) =>
      (current ?? []).map((s) =>
        s.server.id === serverId
          ? {
              ...s,
              libraries: s.libraries.map((l) =>
                l.id === libraryId ? { ...l, hidden: !shown } : l
              ),
            }
          : s
      )
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            {t('jellyfin_servers')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('jellyfin_servers_desc')}
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true })}>
          <Plus className="h-4 w-4 mr-2" />
          {t('jellyfin_add_server')}
        </Button>
      </div>

      {servers && servers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Server className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center">
              {t('jellyfin_no_servers_desc')}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {(servers ?? []).map(({ server, libraries, expired, error }) => {
          const kept = offline.filter((b) => b.server_id === server.id);
          return (
            <Card key={server.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Server className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base truncate">
                      {server.name}
                    </CardTitle>
                    <Badge className="shrink-0 bg-[#00a4dc] text-white">
                      Jellyfin
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t('jellyfin_refresh')}
                      disabled={refreshing === server.id}
                      onClick={() => refreshServer(server)}
                    >
                      <RefreshCw
                        className={
                          'h-4 w-4' +
                          (refreshing === server.id ? ' animate-spin' : '')
                        }
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t('jellyfin_sign_in_again')}
                      onClick={() => setDialog({ open: true, url: server.url })}
                    >
                      <LogIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={t('jellyfin_clear_cache')}
                      onClick={() => clearCache(server)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(server)}
                    >
                      {t('jellyfin_remove_server')}
                    </Button>
                  </div>
                </div>
                <CardDescription className="truncate" title={server.url}>
                  {server.user_name} · {server.url}
                  {server.version ? ` · v${server.version}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {server.borrowed_from && (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
                    <span className="flex-1">
                      {t('jellyfin_borrowed', { name: server.borrowed_from })}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={refreshing === server.id}
                      onClick={() => refreshServer(server)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t('jellyfin_refresh')}
                    </Button>
                  </div>
                )}
                {expired && (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    <span className="flex-1">
                      {t('jellyfin_session_expired')}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setDialog({ open: true, url: server.url })}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {t('jellyfin_sign_in')}
                    </Button>
                  </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                {libraries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('jellyfin_libraries_shown')}
                    </p>
                    {libraries.map((library) => (
                      <div key={library.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor={`jf-${server.id}-${library.id}`}
                            className="text-sm font-normal"
                          >
                            {library.name}
                          </Label>
                          <Switch
                            id={`jf-${server.id}-${library.id}`}
                            checked={!library.hidden}
                            onCheckedChange={(shown) =>
                              toggle(server.id, library.id, shown)
                            }
                          />
                        </div>
                        {!library.hidden && (
                          <SeriesLayoutFields
                            serverId={server.id}
                            libraryId={library.id}
                          />
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {t('jellyfin_series_layout_hint')}
                    </p>
                  </div>
                )}
                {kept.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      {t('jellyfin_offline_kept_count', {
                        count: kept.length,
                        size: formatBytes(
                          kept.reduce((sum, b) => sum + b.size, 0)
                        ),
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeOffline(server)}
                    >
                      {t('jellyfin_offline_remove_all')}
                    </Button>
                  </div>
                )}
                {!expired && !error && libraries.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('jellyfin_no_libraries')}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <JellyfinServerDialog
        open={dialog.open}
        prefillUrl={dialog.url}
        onClose={() => setDialog({ open: false })}
        onSignedIn={onSignedIn}
      />
    </section>
  );
}

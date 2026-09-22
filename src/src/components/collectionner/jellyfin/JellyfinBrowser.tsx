import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, LogIn, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Card,
  GRID_CARD_CLASS,
} from '@/components/collectionner/card/Card.tsx';
import * as JellyfinAPI from '@/API/JellyfinAPI';
import type { JellyfinItem, JellyfinServerInfo } from '@/API/JellyfinAPI';
import {
  invalidateJellyfinCache,
  type JellyfinNav,
} from '@/API/jellyfinLibrary.ts';
import JellyfinServerDialog from './JellyfinServerDialog.tsx';
import JellyfinBookPage from './JellyfinBookPage.tsx';
import JellyfinOfflineButton from './JellyfinOfflineButton.tsx';

export const NAV_KEY = 'jellyfin.nav';
const PAGE_SIZE = 60;

type Trail = JellyfinNav['trail'];
type Filter = 'all' | 'unread' | 'reading' | 'favorites';
type Sort = 'name' | 'added' | 'read';

const FILTERS: Record<Filter, string[]> = {
  all: [],
  unread: ['IsUnplayed'],
  reading: ['IsResumable'],
  favorites: ['IsFavorite'],
};

const SORTS: Record<Sort, { by: string; order: 'Ascending' | 'Descending' }> = {
  name: { by: 'SortName', order: 'Ascending' },
  added: { by: 'DateCreated', order: 'Descending' },
  read: { by: 'DatePlayed', order: 'Descending' },
};

export default function JellyfinBrowser({
  nav,
  onExit,
}: {
  nav: JellyfinNav;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const serverId = nav.serverId;
  const [server, setServer] = React.useState<JellyfinServerInfo | null>(null);
  const [relogin, setRelogin] = React.useState(false);
  const [trail, setTrail] = React.useState<Trail>(nav.trail);
  const [views, setViews] = React.useState<JellyfinItem[]>([]);
  const [items, setItems] = React.useState<JellyfinItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>('all');
  const [sort, setSort] = React.useState<Sort>('name');
  const [selected, setSelected] = React.useState<JellyfinItem | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const requestId = React.useRef(0);
  const entryBook = React.useRef(nav.bookId);

  const parent = trail[trail.length - 1];
  const searching = debouncedSearch.trim().length > 0;
  const atRoot = trail.length === 0 && !searching;

  const handleError = React.useCallback((e: unknown) => {
    if (JellyfinAPI.isUnauthorized(e)) {
      setExpired(true);
      setError(null);
    } else {
      setError(String(e));
    }
  }, []);

  React.useEffect(() => {
    JellyfinAPI.listServers()
      .then((list) => setServer(list.find((s) => s.id === serverId) ?? null))
      .catch((e) => setError(String(e)));
  }, [serverId]);

  React.useEffect(() => {
    sessionStorage.setItem(
      NAV_KEY,
      JSON.stringify({ serverId, trail, bookId: selected?.id } as JellyfinNav)
    );
  }, [serverId, trail, selected]);

  React.useEffect(() => {
    if (!nav.bookId) return;
    JellyfinAPI.getItem(serverId, nav.bookId)
      .then((item) => item.is_book && setSelected(item))
      .catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = React.useCallback(
    (startIndex: number): JellyfinAPI.JellyfinItemsQuery => {
      const recursive = searching || filter !== 'all';
      return {
        parent_id: parent?.id,
        search_term: searching ? debouncedSearch : undefined,
        filters: FILTERS[filter],
        recursive,
        include_types: recursive ? ['Book'] : undefined,
        sort_by: SORTS[sort].by,
        sort_order: SORTS[sort].order,
        start_index: startIndex,
        limit: PAGE_SIZE,
      };
    },
    [parent?.id, debouncedSearch, searching, filter, sort]
  );

  React.useEffect(() => {
    const id = ++requestId.current;
    const stale = () => id !== requestId.current;
    setLoading(true);
    setError(null);
    setExpired(false);

    (async () => {
      try {
        if (atRoot) {
          setViews(await JellyfinAPI.getViews(serverId));
          setItems([]);
          setTotal(0);
        } else {
          const page = await JellyfinAPI.getItems(serverId, query(0));
          if (stale()) return;
          setItems(page.items);
          setTotal(page.total);
        }
      } catch (e) {
        if (!stale()) handleError(e);
      } finally {
        if (!stale()) setLoading(false);
      }
    })();
  }, [serverId, atRoot, query, reloadKey, handleError]);

  async function loadMore() {
    setLoading(true);
    try {
      const page = await JellyfinAPI.getItems(serverId, query(items.length));
      setItems((current) => [...current, ...page.items]);
      setTotal(page.total);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  function goTo(depth: number) {
    setSearch('');
    setDebouncedSearch('');
    setTrail((current) => current.slice(0, depth));
  }

  function openItem(item: JellyfinItem) {
    if (item.is_book) {
      setSelected(item);
    } else {
      setSearch('');
      setDebouncedSearch('');
      setTrail((current) => [...current, { id: item.id, name: item.name }]);
    }
  }

  const onUnauthorized = React.useCallback(() => {
    setSelected(null);
    setExpired(true);
  }, []);

  const onSignedIn = React.useCallback(() => {
    setRelogin(false);
    invalidateJellyfinCache();
    setReloadKey((k) => k + 1);
  }, []);

  const changed = React.useCallback(() => {
    invalidateJellyfinCache();
    setReloadKey((k) => k + 1);
  }, []);

  const library = trail[0];
  const offlineContext: JellyfinAPI.OfflineContext = {
    library_id: library?.id ?? '',
    library_name: library?.name ?? '',
    series_id: trail.length >= 2 ? parent.id : null,
    series_name: trail.length >= 2 ? parent.name : null,
  };

  const reloginDialog = (
    <JellyfinServerDialog
      open={relogin}
      prefillUrl={server?.url}
      onClose={() => setRelogin(false)}
      onSignedIn={onSignedIn}
    />
  );

  if (selected) {
    return (
      <>
        <JellyfinBookPage
          serverId={serverId}
          item={selected}
          context={offlineContext}
          onBack={() =>
            selected.id === entryBook.current ? onExit() : setSelected(null)
          }
          onChanged={changed}
          onUnauthorized={onUnauthorized}
        />
        {reloginDialog}
      </>
    );
  }

  const renderCard = (item: JellyfinItem) => (
    <Card
      key={item.id}
      title={item.name}
      description={item.overview}
      image={
        item.image_tag
          ? JellyfinAPI.coverUrl(serverId, item.id, item.image_tag)
          : undefined
      }
      favorite={item.favorite}
      read={item.played}
      className={GRID_CARD_CLASS}
      onClick={() => openItem(item)}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExit}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('back')}
        </Button>
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => goTo(0)}
          >
            {server?.name ?? 'Jellyfin'}
          </button>
          {trail.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                className={
                  index === trail.length - 1
                    ? 'font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }
                onClick={() => goTo(index + 1)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('jellyfin_search_placeholder')}
            className="pl-8"
            type="search"
          />
        </div>
        {!atRoot && (
          <>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as Filter)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('jellyfin_filter_all')}</SelectItem>
                <SelectItem value="unread">
                  {t('jellyfin_filter_unread')}
                </SelectItem>
                <SelectItem value="reading">
                  {t('jellyfin_filter_reading')}
                </SelectItem>
                <SelectItem value="favorites">
                  {t('jellyfin_filter_favorites')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t('jellyfin_sort_name')}</SelectItem>
                <SelectItem value="added">
                  {t('jellyfin_sort_added')}
                </SelectItem>
                <SelectItem value="read">{t('jellyfin_sort_read')}</SelectItem>
              </SelectContent>
            </Select>
            {trail.length >= 2 && !searching && (
              <JellyfinOfflineButton
                key={parent.id}
                serverId={serverId}
                item={{ id: parent.id, name: parent.name, is_book: false }}
                context={offlineContext}
                onChanged={changed}
              />
            )}
          </>
        )}
      </div>

      {expired && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <span className="flex-1">{t('jellyfin_session_expired')}</span>
          <Button size="sm" onClick={() => setRelogin(true)}>
            <LogIn className="mr-2 h-4 w-4" />
            {t('jellyfin_sign_in')}
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {atRoot ? (
        views.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            {t('jellyfin_no_libraries')}
          </p>
        ) : (
          <div className="cards-list">{views.map(renderCard)}</div>
        )
      ) : items.length === 0 && !loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t('jellyfin_empty_folder')}
        </p>
      ) : (
        <>
          <div className="cards-list">{items.map(renderCard)}</div>
          {items.length < total && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading && <Spinner className="mr-2" />}
                {t('jellyfin_load_more')} ({items.length}/{total})
              </Button>
            </div>
          )}
        </>
      )}

      {loading && items.length === 0 && (
        <div className="flex justify-center p-6">
          <Spinner className="size-6" />
        </div>
      )}
      {reloginDialog}
    </div>
  );
}

import * as React from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  FileUp,
  LibraryBig,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer.tsx';
import VirtualizedCardGrid from '@/components/collectionner/card/VirtualizedCardGrid.tsx';
import { useLibraryData } from '@/components/collectionner/home/useLibraryData.ts';
import {
  FilterPanel,
  activeFilterCount,
  applySearchFilterSort,
  defaultFilterState,
  type SearchFilterState,
  type SortField,
} from '@/components/collectionner/home/SearchFilterBar.tsx';
import {
  jellyfinRef,
  navFor,
  type JellyfinNav,
} from '@/API/jellyfinLibrary.ts';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { cn } from '@/lib/utils.ts';
import MobileCard from './MobileCard.tsx';
import ContinueReadingRail from './ContinueReadingRail.tsx';

type BookOrSeries = DisplayBook | DisplaySeries;
type Shelf = 'series' | 'books' | 'downloads';

const SORTS: { field: SortField; label: string }[] = [
  { field: 'name', label: 'sortByName' },
  { field: 'note', label: 'rating' },
  { field: 'date', label: 'dates' },
  { field: 'favorite', label: 'favorite' },
  { field: 'trending', label: 'trending' },
];

interface MobileHomeProps {
  handleOpenDetails: (open: boolean, book: BookOrSeries, provider: any) => void;
  handleOpenSeries: (
    open: boolean,
    series: BookOrSeries,
    provider: any
  ) => void;
  onOpenJellyfin: (nav: JellyfinNav) => void;
  onOpenLibraries: () => void;
  onImport: () => void;
  CosmicComicsTemp: string;
  refreshKey?: number;
}

export default function MobileHome({
  handleOpenDetails,
  handleOpenSeries,
  onOpenJellyfin,
  onOpenLibraries,
  onImport,
  CosmicComicsTemp,
  refreshKey,
}: MobileHomeProps) {
  const { t } = useTranslation();
  const {
    books,
    series,
    reading,
    downloads,
    jellyfin,
    isLoading,
    expiredServers,
  } = useLibraryData(CosmicComicsTemp, refreshKey);
  const [filter, setFilter] =
    React.useState<SearchFilterState>(defaultFilterState);
  const [shelf, setShelf] = React.useState<Shelf>('series');
  const [filterOpen, setFilterOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.background = 'var(--theme-gradient, var(--background))';
  }, []);

  const shownSeries = React.useMemo(
    () => applySearchFilterSort(series, filter),
    [series, filter]
  );
  const shownBooks = React.useMemo(
    () => applySearchFilterSort(books, filter),
    [books, filter]
  );
  const shownDownloads = React.useMemo(
    () => applySearchFilterSort(downloads, filter),
    [downloads, filter]
  );

  const filtering = filter.query !== '' || activeFilterCount(filter) > 0;
  const shelves: { id: Shelf; label: string; count: number }[] = [
    { id: 'series', label: t('series'), count: shownSeries.length },
    { id: 'books', label: t('books'), count: shownBooks.length },
    ...(downloads.length > 0
      ? [
          {
            id: 'downloads' as Shelf,
            label: t('download'),
            count: shownDownloads.length,
          },
        ]
      : []),
  ];
  const activeShelf = shelves.some((s) => s.id === shelf) ? shelf : 'series';
  const items: BookOrSeries[] =
    activeShelf === 'series'
      ? shownSeries
      : activeShelf === 'books'
        ? shownBooks
        : shownDownloads;

  const openBook = (item: BookOrSeries) => {
    const ref = jellyfinRef(item);
    if (ref) onOpenJellyfin(navFor(ref, item.title));
    else handleOpenDetails(true, item, item.provider_id);
  };
  const openItem = (item: BookOrSeries) =>
    'page_count' in item ? openBook(item) : openSeries(item);
  const openSeries = (item: BookOrSeries) => {
    const ref = jellyfinRef(item);
    if (ref) onOpenJellyfin(navFor(ref, item.title));
    else handleOpenSeries(true, item, item.provider_id);
  };
  const resume = (book: DisplayBook) => {
    const ref = jellyfinRef(book);
    if (ref) {
      onOpenJellyfin(navFor(ref, book.title));
      return;
    }
    localStorage.setItem('currentBook', book.path);
    window.location.href = '/viewer';
  };

  const empty = !isLoading && books.length === 0 && series.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder={t('searchInLibrary')}
            value={filter.query}
            onChange={(event) =>
              setFilter({ ...filter, query: event.target.value })
            }
            className="h-11 w-full rounded-full border border-border/70 bg-muted/60 pr-10 pl-10 text-base outline-none placeholder:text-muted-foreground focus:border-secondary [&::-webkit-search-cancel-button]:hidden"
          />
          {filter.query && (
            <button
              type="button"
              aria-label={t('reset')}
              onClick={() => setFilter({ ...filter, query: '' })}
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label={t('filters')}
          onClick={() => setFilterOpen(true)}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/60 transition-colors active:bg-accent"
        >
          <SlidersHorizontal className="size-[18px]" />
          {activeFilterCount(filter) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
              {activeFilterCount(filter)}
            </span>
          )}
        </button>
      </div>

      {expiredServers.length > 0 && (
        <button
          type="button"
          onClick={onOpenLibraries}
          className="flex w-full items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-left text-sm"
        >
          <span className="flex-1">
            {t('jellyfin_expired_home', {
              name: expiredServers.map((s) => s.server.name).join(', '),
            })}
          </span>
          <LibraryBig className="size-4 shrink-0" />
        </button>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner className="size-7" />
        </div>
      )}

      {empty && (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <LibraryBig className="size-9 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {t('no-libraries-configured-yet')}
          </p>
          <Button onClick={onImport} className="rounded-full px-6">
            <FileUp className="size-4" />
            {t('open_file')}
          </Button>
        </div>
      )}

      {!isLoading && !empty && (
        <>
          {!filtering && (
            <ContinueReadingRail
              books={reading}
              onOpen={openBook}
              onResume={resume}
            />
          )}

          <div
            role="tablist"
            className="flex gap-1 rounded-full bg-muted/70 p-1"
          >
            {shelves.map(({ id, label, count }) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={activeShelf === id}
                onClick={() => setShelf(id)}
                className={cn(
                  'flex-1 rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors',
                  activeShelf === id
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground'
                )}
              >
                {label}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              {t('nothingHere')}
            </p>
          ) : (
            <VirtualizedCardGrid
              key={activeShelf}
              items={items}
              handleOpenDetails={() => {}}
              rowEstimate={250}
              renderItem={(item) => (
                <MobileCard
                  key={item.id}
                  item={item}
                  onOpen={() => openItem(item)}
                />
              )}
            />
          )}
        </>
      )}

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent className="rounded-t-3xl">
          <DrawerHeader className="text-left">
            <DrawerTitle>{t('filters')}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t('sortBy')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-6 overflow-y-auto px-4 pb-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('sortBy')}
              </p>
              <div className="flex flex-wrap gap-2">
                {SORTS.map(({ field, label }) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setFilter({ ...filter, sort: field })}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm transition-colors',
                      filter.sort === field
                        ? 'border-secondary bg-secondary text-secondary-foreground'
                        : 'border-border bg-muted/50'
                    )}
                  >
                    {t(label)}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label={
                    filter.order === 'asc' ? t('ascending') : t('descending')
                  }
                  onClick={() =>
                    setFilter({
                      ...filter,
                      order: filter.order === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm"
                >
                  {filter.order === 'asc' ? (
                    <ArrowDownAZ className="size-4" />
                  ) : (
                    <ArrowUpAZ className="size-4" />
                  )}
                  {filter.order === 'asc' ? t('ascending') : t('descending')}
                </button>
              </div>
            </div>
            <FilterPanel
              state={filter}
              onChange={setFilter}
              jellyfinSources={jellyfin?.sources}
            />
          </div>
          <DrawerFooter className="flex-row gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setFilter({ ...defaultFilterState })}
            >
              {t('reset')}
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={() => setFilterOpen(false)}
            >
              {t('close')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

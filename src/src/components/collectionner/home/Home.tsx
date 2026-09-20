import * as TauriAPI from '@/API/TauriAPI.ts';
import VirtualizedCardGrid from '@/components/collectionner/card/VirtualizedCardGrid.tsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Plus } from 'lucide-react';
import {
  jellyfinRef,
  loadJellyfinLibrary,
  navFor,
  type JellyfinLibraryData,
  type JellyfinNav,
} from '@/API/jellyfinLibrary.ts';
import SearchFilterBar, {
  applySearchFilterSort,
  defaultFilterState,
  type SearchFilterState,
} from '@/components/collectionner/home/SearchFilterBar.tsx';

function Home({
  handleOpenDetails,
  handleOpenSeries,
  onOpenAPISelector,
  CosmicComicsTemp,
  refreshKey,
  onOpenJellyfin,
  onOpenLibraries,
}: {
  handleOpenDetails: any;
  handleOpenSeries: any;
  onOpenAPISelector: () => void;
  CosmicComicsTemp: string;
  refreshKey?: number;
  onOpenJellyfin: (nav: JellyfinNav) => void;
  onOpenLibraries: () => void;
}) {
  const { t } = useTranslation();
  const [allBooks, setAllBooks] = useState<DisplayBook[]>([]);
  const [allSeries, setAllSeries] = useState<DisplaySeries[]>([]);
  const [readingBooks, setReadingBooks] = useState<DisplayBook[]>([]);
  const [downloadBooks, setDownloadBooks] = useState<DisplayBook[]>([]);
  const [jellyfin, setJellyfin] = useState<JellyfinLibraryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterState, setFilterState] =
    useState<SearchFilterState>(defaultFilterState);
  const [activeTab, setActiveTab] = useState('reading');
  const [activeAllSubTab, setActiveAllSubTab] = useState('series');

  const mergedBooks = useMemo(
    () => [...allBooks, ...(jellyfin?.books ?? [])],
    [allBooks, jellyfin]
  );
  const mergedSeries = useMemo(
    () => [...allSeries, ...(jellyfin?.series ?? [])],
    [allSeries, jellyfin]
  );
  const mergedReading = useMemo(
    () => [...readingBooks, ...(jellyfin?.reading ?? [])],
    [readingBooks, jellyfin]
  );

  const filteredBooks = useMemo(
    () => applySearchFilterSort(mergedBooks, filterState),
    [mergedBooks, filterState]
  );
  const filteredSeries = useMemo(
    () => applySearchFilterSort(mergedSeries, filterState),
    [mergedSeries, filterState]
  );
  const filteredReadingBooks = useMemo(
    () => applySearchFilterSort(mergedReading, filterState),
    [mergedReading, filterState]
  );
  const filteredDownloadBooks = useMemo(
    () => applySearchFilterSort(downloadBooks, filterState),
    [downloadBooks, filterState]
  );

  const activeCounts = useMemo(() => {
    if (activeTab === 'reading') {
      return {
        total: mergedReading.length,
        filtered: filteredReadingBooks.length,
      };
    }
    if (activeTab === 'downloads') {
      return {
        total: downloadBooks.length,
        filtered: filteredDownloadBooks.length,
      };
    }
    if (activeAllSubTab === 'books') {
      return { total: mergedBooks.length, filtered: filteredBooks.length };
    }
    return { total: mergedSeries.length, filtered: filteredSeries.length };
  }, [
    activeTab,
    activeAllSubTab,
    mergedReading.length,
    filteredReadingBooks.length,
    downloadBooks.length,
    filteredDownloadBooks.length,
    mergedBooks.length,
    filteredBooks.length,
    mergedSeries.length,
    filteredSeries.length,
  ]);

  useEffect(() => {
    document.getElementsByTagName('body')[0].style.background =
      'var(--theme-gradient, var(--background))';

    const loadData = async () => {
      setIsLoading(true);

      try {
        const books = await TauriAPI.getAllBooks();
        const realBooks = books.filter((b) => b.path && b.path.trim() !== '');
        setAllBooks(realBooks);
        setReadingBooks(realBooks.filter((b) => b.reading));

        const downloadPath = CosmicComicsTemp + '/downloads';
        setDownloadBooks(books.filter((b) => b.path?.includes(downloadPath)));
      } catch (e) {
        console.error('Failed to load books:', e);
      }

      try {
        const series = await TauriAPI.getAllSeries();
        setAllSeries(series);
      } catch (e) {
        console.error('Failed to load series:', e);
      }

      setIsLoading(false);
    };

    loadData();

    let alive = true;
    loadJellyfinLibrary(!!refreshKey)
      .then((data) => alive && setJellyfin(data))
      .catch((e) => console.error('Failed to load Jellyfin:', e));
    return () => {
      alive = false;
    };
  }, [CosmicComicsTemp, refreshKey]);

  const expiredServers = (jellyfin?.sources ?? []).filter((s) => s.expired);

  const openBook = (isBook: boolean, item: any, id: any) => {
    const ref = jellyfinRef(item);
    if (ref) onOpenJellyfin(navFor(ref, item.title));
    else handleOpenDetails(isBook, item, id);
  };
  const openSeries = (_isBook: boolean, item: any) => {
    const ref = jellyfinRef(item);
    if (ref) onOpenJellyfin(navFor(ref, item.title));
    else handleOpenSeries(true, item, item.provider_id);
  };

  return (
    <div id="home">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <TabsList>
            <TabsTrigger value="reading">{t('continue_reading')}</TabsTrigger>
            <TabsTrigger value="all">{t('ALL')}</TabsTrigger>
            <TabsTrigger value="downloads">{t('download')}</TabsTrigger>
          </TabsList>
          <Button size="sm" variant="outline" onClick={onOpenAPISelector}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">
              {t('add_a_new_manual_book')}
            </span>
            <span className="sr-only sm:hidden">
              {t('add_a_new_manual_book')}
            </span>
          </Button>
        </div>

        <SearchFilterBar
          state={filterState}
          onChange={setFilterState}
          totalCount={activeCounts.total}
          filteredCount={activeCounts.filtered}
          jellyfinSources={jellyfin?.sources}
        />

        {expiredServers.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <span className="flex-1">
              {t('jellyfin_expired_home', {
                name: expiredServers.map((s) => s.server.name).join(', '),
              })}
            </span>
            <Button size="sm" variant="outline" onClick={onOpenLibraries}>
              {t('libraries')}
            </Button>
          </div>
        )}

        <TabsContent value="all">
          <div className="p-3">
            {isLoading ? (
              <p>{t('loading')}...</p>
            ) : (
              <Tabs value={activeAllSubTab} onValueChange={setActiveAllSubTab}>
                <TabsList>
                  <TabsTrigger value="series">{t('series')}</TabsTrigger>
                  <TabsTrigger value="books">{t('books')}</TabsTrigger>
                </TabsList>

                <TabsContent value="series">
                  {filteredSeries.length === 0 ? (
                    <p className="text-muted-foreground py-4">
                      {t('nothingHere')}
                    </p>
                  ) : (
                    <VirtualizedCardGrid
                      items={filteredSeries}
                      handleOpenDetails={openSeries}
                    />
                  )}
                </TabsContent>

                <TabsContent value="books">
                  {filteredBooks.length === 0 ? (
                    <p className="text-muted-foreground py-4">
                      {t('nothingHere')}
                    </p>
                  ) : (
                    <VirtualizedCardGrid
                      items={filteredBooks}
                      handleOpenDetails={openBook}
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reading">
          <div className="p-3">
            {isLoading ? (
              <p>{t('loading')}...</p>
            ) : (
              <>
                <h2 id="continueReading" className="text-xl font-semibold mb-3">
                  {t('continue_reading')}
                </h2>
                {filteredReadingBooks.length === 0 ? (
                  <p className="text-muted-foreground">{t('nothingHere')}</p>
                ) : (
                  <VirtualizedCardGrid
                    items={filteredReadingBooks}
                    handleOpenDetails={openBook}
                  />
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="downloads">
          <div className="p-3">
            {isLoading ? (
              <p>{t('loading')}...</p>
            ) : filteredDownloadBooks.length === 0 ? (
              <p className="text-muted-foreground">{t('nothingHere')}</p>
            ) : (
              <VirtualizedCardGrid
                items={filteredDownloadBooks}
                handleOpenDetails={handleOpenDetails}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Home;

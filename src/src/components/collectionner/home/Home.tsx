import * as TauriAPI from '@/API/TauriAPI.ts';
import CardWrapper from '@/components/collectionner/card/CardWrapper.tsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';

type BookOrSeries = DisplayBook | DisplaySeries;
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Plus } from 'lucide-react';
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
}: {
  handleOpenDetails: any;
  handleOpenSeries: any;
  onOpenAPISelector: () => void;
  CosmicComicsTemp: string;
  refreshKey?: number;
}) {
  const { t } = useTranslation();
  const [allBooks, setAllBooks] = useState<DisplayBook[]>([]);
  const [allSeries, setAllSeries] = useState<DisplaySeries[]>([]);
  const [readingBooks, setReadingBooks] = useState<DisplayBook[]>([]);
  const [downloadBooks, setDownloadBooks] = useState<DisplayBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterState, setFilterState] =
    useState<SearchFilterState>(defaultFilterState);

  const filteredBooks = useMemo(
    () => applySearchFilterSort(allBooks, filterState),
    [allBooks, filterState]
  );
  const filteredSeries = useMemo(
    () => applySearchFilterSort(allSeries, filterState),
    [allSeries, filterState]
  );
  const filteredReadingBooks = useMemo(
    () => applySearchFilterSort(readingBooks, filterState),
    [readingBooks, filterState]
  );
  const filteredDownloadBooks = useMemo(
    () => applySearchFilterSort(downloadBooks, filterState),
    [downloadBooks, filterState]
  );

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
  }, [CosmicComicsTemp, refreshKey]);

  return (
    <div id="home">
      <Tabs defaultValue="reading">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="reading">{t('continue_reading')}</TabsTrigger>
            <TabsTrigger value="all">{t('ALL')}</TabsTrigger>
            <TabsTrigger value="downloads">{t('download')}</TabsTrigger>
          </TabsList>
          <Button size="sm" variant="outline" onClick={onOpenAPISelector}>
            <Plus className="h-4 w-4 mr-1" />
            {t('add_a_new_manual_book')}
          </Button>
        </div>

        <SearchFilterBar state={filterState} onChange={setFilterState} />

        <TabsContent value="all">
          <div className="p-3">
            {isLoading ? (
              <p>{t('loading')}...</p>
            ) : (
              <Tabs defaultValue="series">
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
                    <div className="cards-list">
                      {filteredSeries.map((series, index) => (
                        <CardWrapper
                          provider={series.provider_id}
                          handleOpenDetails={(
                            _open: boolean,
                            _s: BookOrSeries,
                            _id: string | number
                          ) => {
                            handleOpenSeries(true, series, series.provider_id);
                          }}
                          book={series}
                          key={index}
                          type="book"
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="books">
                  {filteredBooks.length === 0 ? (
                    <p className="text-muted-foreground py-4">
                      {t('nothingHere')}
                    </p>
                  ) : (
                    <div className="cards-list">
                      {filteredBooks.map((book, index) => (
                        <CardWrapper
                          provider={book.provider_id}
                          handleOpenDetails={handleOpenDetails}
                          book={book}
                          key={index}
                          type="book"
                        />
                      ))}
                    </div>
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
                  <div className="cards-list">
                    {filteredReadingBooks.map((book, index) => (
                      <CardWrapper
                        provider={book.provider_id}
                        handleOpenDetails={handleOpenDetails}
                        book={book}
                        key={index}
                        type="book"
                      />
                    ))}
                  </div>
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
              <div className="cards-list">
                {filteredDownloadBooks.map((book, index) => (
                  <CardWrapper
                    provider={book.provider_id}
                    handleOpenDetails={handleOpenDetails}
                    book={book}
                    key={index}
                    type="book"
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Home;

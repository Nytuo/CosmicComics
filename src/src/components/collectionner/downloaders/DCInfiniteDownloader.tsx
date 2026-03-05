import { useEffect, useState } from 'react';
import ContentViewer from '../details/ContentViewer.tsx';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import {
  clearSavedDCInfiniteCookies,
  closeDCInfiniteAuth,
  downloadDCInfiniteComic,
  getDCComicDetails,
  getDCSeriesComics,
  getDCInfiniteCookies,
  getDCInfiniteNewComics,
  loadDCNewComicsCache,
  saveDCNewComicsCache,
  hasSavedDCInfiniteCookies,
  loadSavedDCInfiniteCookies,
  openDCInfiniteAuth,
  searchDCInfiniteComics,
  searchDCInfiniteSeries,
} from '@/API/TauriAPI.ts';
import {
  IDCInfiniteComic,
  IDCInfiniteCookies,
  IDCInfiniteDownloadProgress,
  IDCInfiniteSeries,
} from '@/interfaces/IDCInfinite.ts';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import Logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI.ts';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs.tsx';
import { listen } from '@tauri-apps/api/event';

export default function DCInfiniteDownloader({
  CosmicComicsTemp,
}: {
  CosmicComicsTemp: string;
}) {
  const { t } = useTranslation();
  const [authenticated, setAuthenticated] = useState(false);
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const [authWindowLabel, setAuthWindowLabel] = useState<string>('');
  const [tabValue, setTabValue] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [comicResults, setComicResults] = useState<IDCInfiniteComic[]>([]);
  const [seriesResults, setSeriesResults] = useState<IDCInfiniteSeries[]>([]);
  const [downloadingComics, setDownloadingComics] = useState<
    Map<string, IDCInfiniteDownloadProgress>
  >(new Map());
  const [selectedComic, setSelectedComic] = useState<IDCInfiniteComic | null>(
    null
  );
  const [selectedSeries, setSelectedSeries] =
    useState<IDCInfiniteSeries | null>(null);
  const [seriesComics, setSeriesComics] = useState<IDCInfiniteComic[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newComics, setNewComics] = useState<IDCInfiniteComic[]>([]);
  const [loadingNewComics, setLoadingNewComics] = useState(false);
  const [newComicsCacheChecked, setNewComicsCacheChecked] = useState(false);

  useEffect(() => {
    const loadCookies = async () => {
      try {
        const hasCookies = (await hasSavedDCInfiniteCookies()) as boolean;
        if (hasCookies) {
          Logger.info('Loading saved DC Infinite cookies');
          const result =
            (await loadSavedDCInfiniteCookies()) as unknown as IDCInfiniteCookies;
          if (result.authenticated) {
            setCookies(result.cookies);
            setAuthenticated(true);
            ToasterHandler(t('Loaded saved authentication'), 'success');
          }
        }
      } catch (error) {
        Logger.error('Failed to load saved cookies: ' + JSON.stringify(error));
      }
    };

    loadCookies();
  }, [t]);

  const handleSelectComic = async (comic: IDCInfiniteComic) => {
    setLoadingDetails(true);
    try {
      const details = (await getDCComicDetails(
        comic.id,
        cookies
      )) as IDCInfiniteComic;
      setSelectedComic(details);
      setSelectedSeries(null);
    } catch (error) {
      Logger.error('Failed to fetch comic details: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to fetch comic details'), 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectSeries = async (series: IDCInfiniteSeries) => {
    setLoadingDetails(true);
    try {
      const comics = (await getDCSeriesComics(
        series.id,
        cookies
      )) as IDCInfiniteComic[];
      setSelectedSeries(series);
      setSeriesComics(comics);
      setSelectedComic(null);
    } catch (error) {
      Logger.error('Failed to fetch series comics: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to fetch series comics'), 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (tabValue !== '2') return;
    const fetchNewComics = async () => {
      setLoadingNewComics(true);
      try {
        if (!newComicsCacheChecked) {
          const cached = (await loadDCNewComicsCache(86400)) as
            | IDCInfiniteComic[]
            | null;
          setNewComicsCacheChecked(true);
          if (cached && cached.length > 0) {
            setNewComics(cached);
            setLoadingNewComics(false);
            return;
          }
        }
        const results = (await getDCInfiniteNewComics(
          cookies
        )) as IDCInfiniteComic[];
        setNewComics(results);
        saveDCNewComicsCache(results).catch((e) =>
          Logger.error('Failed to save new comics cache: ' + JSON.stringify(e))
        );
      } catch (error) {
        Logger.error('Failed to fetch new comics: ' + JSON.stringify(error));
        ToasterHandler(t('Failed to fetch new comics'), 'error');
      } finally {
        setLoadingNewComics(false);
      }
    };
    if (newComics.length === 0 || !newComicsCacheChecked) {
      fetchNewComics();
    }
  }, [tabValue, cookies, t, newComics.length, newComicsCacheChecked]);

  useEffect(() => {
    const unlisten = listen('dc-download-progress', (event: any) => {
      const progress = event.payload as IDCInfiniteDownloadProgress;

      if (
        progress.status === 'archiving' ||
        progress.status === 'files_downloaded'
      )
        return;

      Logger.info(
        `DC download progress for ${progress.comicId}: ${progress.status}`
      );

      setDownloadingComics((prev) => {
        const newMap = new Map(prev);
        newMap.set(progress.comicId, progress);
        return newMap;
      });

      if (progress.status === 'completed') {
        ToasterHandler(t('Downloaded') + ` ${progress.comicTitle}!`, 'success');
      } else if (progress.status === 'error' && progress.error) {
        ToasterHandler(progress.error, 'error');
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [t]);

  const handleOpenAuth = async () => {
    try {
      ToasterHandler(t('opening-dc-universe-infinite-login'), 'info');
      const windowLabel = await openDCInfiniteAuth();
      setAuthWindowLabel(windowLabel as unknown as string);
      ToasterHandler(t('Please log in to DC Universe Infinite'), 'info');
    } catch (error) {
      Logger.error('Failed to open auth window: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to open login window'), 'error');
    }
  };

  const handleGetCookies = async () => {
    if (!authWindowLabel) {
      ToasterHandler(t('No authentication window open'), 'error');
      return;
    }

    try {
      const result = (await getDCInfiniteCookies(
        authWindowLabel
      )) as unknown as IDCInfiniteCookies;

      setCookies(result.cookies);
      setAuthenticated(result.authenticated);

      if (result.authenticated) {
        ToasterHandler(t('successfully-authenticated'), 'success');
        await closeDCInfiniteAuth(authWindowLabel);
        setAuthWindowLabel('');
      } else {
        ToasterHandler(t('authentication-failed-please-try-again'), 'error');
      }
    } catch (error) {
      Logger.error('Failed to get cookies: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to retrieve authentication'), 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await clearSavedDCInfiniteCookies();
      setCookies({});
      setAuthenticated(false);
      setComicResults([]);
      setSeriesResults([]);
      ToasterHandler(t('Logged out successfully'), 'success');
    } catch (error) {
      Logger.error('Failed to logout: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to logout'), 'error');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      ToasterHandler(t('Please enter a search query'), 'warning');
      return;
    }

    if (!authenticated) {
      ToasterHandler(t('Please authenticate first'), 'warning');
      return;
    }

    setSearching(true);
    try {
      if (tabValue === '0') {
        const results = (await searchDCInfiniteComics(
          searchQuery,
          cookies
        )) as IDCInfiniteComic[];
        setComicResults(results);
        ToasterHandler(
          t('Found') + ` ${results.length} ` + t('comics'),
          'success'
        );
      } else {
        const results = (await searchDCInfiniteSeries(
          searchQuery,
          cookies
        )) as IDCInfiniteSeries[];
        setSeriesResults(results);
        ToasterHandler(
          t('Found') + ` ${results.length} ` + t('series'),
          'success'
        );
      }
    } catch (error) {
      Logger.error('Search failed: ' + JSON.stringify(error));
      ToasterHandler(t('Search failed'), 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadComic = async (comic: IDCInfiniteComic) => {
    try {
      ToasterHandler(t('Starting download for') + ` ${comic.title}...`, 'info');

      const progress: IDCInfiniteDownloadProgress = {
        comicId: comic.id,
        comicTitle: comic.title,
        currentPage: 0,
        totalPages: comic.pageCount || 0,
        status: 'downloading',
      };
      setDownloadingComics(new Map(downloadingComics.set(comic.id, progress)));

      const savePath = `${CosmicComicsTemp}/downloads/dc_infinite`;
      const result = (await downloadDCInfiniteComic({
        comicId: comic.id,
        comicTitle: comic.title,
        cookies: cookies,
        savePath: savePath,
      })) as unknown as string;

      setDownloadingComics((prev) => {
        const newMap = new Map(prev);
        newMap.set(comic.id, {
          ...progress,
          currentPage: progress.totalPages,
          status: 'db_inserting',
          message: t('saving-to-library'),
        });
        return newMap;
      });

      await insertComicIntoDB(comic, result);

      setDownloadingComics((prev) => {
        const newMap = new Map(prev);
        newMap.set(comic.id, {
          ...progress,
          currentPage: progress.totalPages,
          status: 'completed',
        });
        return newMap;
      });
      ToasterHandler(t('download-completed'), 'success');
    } catch (error) {
      Logger.error('Download failed: ' + JSON.stringify(error));
      ToasterHandler(t('Download failed'), 'error');

      const errProgress = downloadingComics.get(comic.id);
      if (errProgress) {
        setDownloadingComics((prev) => {
          const newMap = new Map(prev);
          newMap.set(comic.id, {
            ...errProgress,
            status: 'error',
            error: String(error),
          });
          return newMap;
        });
      }
    }
  };

  const getDownloadButtonForComic = (comic: IDCInfiniteComic) => {
    const progress = downloadingComics.get(comic.id);

    if (progress?.status === 'downloading') {
      return (
        <Badge variant="outline" className="gap-1">
          <Spinner size="sm" />
          {`${progress.currentPage}/${progress.totalPages}`}
        </Badge>
      );
    } else if (
      progress?.status === 'archiving' ||
      progress?.status === 'db_inserting'
    ) {
      return (
        <div className="flex flex-col items-end gap-1 min-w-30">
          <Badge variant="outline" className="gap-1 whitespace-nowrap">
            <Spinner size="sm" />
            {progress.message || t('Saving…')}
          </Badge>
          <Progress value={100} className="h-1 w-full animate-pulse" />
        </div>
      );
    } else if (progress?.status === 'completed') {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          {t('Downloaded')}
        </Badge>
      );
    } else if (progress?.status === 'error') {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadComic(comic);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      );
    } else {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="text-primary"
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadComic(comic);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      );
    }
  };

  const insertComicIntoDB = async (comic: IDCInfiniteComic, path: string) => {
    try {
      await TauriAPI.insertDCInfiniteBookToDB(comic, path);
      Logger.info(`Inserted comic ${comic.title} into database`);
    } catch (error) {
      Logger.error(
        'Failed to insert comic into database: ' + JSON.stringify(error)
      );
      throw error;
    }
  };

  const transformComicForViewer = (comic: IDCInfiniteComic) => {
    let enhancedDescription = comic.description || '';
    if (comic.rating || comic.format || comic.price) {
      enhancedDescription += '\n\n';
      if (comic.rating) enhancedDescription += `Rating: ${comic.rating}\n`;
      if (comic.format) enhancedDescription += `Format: ${comic.format}\n`;
      if (comic.price) enhancedDescription += `Price: ${comic.price}\n`;
    }

    return {
      id: comic.id,
      external_id: comic.id,
      provider_id: 9,
      provider_name: 'DC Universe Infinite',
      title: comic.title,
      cover_url: comic.coverUrl || '',
      description: enhancedDescription,
      creators: (comic.creators || []).map((c: string) => ({
        name: c,
        role: '',
      })),
      characters: [],
      note: null,
      read: false,
      reading: false,
      unread: true,
      favorite: false,
      path: '',
      issue_number: comic.issueNumber || '',
      format: comic.format || 'Comic',
      page_count: comic.pageCount || 0,
      lock: false,
      reading_progress: { last_page: 0, page_count: 0, percentage: 0 },
      series_id: null,
      extra: {
        urls: comic.seriesId
          ? [
              {
                url: `https://www.dcuniverseinfinite.com/comics/series/series/${comic.seriesId}`,
              },
            ]
          : [],
        series: comic.seriesTitle || '',
        dates: comic.publishDate || '',
      },
    } satisfies DisplayBook;
  };

  const transformSeriesForViewer = (series: IDCInfiniteSeries) => {
    return {
      id: series.id,
      external_id: series.id,
      provider_id: 9,
      provider_name: 'DC Universe Infinite',
      title: series.title,
      cover_url: series.coverUrl || '',
      bg_url: series.coverUrl || '',
      description: series.description || '',
      characters: [],
      staff: [],
      note: null,
      favorite: false,
      path: '',
      start_date: series.startYear || '',
      end_date: series.endYear || '',
      status: '',
      score: 0,
      genres: [],
      volumes: null,
      chapters: null,
      lock: false,
      book_count: series.issueCount || 0,
      read_count: 0,
      read_progress_text: '',
      extra: {},
    } satisfies DisplaySeries;
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">
        {t('DC Universe Infinite Downloader')}
      </h2>

      <div className="rounded-lg border border-orange-500/30 p-3 text-sm bg-orange-500/10 text-orange-500 flex items-start gap-2">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <strong>{t('VPN Required')}</strong>
          <p className="text-xs mt-1 opacity-80">
            {t('dc-universe-vpn-warning')}
          </p>
        </div>
      </div>

      {loadingDetails && (
        <p className="text-sm text-muted-foreground">{t('loading-details')}</p>
      )}

      {!authenticated ? (
        <div className="text-center py-8">
          <div className="rounded-lg border p-3 text-sm bg-blue-500/10 text-blue-500 mb-6">
            {t(
              'You need to authenticate with DC Universe Infinite to download comics'
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button onClick={handleOpenAuth} size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              {t('Open DC Universe Infinite Login')}
            </Button>
            {authWindowLabel && (
              <Button variant="outline" onClick={handleGetCookies}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('Confirm Authentication')}
              </Button>
            )}
          </div>
        </div>
      ) : selectedComic ? (
        <div>
          <Button
            variant="ghost"
            onClick={() => setSelectedComic(null)}
            className="mb-4"
          >
            ← {t('Back to search')}
          </Button>
          <ContentViewer
            provider={9}
            TheBook={transformComicForViewer(selectedComic)}
            type="volume"
            handleAddBreadcrumbs={() => {}}
            handleChangeToDetails={() => {}}
            onDownloaderDetailPage={() => handleDownloadComic(selectedComic)}
            downloadProgress={downloadingComics.get(selectedComic.id)}
          />
        </div>
      ) : selectedSeries ? (
        <div>
          <Button
            variant="ghost"
            onClick={() => setSelectedSeries(null)}
            className="mb-4"
          >
            ← {t('Back to search')}
          </Button>
          <ContentViewer
            provider={9}
            TheBook={transformSeriesForViewer(selectedSeries)}
            type="series"
            handleAddBreadcrumbs={() => {}}
            handleChangeToDetails={(_open, book) => {
              const comic = seriesComics.find((c) => c.id === book.id);
              if (comic) handleSelectComic(comic);
            }}
            preloadedBooks={seriesComics.map(transformComicForViewer)}
            onVolumeDownload={(book) => {
              const comic = seriesComics.find((c) => c.id === book.id);
              if (comic) handleDownloadComic(comic);
            }}
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="rounded-lg border p-3 text-sm bg-green-500/10 text-green-500 flex-1">
              {t('Authenticated with DC Universe Infinite')} ✓
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50 shrink-0"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('Logout')}
            </Button>
          </div>

          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList>
              <TabsTrigger value="0">{t('Comics')}</TabsTrigger>
              <TabsTrigger value="1">{t('SeriesDetails')}</TabsTrigger>
              <TabsTrigger value="2" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {t('New Comics')}
              </TabsTrigger>
            </TabsList>

            {tabValue !== '2' && (
              <div className="flex gap-2 mt-4 mb-4">
                <Input
                  placeholder={t('Search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {t('Search')}
                </Button>
              </div>
            )}

            <TabsContent value="0">
              {comicResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-comics-found')}
                </p>
              ) : (
                <div className="divide-y">
                  {comicResults.map((comic) => {
                    const progress = downloadingComics.get(comic.id);
                    return (
                      <div
                        key={comic.id}
                        className="flex items-center gap-3 py-2 px-2 cursor-pointer hover:bg-muted/50 rounded-md"
                        onClick={() => handleSelectComic(comic)}
                      >
                        <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
                          {comic.coverUrl ? (
                            <img
                              src={comic.coverUrl}
                              alt={comic.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {comic.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {`#${comic.issueNumber} ${comic.pageCount ? `- ${comic.pageCount} pages` : ''}`}
                          </p>
                          {progress?.status === 'downloading' && (
                            <Progress
                              value={
                                progress.totalPages > 0
                                  ? (progress.currentPage /
                                      progress.totalPages) *
                                    100
                                  : 0
                              }
                              className="mt-1 h-1"
                            />
                          )}
                        </div>
                        <div className="ml-2 shrink-0">
                          {getDownloadButtonForComic(comic)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="1">
              {seriesResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-series-found')}
                </p>
              ) : (
                <div className="divide-y">
                  {seriesResults.map((series) => (
                    <div
                      key={series.id}
                      className="flex items-center gap-3 py-2 px-2 cursor-pointer hover:bg-muted/50 rounded-md"
                      onClick={() => handleSelectSeries(series)}
                    >
                      <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
                        {series.coverUrl ? (
                          <img
                            src={series.coverUrl}
                            alt={series.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {series.title}
                        </p>
                        {series.startYear && (
                          <p className="text-xs text-muted-foreground">
                            {`${series.startYear} - ${series.endYear || t('Present')}`}
                          </p>
                        )}
                        {series.issueCount && (
                          <p className="text-xs text-muted-foreground">
                            {`${series.issueCount} ${t('issues')}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="2">
              <div className="flex items-center justify-between mt-4 mb-3">
                <p className="text-sm text-muted-foreground">
                  {newComics.length > 0
                    ? t('Showing') +
                      ` ${newComics.length} ` +
                      t('new comics from DC Universe Infinite')
                    : t('No new comics from DC Universe Infinite')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewComics([]);
                    setNewComicsCacheChecked(false);
                  }}
                  disabled={loadingNewComics}
                  className="gap-1"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingNewComics ? 'animate-spin' : ''}`}
                  />
                  {t('Refresh')}
                </Button>
              </div>

              {loadingNewComics ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Spinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    {t('loading-new-comics-from-dc-universe-infinite')}
                  </p>
                </div>
              ) : newComics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-new-comics-found')}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {newComics.map((comic) => (
                    <div
                      key={comic.id}
                      className="group cursor-pointer flex flex-col gap-1"
                      onClick={() => handleSelectComic(comic)}
                    >
                      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted">
                        {comic.coverUrl ? (
                          <img
                            src={comic.coverUrl}
                            alt={comic.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Sparkles className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {getDownloadButtonForComic(comic)}
                        </div>
                      </div>
                      <p className="text-xs font-medium leading-tight line-clamp-2">
                        {comic.title}
                      </p>
                      {comic.creators && comic.creators.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {comic.creators.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

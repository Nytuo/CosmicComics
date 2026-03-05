import { useEffect, useState } from 'react';
import ContentViewer from '../details/ContentViewer.tsx';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import {
  clearSavedVizCookies,
  closeVizAuth,
  downloadVizChapter,
  getVizChapterDetails,
  getVizSeriesChapters,
  getVizCookies,
  getVizLatestChapters,
  loadVizLatestCache,
  saveVizLatestCache,
  hasSavedVizCookies,
  loadSavedVizCookies,
  openVizAuth,
  searchVizManga,
  searchVizSeries,
} from '@/API/TauriAPI.ts';
import {
  IVizChapter,
  IVizCookies,
  IVizDownloadProgress,
  IVizSeries,
} from '@/interfaces/IViz.ts';
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

export default function VizDownloader({
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
  const [chapterResults, setChapterResults] = useState<IVizChapter[]>([]);
  const [seriesResults, setSeriesResults] = useState<IVizSeries[]>([]);
  const [downloadingChapters, setDownloadingChapters] = useState<
    Map<string, IVizDownloadProgress>
  >(new Map());
  const [selectedChapter, setSelectedChapter] = useState<IVizChapter | null>(
    null
  );
  const [selectedSeries, setSelectedSeries] = useState<IVizSeries | null>(null);
  const [seriesChapters, setSeriesChapters] = useState<IVizChapter[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [latestChapters, setLatestChapters] = useState<IVizChapter[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [latestCacheChecked, setLatestCacheChecked] = useState(false);

  useEffect(() => {
    const loadCookies = async () => {
      try {
        const hasCookies = (await hasSavedVizCookies()) as boolean;
        if (hasCookies) {
          Logger.info('Loading saved VIZ cookies');
          const result =
            (await loadSavedVizCookies()) as unknown as IVizCookies;
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

  const handleSelectChapter = async (chapter: IVizChapter) => {
    setLoadingDetails(true);
    try {
      const details = (await getVizChapterDetails(
        chapter.id,
        cookies
      )) as IVizChapter;
      setSelectedChapter(details);
      setSelectedSeries(null);
    } catch (error) {
      Logger.error('Failed to fetch chapter details: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to fetch chapter details'), 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectSeries = async (series: IVizSeries) => {
    setLoadingDetails(true);
    try {
      const chapters = (await getVizSeriesChapters(
        series.id,
        cookies
      )) as IVizChapter[];
      setSelectedSeries(series);
      setSeriesChapters(chapters);
      setSelectedChapter(null);
    } catch (error) {
      Logger.error('Failed to fetch series chapters: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to fetch series chapters'), 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (tabValue !== '2') return;
    const fetchLatest = async () => {
      setLoadingLatest(true);
      try {
        if (!latestCacheChecked) {
          const cached = (await loadVizLatestCache(86400)) as
            | IVizChapter[]
            | null;
          setLatestCacheChecked(true);
          if (cached && cached.length > 0) {
            setLatestChapters(cached);
            setLoadingLatest(false);
            return;
          }
        }
        const results = (await getVizLatestChapters(cookies)) as IVizChapter[];
        setLatestChapters(results);
        saveVizLatestCache(results).catch((e) =>
          Logger.error('Failed to save latest cache: ' + JSON.stringify(e))
        );
      } catch (error) {
        Logger.error(
          'Failed to fetch latest chapters: ' + JSON.stringify(error)
        );
        ToasterHandler(t('Failed to fetch latest chapters'), 'error');
      } finally {
        setLoadingLatest(false);
      }
    };
    if (latestChapters.length === 0 || !latestCacheChecked) {
      fetchLatest();
    }
  }, [tabValue, cookies, t, latestChapters.length, latestCacheChecked]);

  useEffect(() => {
    const unlisten = listen('viz-download-progress', (event: any) => {
      const progress = event.payload as IVizDownloadProgress;

      if (
        progress.status === 'archiving' ||
        progress.status === 'files_downloaded'
      )
        return;

      Logger.info(
        `VIZ download progress for ${progress.chapterId}: ${progress.status}`
      );

      setDownloadingChapters((prev) => {
        const newMap = new Map(prev);
        newMap.set(progress.chapterId, progress);
        return newMap;
      });

      if (progress.status === 'completed') {
        ToasterHandler(
          t('Downloaded') + ` ${progress.chapterTitle}!`,
          'success'
        );
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
      ToasterHandler(t('opening-viz-media-login'), 'info');
      const windowLabel = await openVizAuth();
      setAuthWindowLabel(windowLabel as unknown as string);
      ToasterHandler(t('Please log in to VIZ Media'), 'info');
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
      const result = (await getVizCookies(
        authWindowLabel
      )) as unknown as IVizCookies;

      setCookies(result.cookies);
      setAuthenticated(result.authenticated);

      if (result.authenticated) {
        ToasterHandler(t('successfully-authenticated'), 'success');
        await closeVizAuth(authWindowLabel);
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
      await clearSavedVizCookies();
      setCookies({});
      setAuthenticated(false);
      setChapterResults([]);
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
        const results = (await searchVizManga(
          searchQuery,
          cookies
        )) as IVizChapter[];
        setChapterResults(results);
        ToasterHandler(
          t('Found') + ` ${results.length} ` + t('chapters'),
          'success'
        );
      } else {
        const results = (await searchVizSeries(
          searchQuery,
          cookies
        )) as IVizSeries[];
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

  const handleDownloadChapter = async (chapter: IVizChapter) => {
    try {
      ToasterHandler(
        t('Starting download for') + ` ${chapter.title}...`,
        'info'
      );

      const progress: IVizDownloadProgress = {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        currentPage: 0,
        totalPages: chapter.pageCount || 0,
        status: 'downloading',
      };
      setDownloadingChapters(
        new Map(downloadingChapters.set(chapter.id, progress))
      );

      const savePath = `${CosmicComicsTemp}/downloads/viz`;
      const result = (await downloadVizChapter({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        cookies: cookies,
        savePath: savePath,
        seriesSlug: chapter.seriesId ?? undefined,
        chapterNumber: chapter.chapterNumber ?? undefined,
      })) as unknown as string;

      setDownloadingChapters((prev) => {
        const newMap = new Map(prev);
        newMap.set(chapter.id, {
          ...progress,
          currentPage: progress.totalPages,
          status: 'db_inserting',
          message: t('saving-to-library'),
        });
        return newMap;
      });

      await insertChapterIntoDB(chapter, result);

      setDownloadingChapters((prev) => {
        const newMap = new Map(prev);
        newMap.set(chapter.id, {
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

      const errProgress = downloadingChapters.get(chapter.id);
      if (errProgress) {
        setDownloadingChapters((prev) => {
          const newMap = new Map(prev);
          newMap.set(chapter.id, {
            ...errProgress,
            status: 'error',
            error: String(error),
          });
          return newMap;
        });
      }
    }
  };

  const getDownloadButtonForChapter = (chapter: IVizChapter) => {
    const progress = downloadingChapters.get(chapter.id);

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
            handleDownloadChapter(chapter);
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
            handleDownloadChapter(chapter);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      );
    }
  };

  const insertChapterIntoDB = async (chapter: IVizChapter, path: string) => {
    try {
      await TauriAPI.insertVizBookToDB(chapter, path);
      Logger.info(`Inserted chapter ${chapter.title} into database`);
    } catch (error) {
      Logger.error(
        'Failed to insert chapter into database: ' + JSON.stringify(error)
      );
      throw error;
    }
  };

  const transformChapterForViewer = (chapter: IVizChapter) => {
    let enhancedDescription = chapter.description || '';
    if (chapter.subscription) {
      enhancedDescription += `\n\nSubscription: ${chapter.subscription === 'shonenjump' ? 'Shonen Jump' : 'VIZ Manga'}`;
    }

    return {
      id: chapter.id,
      external_id: chapter.id,
      provider_id: 10,
      provider_name: 'VIZ Media',
      title: chapter.title,
      cover_url: chapter.coverUrl || '',
      description: enhancedDescription,
      creators: (chapter.creators || []).map((c: string) => ({
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
      issue_number: chapter.chapterNumber || '',
      format: 'Manga',
      page_count: chapter.pageCount || 0,
      lock: false,
      reading_progress: { last_page: 0, page_count: 0, percentage: 0 },
      series_id: null,
      extra: {
        urls: chapter.seriesId
          ? [
              {
                url: `https://www.viz.com/shonenjump/chapters/${chapter.seriesId}`,
              },
            ]
          : [],
        series: chapter.seriesTitle || '',
        dates: chapter.publishDate || '',
        subscription: chapter.subscription || '',
      },
    } satisfies DisplayBook;
  };

  const transformSeriesForViewer = (series: IVizSeries) => {
    return {
      id: series.id,
      external_id: series.id,
      provider_id: 10,
      provider_name: 'VIZ Media',
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
      book_count: series.chapterCount || 0,
      read_count: 0,
      read_progress_text: '',
      extra: {
        subscription: series.subscription || '',
      },
    } satisfies DisplaySeries;
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('VIZ Media Downloader')}</h2>

      <div className="rounded-lg border border-orange-500/30 p-3 text-sm bg-orange-500/10 text-orange-500 flex items-start gap-2">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <strong>{t('VPN Required')}</strong>
          <p className="text-xs mt-1 opacity-80">{t('viz-vpn-warning')}</p>
        </div>
      </div>

      {loadingDetails && (
        <p className="text-sm text-muted-foreground">{t('loading-details')}</p>
      )}

      {!authenticated ? (
        <div className="text-center py-8">
          <div className="rounded-lg border p-3 text-sm bg-blue-500/10 text-blue-500 mb-6">
            {t('viz-auth-needed')}
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button onClick={handleOpenAuth} size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              {t('Open VIZ Media Login')}
            </Button>
            {authWindowLabel && (
              <Button variant="outline" onClick={handleGetCookies}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('Confirm Authentication')}
              </Button>
            )}
          </div>
        </div>
      ) : selectedChapter ? (
        <div>
          <Button
            variant="ghost"
            onClick={() => setSelectedChapter(null)}
            className="mb-4"
          >
            ← {t('Back to search')}
          </Button>
          <ContentViewer
            provider={10}
            TheBook={transformChapterForViewer(selectedChapter)}
            type="volume"
            handleAddBreadcrumbs={() => {}}
            handleChangeToDetails={() => {}}
            onDownloaderDetailPage={() =>
              handleDownloadChapter(selectedChapter)
            }
            downloadProgress={downloadingChapters.get(selectedChapter.id)}
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
            provider={10}
            TheBook={transformSeriesForViewer(selectedSeries)}
            type="series"
            handleAddBreadcrumbs={() => {}}
            handleChangeToDetails={(_open, book) => {
              const chapter = seriesChapters.find((c) => c.id === book.id);
              if (chapter) handleSelectChapter(chapter);
            }}
            preloadedBooks={seriesChapters.map(transformChapterForViewer)}
            onVolumeDownload={(book) => {
              const chapter = seriesChapters.find((c) => c.id === book.id);
              if (chapter) handleDownloadChapter(chapter);
            }}
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="rounded-lg border p-3 text-sm bg-green-500/10 text-green-500 flex-1">
              {t('Authenticated with VIZ Media')} ✓
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
              <TabsTrigger value="0">{t('Chapters')}</TabsTrigger>
              <TabsTrigger value="1">{t('SeriesDetails')}</TabsTrigger>
              <TabsTrigger value="2" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {t('Latest')}
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
              {chapterResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-chapters-found')}
                </p>
              ) : (
                <div className="divide-y">
                  {chapterResults.map((chapter) => {
                    const progress = downloadingChapters.get(chapter.id);
                    return (
                      <div
                        key={chapter.id}
                        className="flex items-center gap-3 py-2 px-2 cursor-pointer hover:bg-muted/50 rounded-md"
                        onClick={() => handleSelectChapter(chapter)}
                      >
                        <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
                          {chapter.coverUrl ? (
                            <img
                              src={chapter.coverUrl}
                              alt={chapter.title}
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
                            {chapter.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {chapter.chapterNumber
                              ? `Ch. ${chapter.chapterNumber}`
                              : ''}
                            {chapter.subscription && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs py-0"
                              >
                                {chapter.subscription === 'shonenjump'
                                  ? 'Shonen Jump'
                                  : 'VIZ Manga'}
                              </Badge>
                            )}
                            {chapter.free && (
                              <Badge className="ml-1 text-xs py-0 bg-green-500/10 text-green-500 border-green-500/20">
                                {t('Free')}
                              </Badge>
                            )}
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
                          {getDownloadButtonForChapter(chapter)}
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
                        <div className="flex items-center gap-1">
                          {series.chapterCount && (
                            <p className="text-xs text-muted-foreground">
                              {`${series.chapterCount} ${t('chapters')}`}
                            </p>
                          )}
                          {series.subscription && (
                            <Badge variant="outline" className="text-xs py-0">
                              {series.subscription === 'shonenjump'
                                ? 'Shonen Jump'
                                : 'VIZ Manga'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="2">
              <div className="flex items-center justify-between mt-4 mb-3">
                <p className="text-sm text-muted-foreground">
                  {latestChapters.length > 0
                    ? t('Showing') +
                      ` ${latestChapters.length} ` +
                      t('latest chapters from VIZ')
                    : t('Latest chapters from VIZ')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLatestChapters([]);
                    setLatestCacheChecked(false);
                  }}
                  disabled={loadingLatest}
                  className="gap-1"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingLatest ? 'animate-spin' : ''}`}
                  />
                  {t('Refresh')}
                </Button>
              </div>

              {loadingLatest ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Spinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    {t('loading-latest-chapters-from-viz')}
                  </p>
                </div>
              ) : latestChapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-latest-chapters-found')}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {latestChapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="group cursor-pointer flex flex-col gap-1"
                      onClick={() => handleSelectChapter(chapter)}
                    >
                      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted">
                        {chapter.coverUrl ? (
                          <img
                            src={chapter.coverUrl}
                            alt={chapter.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Sparkles className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {getDownloadButtonForChapter(chapter)}
                        </div>
                        {chapter.free && (
                          <Badge className="absolute top-1 left-1 text-xs py-0 bg-green-500/90 text-white">
                            {t('Free')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-tight line-clamp-2">
                        {chapter.title}
                      </p>
                      {chapter.seriesTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {chapter.seriesTitle}
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

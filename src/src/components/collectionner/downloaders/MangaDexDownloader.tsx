import { useEffect, useState } from 'react';
import ContentViewer from '../details/ContentViewer.tsx';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import {
  clearSavedMangadexTokens,
  downloadMangadexChapter,
  getMangadexChapters,
  getMangadexMangaDetails,
  getMangadexRecentlyUpdated,
  hasSavedMangadexTokens,
  loadSavedMangadexTokens,
  mangadexAuthenticate,
  searchMangadexManga,
} from '@/API/TauriAPI.ts';
import * as TauriAPI from '@/API/TauriAPI.ts';
import {
  IMangaDexManga,
  IMangaDexChapter,
  IMangaDexAuth,
  IMangaDexDownloadProgress,
} from '@/interfaces/IMangaDex.ts';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import Logger from '@/logger.ts';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  Download,
  BookOpen,
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

export default function MangaDexDownloader({
  CosmicComicsTemp,
}: {
  CosmicComicsTemp: string;
}) {
  const { t } = useTranslation();
  const [authenticated, setAuthenticated] = useState(false);
  const [tabValue, setTabValue] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [mangaResults, setMangaResults] = useState<IMangaDexManga[]>([]);
  const [downloadingChapters, setDownloadingChapters] = useState<
    Map<string, IMangaDexDownloadProgress>
  >(new Map());
  const [selectedManga, setSelectedManga] = useState<IMangaDexManga | null>(
    null
  );
  const [mangaChapters, setMangaChapters] = useState<IMangaDexChapter[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [recentManga, setRecentManga] = useState<IMangaDexManga[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authClientId, setAuthClientId] = useState('');
  const [authClientSecret, setAuthClientSecret] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [useAuth, setUseAuth] = useState(false);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const hasTokens = (await hasSavedMangadexTokens()) as boolean;
        if (hasTokens) {
          Logger.info('Loading saved MangaDex tokens');
          const result = (await loadSavedMangadexTokens()) as IMangaDexAuth;
          if (result.authenticated) {
            setAuthenticated(true);
            setUseAuth(true);
            ToasterHandler(
              t('Loaded saved MangaDex authentication'),
              'success'
            );
          }
        }
      } catch (error) {
        Logger.error(
          'Failed to load saved MangaDex tokens: ' + JSON.stringify(error)
        );
      }
    };
    loadTokens();
  }, [t]);

  const handleSelectManga = async (manga: IMangaDexManga) => {
    setLoadingDetails(true);
    try {
      const details = (await getMangadexMangaDetails(
        manga.id
      )) as IMangaDexManga;
      const chapters = (await getMangadexChapters(
        manga.id
      )) as IMangaDexChapter[];
      setSelectedManga(details);
      setMangaChapters(chapters);
    } catch (error) {
      Logger.error('Failed to fetch manga details: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to fetch manga details'), 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (tabValue !== '1') return;
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const results =
          (await getMangadexRecentlyUpdated()) as IMangaDexManga[];
        setRecentManga(results);
        setRecentLoaded(true);
      } catch (error) {
        Logger.error('Failed to fetch recent manga: ' + JSON.stringify(error));
        ToasterHandler(t('Failed to fetch recent manga'), 'error');
      } finally {
        setLoadingRecent(false);
      }
    };
    if (!recentLoaded) {
      fetchRecent();
    }
  }, [tabValue, t, recentLoaded]);

  useEffect(() => {
    const unlisten = listen('mangadex-download-progress', (event: any) => {
      const progress = event.payload as IMangaDexDownloadProgress;

      if (progress.status === 'archiving') return;

      Logger.info(
        `Download progress for ${progress.chapterId}: ${progress.status}`
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

  const handleAuthenticate = async () => {
    if (!authUsername || !authPassword || !authClientId || !authClientSecret) {
      ToasterHandler(t('Please fill in all authentication fields'), 'warning');
      return;
    }

    setAuthLoading(true);
    try {
      const result = (await mangadexAuthenticate(
        authUsername,
        authPassword,
        authClientId,
        authClientSecret
      )) as IMangaDexAuth;

      if (result.authenticated) {
        setAuthenticated(true);
        setUseAuth(true);
        ToasterHandler(
          t('successfully-authenticated-with-mangadex'),
          'success'
        );
      } else {
        ToasterHandler(t('Authentication failed'), 'error');
      }
    } catch (error) {
      Logger.error('MangaDex auth failed: ' + JSON.stringify(error));
      ToasterHandler(t('Authentication failed'), 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSavedMangadexTokens();
      setAuthenticated(false);
      setUseAuth(false);
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

    setSearching(true);
    try {
      const results = (await searchMangadexManga(
        searchQuery
      )) as IMangaDexManga[];
      setMangaResults(results);
      ToasterHandler(
        t('Found') + ` ${results.length} ` + t('manga'),
        'success'
      );
    } catch (error) {
      Logger.error('Search failed: ' + JSON.stringify(error));
      ToasterHandler(t('Search failed'), 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadChapter = async (
    chapter: IMangaDexChapter,
    manga: IMangaDexManga
  ) => {
    try {
      const chapterLabel = chapter.chapter
        ? `Ch.${chapter.chapter}`
        : chapter.title || chapter.id.slice(0, 8);
      ToasterHandler(
        t('Starting download for') + ` ${manga.title} ${chapterLabel}...`,
        'info'
      );

      const progress: IMangaDexDownloadProgress = {
        chapterId: chapter.id,
        chapterTitle: chapterLabel,
        currentPage: 0,
        totalPages: chapter.pages || 0,
        status: 'downloading',
      };
      setDownloadingChapters(
        new Map(downloadingChapters.set(chapter.id, progress))
      );

      const savePath = `${CosmicComicsTemp}/downloads/mangadex`;
      const result = (await downloadMangadexChapter({
        chapterId: chapter.id,
        chapterTitle: chapterLabel,
        mangaId: manga.id,
        mangaTitle: manga.title,
        savePath: savePath,
        dataQuality: 'data',
      })) as string;

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

      await TauriAPI.insertMangadexBookToDB(manga, chapter, result);

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

  const getDownloadButtonForChapter = (
    chapter: IMangaDexChapter,
    manga: IMangaDexManga
  ) => {
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
            handleDownloadChapter(chapter, manga);
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
            handleDownloadChapter(chapter, manga);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      );
    }
  };
  const transformMangaForSeriesViewer = (
    manga: IMangaDexManga
  ): DisplaySeries => {
    return {
      id: manga.id,
      external_id: manga.id,
      provider_id: 7,
      provider_name: 'MangaDex',
      title: manga.title,
      cover_url: manga.coverUrl || '',
      bg_url: manga.coverUrl || '',
      description: manga.description || '',
      characters: [],
      staff: [
        ...(manga.authors || []).map((a) => ({ name: a, role: t('writer') })),
        ...(manga.artists || []).map((a) => ({ name: a, role: t('artist') })),
      ],
      note: null,
      favorite: false,
      path: '',
      start_date: manga.year?.toString() || '',
      end_date: '',
      status: manga.status || '',
      score: 0,
      genres: manga.tags || [],
      volumes: null,
      chapters: null,
      lock: false,
      book_count: mangaChapters.length,
      read_count: 0,
      read_progress_text: '',
      extra: {
        content_rating: manga.contentRating || '',
        demographic: manga.demographicTarget || '',
        original_language: manga.originalLanguage || '',
      },
    } satisfies DisplaySeries;
  };

  const transformChapterForViewer = (
    chapter: IMangaDexChapter,
    manga: IMangaDexManga
  ): DisplayBook => {
    const chapterTitle = chapter.chapter
      ? `${manga.title} Ch.${chapter.chapter}`
      : chapter.title || `${manga.title} - ${chapter.id.slice(0, 8)}`;

    return {
      id: chapter.id,
      external_id: chapter.id,
      provider_id: 7,
      provider_name: 'MangaDex',
      title: chapterTitle,
      cover_url: manga.coverUrl || '',
      description: chapter.title || '',
      creators: chapter.scanlationGroup
        ? [{ name: chapter.scanlationGroup, role: t('scanlation') }]
        : [],
      characters: [],
      note: null,
      read: false,
      reading: false,
      unread: true,
      favorite: false,
      path: '',
      issue_number: chapter.chapter || '',
      format: 'Manga',
      page_count: chapter.pages || 0,
      lock: false,
      reading_progress: { last_page: 0, page_count: 0, percentage: 0 },
      series_id: null,
      extra: {
        volume: chapter.volume || '',
        language: chapter.translatedLanguage || '',
        scanlation_group: chapter.scanlationGroup || '',
        publish_at: chapter.publishAt || '',
      },
    } satisfies DisplayBook;
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('MangaDex Downloader')}</h2>

      {loadingDetails && (
        <p className="text-sm text-muted-foreground">{t('loading-details')}</p>
      )}

      {selectedManga ? (
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedManga(null);
              setMangaChapters([]);
            }}
            className="mb-4"
          >
            ← {t('Back to search')}
          </Button>

          <ContentViewer
            provider={7}
            TheBook={transformMangaForSeriesViewer(selectedManga)}
            type="series"
            handleAddBreadcrumbs={() => {}}
            handleChangeToDetails={() => {}}
            preloadedBooks={mangaChapters.map((ch) =>
              transformChapterForViewer(ch, selectedManga)
            )}
            onVolumeDownload={(book) => {
              const chapter = mangaChapters.find((c) => c.id === book.id);
              if (chapter && selectedManga)
                handleDownloadChapter(chapter, selectedManga);
            }}
          />

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              {t('Chapters')} ({mangaChapters.length})
            </h3>
            {mangaChapters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('no-chapters-found-for-this-manga')}
              </p>
            ) : (
              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {mangaChapters.map((chapter) => {
                  const progress = downloadingChapters.get(chapter.id);
                  return (
                    <div
                      key={chapter.id}
                      className="flex items-center gap-3 py-2 px-2 hover:bg-muted/50 rounded-md"
                    >
                      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {chapter.volume && `Vol.${chapter.volume} `}
                          Ch.{chapter.chapter || '?'}
                          {chapter.title && ` - ${chapter.title}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chapter.scanlationGroup &&
                            `${chapter.scanlationGroup} • `}
                          {chapter.pages} {t('pages')}
                          {chapter.translatedLanguage &&
                            ` • ${chapter.translatedLanguage.toUpperCase()}`}
                        </p>
                        {progress?.status === 'downloading' && (
                          <Progress
                            value={
                              progress.totalPages > 0
                                ? (progress.currentPage / progress.totalPages) *
                                  100
                                : 0
                            }
                            className="mt-1 h-1"
                          />
                        )}
                      </div>
                      <div className="ml-2 shrink-0">
                        {getDownloadButtonForChapter(chapter, selectedManga)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {authenticated ? (
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="rounded-lg border p-3 text-sm bg-green-500/10 text-green-500 flex-1">
                {t('Authenticated with MangaDex')} ✓
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
          ) : (
            <div className="rounded-lg border p-3 text-sm bg-blue-500/10 text-blue-500 mb-4">
              <div className="flex items-center justify-between">
                <span>{t('mangadex-without-auth')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseAuth(!useAuth)}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {useAuth ? t('Hide Login') : t('Sign In')}
                </Button>
              </div>
              {useAuth && (
                <div className="mt-3 flex flex-col gap-2">
                  <Input
                    placeholder={t('Username')}
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('Password')}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                  <Input
                    placeholder={t('Client ID (personal-client-...)')}
                    value={authClientId}
                    onChange={(e) => setAuthClientId(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('Client Secret')}
                    value={authClientSecret}
                    onChange={(e) => setAuthClientSecret(e.target.value)}
                  />
                  <Button
                    onClick={handleAuthenticate}
                    disabled={authLoading}
                    className="w-full"
                  >
                    {authLoading ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {t('Authenticate')}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList>
              <TabsTrigger value="0">{t('Search')}</TabsTrigger>
              <TabsTrigger value="1" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {t('Recently Updated')}
              </TabsTrigger>
            </TabsList>

            {tabValue === '0' && (
              <div className="flex gap-2 mt-4 mb-4">
                <Input
                  placeholder={t('search-manga')}
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
              {mangaResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-manga-found')}
                </p>
              ) : (
                <div className="divide-y">
                  {mangaResults.map((manga) => (
                    <div
                      key={manga.id}
                      className="flex items-center gap-3 py-2 px-2 cursor-pointer hover:bg-muted/50 rounded-md"
                      onClick={() => handleSelectManga(manga)}
                    >
                      <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
                        {manga.coverUrl ? (
                          <img
                            src={manga.coverUrl}
                            alt={manga.title}
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
                          {manga.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {manga.status && `${manga.status} • `}
                          {manga.year && `${manga.year} • `}
                          {manga.contentRating}
                        </p>
                        {manga.authors && manga.authors.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {manga.authors.join(', ')}
                          </p>
                        )}
                      </div>
                      {manga.tags && manga.tags.length > 0 && (
                        <div className="hidden md:flex gap-1 flex-wrap max-w-50">
                          {manga.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="1">
              <div className="flex items-center justify-between mt-4 mb-3">
                <p className="text-sm text-muted-foreground">
                  {recentManga.length > 0
                    ? t('Showing') +
                      ` ${recentManga.length} ` +
                      t('recently updated manga')
                    : t('Recently updated manga')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRecentLoaded(false)}
                  disabled={loadingRecent}
                  className="gap-1"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${loadingRecent ? 'animate-spin' : ''}`}
                  />
                  {t('Refresh')}
                </Button>
              </div>

              {loadingRecent ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Spinner size="lg" />
                  <p className="text-sm text-muted-foreground">
                    {t('loading-recently-updated-manga')}
                  </p>
                </div>
              ) : recentManga.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-recent-manga-found')}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {recentManga.map((manga) => (
                    <div
                      key={manga.id}
                      className="group cursor-pointer flex flex-col gap-1"
                      onClick={() => handleSelectManga(manga)}
                    >
                      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted">
                        {manga.coverUrl ? (
                          <img
                            src={manga.coverUrl}
                            alt={manga.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Sparkles className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-tight line-clamp-2">
                        {manga.title}
                      </p>
                      {manga.authors && manga.authors.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {manga.authors.join(', ')}
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

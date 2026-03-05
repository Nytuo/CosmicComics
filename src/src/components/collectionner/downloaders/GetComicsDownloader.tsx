import { useEffect, useState } from 'react';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import {
  downloadGetcomics,
  getGetcomicsDetail,
  getGetcomicsLatest,
  insertGetcomicsBookToDB,
  loadGetcomicsLatestCache,
  saveGetcomicsLatestCache,
  searchGetcomics,
} from '@/API/TauriAPI.ts';
import type {
  IGetComicsPost,
  IGetComicsDetail,
  IGetComicsDownloadLink,
  IGetComicsDownloadProgress,
} from '@/interfaces/IGetComics.ts';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import Logger from '@/logger.ts';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
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
import ContentViewer from '../details/ContentViewer.tsx';

export default function GetComicsDownloader({
  CosmicComicsTemp,
}: {
  CosmicComicsTemp: string;
}) {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [postResults, setPostResults] = useState<IGetComicsPost[]>([]);
  const [latestPosts, setLatestPosts] = useState<IGetComicsPost[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [latestCacheChecked, setLatestCacheChecked] = useState(false);
  const [selectedPost, setSelectedPost] = useState<IGetComicsPost | null>(null);
  const [postDetail, setPostDetail] = useState<IGetComicsDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingPosts, setDownloadingPosts] = useState<
    Map<string, IGetComicsDownloadProgress>
  >(new Map());

  useEffect(() => {
    if (tabValue !== '1') return;
    const fetchLatest = async () => {
      setLoadingLatest(true);
      try {
        if (!latestCacheChecked) {
          const cached = (await loadGetcomicsLatestCache(86400)) as
            | IGetComicsPost[]
            | null;
          setLatestCacheChecked(true);
          if (cached && cached.length > 0) {
            setLatestPosts(cached);
            setLoadingLatest(false);
            return;
          }
        }
        const results = (await getGetcomicsLatest()) as IGetComicsPost[];
        setLatestPosts(results);
        await saveGetcomicsLatestCache(results);
      } catch (error) {
        Logger.error('Failed to fetch latest comics: ' + JSON.stringify(error));
        ToasterHandler(t('Failed to fetch latest comics'), 'error');
      } finally {
        setLoadingLatest(false);
      }
    };
    if (latestPosts.length === 0 || !latestCacheChecked) {
      fetchLatest();
    }
  }, [tabValue, t, latestPosts.length, latestCacheChecked]);

  useEffect(() => {
    const unlisten = listen('getcomics-download-progress', (event: any) => {
      const progress = event.payload as IGetComicsDownloadProgress;

      if (progress.status === 'archiving') return;

      Logger.info(
        `Download progress for ${progress.postId}: ${progress.status}`
      );

      setDownloadingPosts((prev) => {
        const newMap = new Map(prev);
        newMap.set(progress.postId, progress);
        return newMap;
      });

      if (progress.status === 'completed') {
        ToasterHandler(t('Downloaded') + ` ${progress.postTitle}!`, 'success');
      } else if (progress.status === 'error' && progress.error) {
        ToasterHandler(progress.error, 'error');
      }
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [t]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      ToasterHandler(t('Please enter a search query'), 'warning');
      return;
    }

    setSearching(true);
    try {
      const results = (await searchGetcomics(searchQuery)) as IGetComicsPost[];
      setPostResults(results);
      ToasterHandler(
        t('Found') + ` ${results.length} ` + t('comics'),
        'success'
      );
    } catch (error) {
      Logger.error('Search failed: ' + JSON.stringify(error));
      ToasterHandler(t('Search failed'), 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPost = async (post: IGetComicsPost) => {
    setLoadingDetail(true);
    setSelectedPost(post);
    try {
      const detail = (await getGetcomicsDetail(
        post.postUrl
      )) as IGetComicsDetail;
      setPostDetail(detail);
    } catch (error) {
      Logger.error('Failed to fetch post detail: ' + JSON.stringify(error));
      ToasterHandler(t('Failed to fetch post detail'), 'error');
      setPostDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownload = async (
    post: IGetComicsPost,
    link: IGetComicsDownloadLink
  ) => {
    try {
      ToasterHandler(t('Starting download for') + ` ${post.title}...`, 'info');

      const progress: IGetComicsDownloadProgress = {
        postId: post.id,
        postTitle: post.title,
        currentBytes: 0,
        totalBytes: 0,
        status: 'downloading',
      };
      setDownloadingPosts(new Map(downloadingPosts.set(post.id, progress)));

      const savePath = `${CosmicComicsTemp}/downloads/getcomics`;
      const result = (await downloadGetcomics({
        postId: post.id,
        postTitle: post.title,
        downloadUrl: link.url,
        savePath: savePath,
      })) as string;

      setDownloadingPosts((prev) => {
        const newMap = new Map(prev);
        newMap.set(post.id, {
          ...progress,
          status: 'db_inserting',
          message: t('saving-to-library'),
        });
        return newMap;
      });

      await insertGetcomicsBookToDB(post, postDetail, result);

      setDownloadingPosts((prev) => {
        const newMap = new Map(prev);
        newMap.set(post.id, {
          ...progress,
          status: 'completed',
        });
        return newMap;
      });
      ToasterHandler(t('download-completed'), 'success');
    } catch (error) {
      Logger.error('Download failed: ' + JSON.stringify(error));
      ToasterHandler(t('Download failed'), 'error');

      const errProgress = downloadingPosts.get(post.id);
      if (errProgress) {
        setDownloadingPosts((prev) => {
          const newMap = new Map(prev);
          newMap.set(post.id, {
            ...errProgress,
            status: 'error',
            error: String(error),
          });
          return newMap;
        });
      }
    }
  };

  const getDownloadStatusBadge = (postId: string) => {
    const progress = downloadingPosts.get(postId);
    if (!progress) return null;

    if (progress.status === 'downloading') {
      const pct =
        progress.totalBytes > 0
          ? Math.round((progress.currentBytes / progress.totalBytes) * 100)
          : 0;
      return (
        <Badge variant="outline" className="gap-1">
          <Spinner size="sm" />
          {progress.totalBytes > 0 ? `${pct}%` : t('Downloading…')}
        </Badge>
      );
    } else if (progress.status === 'db_inserting') {
      return (
        <Badge variant="outline" className="gap-1">
          <Spinner size="sm" />
          {progress.message || t('Saving…')}
        </Badge>
      );
    } else if (progress.status === 'completed') {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          {t('Downloaded')}
        </Badge>
      );
    } else if (progress.status === 'error') {
      return <Badge variant="destructive">{t('Error')}</Badge>;
    }
    return null;
  };

  const formatFileSize = (sizeStr?: string): string => {
    if (!sizeStr) return '';
    return sizeStr;
  };

  const transformPostForViewer = (post: IGetComicsPost): DisplayBook => {
    return {
      id: post.id,
      external_id: post.id,
      provider_id: 8,
      provider_name: 'GetComics',
      title: post.title,
      cover_url: post.coverUrl || '',
      description: post.description || '',
      creators: [],
      characters: [],
      note: null,
      read: false,
      reading: false,
      unread: true,
      favorite: false,
      path: '',
      issue_number: '',
      format: 'Comic',
      page_count: 0,
      lock: false,
      reading_progress: { last_page: 0, page_count: 0, percentage: 0 },
      series_id: null,
      extra: {
        post_url: post.postUrl || '',
        category: post.category || '',
        year: post.year || '',
        size: post.size || '',
      },
    } satisfies DisplayBook;
  };

  const renderPostCard = (post: IGetComicsPost, onClick: () => void) => (
    <div
      key={post.id}
      className="flex items-center gap-3 py-2 px-2 cursor-pointer hover:bg-muted/50 rounded-md"
      onClick={onClick}
    >
      <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
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
        <p className="text-sm font-medium truncate">{post.title}</p>
        <p className="text-xs text-muted-foreground">
          {post.category && `${post.category} • `}
          {post.year && `${post.year} • `}
          {formatFileSize(post.size)}
        </p>
        {post.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {post.description}
          </p>
        )}
      </div>
      <div className="ml-2 shrink-0 flex items-center gap-2">
        {getDownloadStatusBadge(post.id)}
        {post.date && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {post.date}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('GetComics Downloader')}</h2>

      <div className="rounded-lg border p-3 text-sm bg-blue-500/10 text-blue-500 mb-2">
        {t('getcomics-warning')}
      </div>

      {selectedPost ? (
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedPost(null);
              setPostDetail(null);
            }}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('Back to search')}
          </Button>

          {loadingDetail ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">
                {t('loading-post-details')}
              </p>
            </div>
          ) : (
            <>
              <ContentViewer
                provider={8}
                TheBook={transformPostForViewer(selectedPost)}
                type="volume"
                handleAddBreadcrumbs={() => {}}
                handleChangeToDetails={() => {}}
              />

              {postDetail && postDetail.downloadLinks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">
                    {t('Download Links')}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {postDetail.downloadLinks.map((link, idx) => {
                      const isDirectOrMega =
                        link.linkType === 'direct' || link.linkType === 'mega';
                      const progress = downloadingPosts.get(selectedPost.id);
                      const isDownloading =
                        progress?.status === 'downloading' ||
                        progress?.status === 'db_inserting';

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {link.label}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {link.linkType.toUpperCase()}
                            </Badge>
                          </div>
                          {isDirectOrMega && link.linkType === 'direct' ? (
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isDownloading}
                              onClick={() => handleDownload(selectedPost, link)}
                            >
                              {isDownloading ? (
                                <Spinner size="sm" className="mr-2" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              {t('Download')}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(link.url, '_blank');
                              }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t('Open')}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {downloadingPosts.get(selectedPost.id)?.status ===
                    'downloading' && (
                    <div className="mt-4">
                      <Progress
                        value={
                          (downloadingPosts.get(selectedPost.id)?.totalBytes ??
                            0) > 0
                            ? ((downloadingPosts.get(selectedPost.id)
                                ?.currentBytes ?? 0) /
                                (downloadingPosts.get(selectedPost.id)
                                  ?.totalBytes ?? 1)) *
                              100
                            : 0
                        }
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {downloadingPosts.get(selectedPost.id)?.message ||
                          t('Downloading')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {postDetail?.tags && postDetail.tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('Tags')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {postDetail.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {postDetail && (
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  {postDetail.language && (
                    <p>
                      <strong>{t('Language')}:</strong> {postDetail.language}
                    </p>
                  )}
                  {postDetail.format && (
                    <p>
                      <strong>{t('Format')}:</strong> {postDetail.format}
                    </p>
                  )}
                  {postDetail.size && (
                    <p>
                      <strong>{t('Size')}:</strong> {postDetail.size}
                    </p>
                  )}
                  {postDetail.year && (
                    <p>
                      <strong>{t('Year')}:</strong> {postDetail.year}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList>
              <TabsTrigger value="0">{t('Search')}</TabsTrigger>
              <TabsTrigger value="1" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {t('Latest Comics')}
              </TabsTrigger>
            </TabsList>

            {tabValue === '0' && (
              <div className="flex gap-2 mt-4 mb-4">
                <Input
                  placeholder={t('search-comics')}
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
              {postResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-comics-found')}
                </p>
              ) : (
                <div className="divide-y">
                  {postResults.map((post) =>
                    renderPostCard(post, () => handleSelectPost(post))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="1">
              <div className="flex items-center justify-between mt-4 mb-3">
                <p className="text-sm text-muted-foreground">
                  {latestPosts.length > 0
                    ? t('Showing') +
                      ` ${latestPosts.length} ` +
                      t('latest comics')
                    : t('Latest comics')}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLatestCacheChecked(false);
                    setLatestPosts([]);
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
                    {t('loading-latest-comics')}
                  </p>
                </div>
              ) : latestPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('no-latest-comics-found')}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {latestPosts.map((post) => (
                    <div
                      key={post.id}
                      className="group cursor-pointer flex flex-col gap-1"
                      onClick={() => handleSelectPost(post)}
                    >
                      <div className="relative aspect-2/3 overflow-hidden rounded-md bg-muted">
                        {post.coverUrl ? (
                          <img
                            src={post.coverUrl}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Sparkles className="h-8 w-8" />
                          </div>
                        )}
                        {getDownloadStatusBadge(post.id) && (
                          <div className="absolute top-1 right-1">
                            {getDownloadStatusBadge(post.id)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-tight line-clamp-2">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {post.category}
                        {post.size && ` • ${post.size}`}
                      </p>
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

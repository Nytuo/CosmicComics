import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpen,
  Pencil,
  Heart,
  ExternalLink,
  RefreshCw,
  SearchCheck,
  CloudDownload,
  Star,
  Calendar,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { ActionButton } from '../../../common/ActionButton.tsx';
import type { BookOrSeries } from './useContentViewer';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { providerEnum } from '@/utils/utils.ts';
import type { IMarvelUnlimitedDownloadProgress } from '@/interfaces/IMarvelUnlimited';
import type { IDCInfiniteDownloadProgress } from '@/interfaces/IDCInfinite';
import type { IVizDownloadProgress } from '@/interfaces/IViz';
import { openPath } from '@tauri-apps/plugin-opener';
import { ToasterHandler } from '../../../common/ToasterHandler.tsx';
import { getProvider } from '@/API/providers/ProviderRegistry.ts';

interface HeroCardProps {
  TheBook: BookOrSeries;
  type: 'series' | 'volume';
  provider: number;
  externalUrl: string | null;
  coverUrl: string;
  title: string;
  dateDisplay: React.ReactNode;
  rating: number | null;
  favorite: boolean;
  hasFile: boolean | string | null;
  downloadProgress?:
    | IMarvelUnlimitedDownloadProgress
    | IDCInfiniteDownloadProgress
    | IVizDownloadProgress;
  onDownloaderDetailPage?: (comic: any) => void;
  onPlay: () => void;
  onFavoriteToggle: () => void;
  onStatusRead: () => void;
  onStatusReading: () => void;
  onStatusUnread: () => void;
  onRatingChange: (star: number) => void;
  onEditClick: () => void;
  onRefreshMeta: () => void;
  onRematchClick: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  statusBadge: React.ReactNode;
}

export function HeroCard({
  TheBook,
  type,
  provider,
  externalUrl,
  coverUrl,
  title,
  dateDisplay,
  rating,
  favorite,
  hasFile,
  downloadProgress: downloadProgress,
  onDownloaderDetailPage: onDownloaderDetailPage,
  onPlay,
  onFavoriteToggle,
  onStatusRead,
  onStatusReading,
  onStatusUnread,
  onRatingChange,
  onEditClick,
  onRefreshMeta,
  onRematchClick,
  onDelete,
  onBack,
  statusBadge,
}: HeroCardProps) {
  const { t } = useTranslation();
  const isVolume = type === 'volume';
  const book = TheBook as DisplayBook;
  const series = TheBook as DisplaySeries;

  return (
    <>
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="fixed top-0 m-2 z-50 gap-1.5 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-md mb-4 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{t('back')}</span>
        </Button>
      )}

      <Card className="overflow-hidden border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-6 p-6">
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="relative group">
                <img
                  id="ImgColCover"
                  src={coverUrl}
                  alt={title}
                  className="rounded-lg shadow-2xl object-contain w-48 h-72 md:w-56 md:h-80 transition-transform"
                />
                {hasFile && isVolume && (
                  <button
                    onClick={onPlay}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                  >
                    <div className="bg-primary rounded-full p-3 shadow-lg">
                      <BookOpen className="h-8 w-8 text-primary-foreground fill-primary-foreground" />
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                  {externalUrl ? (
                    <a
                      href={externalUrl}
                      target="_blank"
                      className="hover:underline inline-flex items-center gap-1.5"
                    >
                      {title}
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </a>
                  ) : (
                    title
                  )}
                </h1>

                {(provider === providerEnum.MarvelUnlimited ||
                  provider === providerEnum.DCInfinite ||
                  provider === providerEnum.Viz) &&
                  onDownloaderDetailPage && (
                    <div className="mt-2">
                      {downloadProgress?.status === 'downloading' ? (
                        <Badge variant="outline" className="gap-1">
                          <Spinner size="sm" />
                          {`${downloadProgress.currentPage}/${downloadProgress.totalPages}`}
                        </Badge>
                      ) : downloadProgress?.status === 'archiving' ||
                        downloadProgress?.status === 'db_inserting' ? (
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="outline"
                            className="gap-1 whitespace-nowrap w-fit"
                          >
                            <Spinner size="sm" />
                            {downloadProgress.message || t('Saving…')}
                          </Badge>
                          <Progress
                            value={100}
                            className="h-1 w-full animate-pulse"
                          />
                        </div>
                      ) : downloadProgress?.status === 'completed' ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          {t('downloaded')}
                        </Badge>
                      ) : downloadProgress?.status === 'error' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDownloaderDetailPage(TheBook)}
                        >
                          <CloudDownload className="h-4 w-4 mr-2" />
                          {t('retry-download')}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => onDownloaderDetailPage(TheBook)}
                          size="sm"
                        >
                          <CloudDownload className="h-4 w-4 mr-2" />
                          {t(
                            'Download from ' +
                              getProvider(provider)?.badgeName ||
                              'unknown-provider'
                          )}
                        </Button>
                      )}
                    </div>
                  )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {statusBadge}
                {favorite && (
                  <Badge variant="destructive">
                    <Heart className="h-3 w-3 mr-1 fill-current" />
                    {t('favorite')}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{dateDisplay}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 cursor-pointer transition-colors ${
                      rating !== null && star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground hover:text-yellow-300'
                    }`}
                    onClick={() => onRatingChange(star)}
                  />
                ))}
              </div>

              {type === 'series' &&
                provider !== providerEnum.Marvel &&
                series.score != null &&
                series.score !== 0 && (
                  <div className="flex items-center gap-3">
                    <div className="relative inline-flex items-center justify-center w-14 h-14">
                      <svg className="w-14 h-14 -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-muted-foreground/20"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-primary"
                          strokeDasharray={`${2 * Math.PI * 22}`}
                          strokeDashoffset={`${2 * Math.PI * 22 * (1 - series.score / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-sm font-semibold">
                        {Math.round(series.score)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                )}

              <Separator />

              <div className="space-y-3">
                {isVolume && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onPlay}
                      disabled={!hasFile}
                      className="gap-1.5"
                    >
                      <BookOpen className="h-4 w-4" />
                      {hasFile ? t('mkread') : t('noFile')}
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <ActionButton
                      type="done"
                      status={book.read}
                      onClick={onStatusRead}
                      unsettext={t('mkread')}
                      settext={t('READ')}
                    />
                    <ActionButton
                      type="doing"
                      status={book.reading}
                      onClick={onStatusReading}
                      unsettext={t('mkreading')}
                      settext={t('READING')}
                    />
                    <ActionButton
                      type="todo"
                      status={book.unread}
                      onClick={onStatusUnread}
                      unsettext={t('mkunread')}
                      settext={t('mkunread')}
                    />
                    <ActionButton
                      type="favorite"
                      status={favorite}
                      onClick={onFavoriteToggle}
                      unsettext={t('toogle_fav')}
                      settext={t('favoriteParenthesis')}
                    />
                  </div>
                )}

                {!isVolume && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionButton
                        type="favorite"
                        status={favorite}
                        onClick={onFavoriteToggle}
                        unsettext={t('toogle_fav')}
                        settext={t('favoriteParenthesis')}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t(
                        'Use the volumes below to mark individual issues as read'
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1 w-fit">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEditClick}
                    className="gap-1.5 h-8 px-2.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">
                      {t('EDIT')}
                    </span>
                  </Button>

                  <Separator orientation="vertical" className="h-5" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await openPath(TheBook.path);
                      } catch (error) {
                        console.error(error);
                        ToasterHandler(t('errorOpeningFolder'), 'error');
                      }
                    }}
                    className="gap-1.5 h-8 px-2.5"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">
                      {t('open-folder')}
                    </span>
                  </Button>

                  {provider !== providerEnum.MANUAL && !isNaN(provider) && (
                    <>
                      <Separator orientation="vertical" className="h-5" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefreshMeta}
                        className="gap-1.5 h-8 px-2.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">
                          {t('refreshMetadata')}
                        </span>
                      </Button>
                    </>
                  )}

                  {provider !== providerEnum.MANUAL && !isNaN(provider) && (
                    <>
                      <Separator orientation="vertical" className="h-5" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRematchClick}
                        className="gap-1.5 h-8 px-2.5"
                      >
                        <SearchCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-xs">
                          {t('rematch')}
                        </span>
                      </Button>
                    </>
                  )}

                  {(provider === providerEnum.MANUAL || isNaN(provider)) &&
                    onDelete && (
                      <>
                        <Separator orientation="vertical" className="h-5" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={onDelete}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">
                            {t('DELETE')}
                          </span>
                        </Button>
                      </>
                    )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

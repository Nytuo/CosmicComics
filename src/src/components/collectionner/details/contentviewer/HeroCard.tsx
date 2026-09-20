import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpen,
  Pencil,
  Heart,
  ExternalLink,
  RefreshCw,
  SearchCheck,
  Star,
  Calendar,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ActionButton } from '../../../common/ActionButton.tsx';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { providerEnum } from '@/utils/utils.ts';
import { openPath } from '@tauri-apps/plugin-opener';
import { ToasterHandler } from '../../../common/ToasterHandler.tsx';
import { useMobileLayout } from '@/hooks/use-mobile-layout.ts';
import MobileHeroCard from '@/components/mobile/MobileHeroCard.tsx';
import { DownloaderAction, type HeroCardProps } from './heroShared.tsx';

function DesktopHeroCard({
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
  remote,
  playLabel,
  extraActions,
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
          className="fixed top-[calc(env(safe-area-inset-top)+3.5rem)] md:top-0 m-2 z-50 gap-1.5 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-md mb-4 w-fit"
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

                <DownloaderAction
                  TheBook={TheBook}
                  provider={provider}
                  downloadProgress={downloadProgress}
                  onDownloaderDetailPage={onDownloaderDetailPage}
                />
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

              {!remote && (
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
              )}

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
                      {playLabel ?? (hasFile ? t('mkread') : t('noFile'))}
                    </Button>
                    {extraActions}
                    <Separator orientation="vertical" className="h-6" />
                    <ActionButton
                      type="done"
                      status={book.read}
                      onClick={onStatusRead}
                      unsettext={t('mkread')}
                      settext={t('READ')}
                    />
                    {onStatusReading && (
                      <ActionButton
                        type="doing"
                        status={book.reading}
                        onClick={onStatusReading}
                        unsettext={t('mkreading')}
                        settext={t('READING')}
                      />
                    )}
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

                {!remote && (
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
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function HeroCard(props: HeroCardProps) {
  const mobile = useMobileLayout();
  return mobile ? (
    <MobileHeroCard {...props} />
  ) : (
    <DesktopHeroCard {...props} />
  );
}

import * as React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Circle,
  ExternalLink,
  FolderOpen,
  Heart,
  MoreHorizontal,
  Pencil,
  Play,
  RefreshCw,
  SearchCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openPath } from '@tauri-apps/plugin-opener';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import {
  DownloaderAction,
  type HeroCardProps,
} from '@/components/collectionner/details/contentviewer/heroShared.tsx';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { providerEnum } from '@/utils/utils.ts';
import { cn } from '@/lib/utils.ts';
import ActionSheet, { type SheetAction } from './ActionSheet.tsx';

/**
 * Phone version of the book / series header: blurred cover backdrop, centred
 * poster, a full-width read button and big one-tap status tiles. Editing
 * tools live behind a "more" sheet so the first screen stays uncluttered.
 */
export default function MobileHeroCard({
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
  downloadProgress,
  onDownloaderDetailPage,
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
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const isVolume = type === 'volume';
  const book = TheBook as DisplayBook;
  const editable = provider === providerEnum.MANUAL || isNaN(provider);

  const resumePage =
    isVolume && book.reading && book.reading_progress?.last_page > 0
      ? book.reading_progress.last_page + 1
      : null;
  const readLabel =
    playLabel ??
    (!hasFile
      ? t('noFile')
      : resumePage
        ? `${t('nav_resume')} · ${t('nav_page_short', { page: resumePage })}`
        : t('mkread'));

  const tools: SheetAction[] = [
    {
      id: 'edit',
      label: t('EDIT'),
      icon: Pencil,
      hidden: remote,
      onSelect: () => onEditClick?.(),
    },
    {
      id: 'folder',
      label: t('open-folder'),
      icon: FolderOpen,
      hidden: remote,
      onSelect: async () => {
        try {
          await openPath(TheBook.path);
        } catch (error) {
          console.error(error);
          ToasterHandler(t('errorOpeningFolder'), 'error');
        }
      },
    },
    {
      id: 'refresh',
      label: t('refreshMetadata'),
      icon: RefreshCw,
      hidden: remote || editable,
      onSelect: () => onRefreshMeta?.(),
    },
    {
      id: 'rematch',
      label: t('rematch'),
      icon: SearchCheck,
      hidden: remote || editable,
      onSelect: () => onRematchClick?.(),
    },
    {
      id: 'delete',
      label: t('DELETE'),
      icon: Trash2,
      tone: 'danger',
      hidden: remote || !editable || !onDelete,
      onSelect: () => onDelete?.(),
    },
  ];
  const hasTools = tools.some((tool) => !tool.hidden);

  const tiles: {
    id: string;
    label: string;
    icon: React.ElementType;
    active: boolean;
    onClick?: () => void;
  }[] = isVolume
    ? [
        {
          id: 'read',
          label: t('READ'),
          icon: Check,
          active: book.read,
          onClick: onStatusRead,
        },
        ...(onStatusReading
          ? [
              {
                id: 'reading',
                label: t('READING'),
                icon: BookOpen,
                active: book.reading,
                onClick: onStatusReading,
              },
            ]
          : []),
        {
          id: 'unread',
          label: t('mkunread'),
          icon: Circle,
          active: book.unread,
          onClick: onStatusUnread,
        },
        {
          id: 'favorite',
          label: t('favorite'),
          icon: Heart,
          active: favorite,
          onClick: onFavoriteToggle,
        },
      ]
    : [
        {
          id: 'favorite',
          label: t('favorite'),
          icon: Heart,
          active: favorite,
          onClick: onFavoriteToggle,
        },
      ];

  return (
    <div className="-mx-4 -mt-4">
      <div className="relative overflow-hidden pb-2">
        <div
          aria-hidden
          className="absolute inset-0 scale-150 bg-cover bg-center opacity-50 blur-3xl"
          style={{ backgroundImage: `url("${coverUrl}")` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-transparent via-background/40 to-background"
        />
        <div className="relative flex flex-col items-center px-4 pt-6">
          {remote && onBack && (
            <button
              type="button"
              aria-label={t('back')}
              onClick={onBack}
              className="absolute top-3 left-3 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <img
            id="ImgColCover"
            src={coverUrl}
            alt={title}
            className="h-64 w-auto max-w-[70%] rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
          />
          <h2 className="mt-5 text-center text-2xl leading-tight font-bold tracking-tight">
            {externalUrl ? (
              <a
                href={externalUrl}
                target="_blank"
                className="inline-flex items-center gap-1.5"
              >
                {title}
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              </a>
            ) : (
              title
            )}
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            {statusBadge}
            {favorite && (
              <Badge variant="destructive">
                <Heart className="mr-1 size-3 fill-current" />
                {t('favorite')}
              </Badge>
            )}
            <span>{dateDisplay}</span>
          </div>
          <DownloaderAction
            TheBook={TheBook}
            provider={provider}
            downloadProgress={downloadProgress}
            onDownloaderDetailPage={onDownloaderDetailPage}
          />

          {!remote && (
            <div
              className="mt-3 flex items-center gap-1"
              role="radiogroup"
              aria-label={t('rating')}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star}`}
                  onClick={() => onRatingChange(star)}
                  className="flex size-10 items-center justify-center rounded-full active:bg-accent"
                >
                  <Star
                    className={cn(
                      'size-6 transition-colors',
                      rating !== null && star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/60'
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4">
        {isVolume && (
          <div className="flex items-center gap-2">
            <Button
              size="lg"
              onClick={onPlay}
              disabled={!hasFile}
              className="h-12 min-w-0 flex-1 rounded-full bg-secondary text-base font-semibold text-secondary-foreground hover:bg-secondary/90"
            >
              <Play className="size-5 fill-current" />
              <span className="truncate">{readLabel}</span>
            </Button>
            {extraActions}
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <div
            className="grid min-w-0 flex-1 gap-2"
            style={{
              gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
            }}
          >
            {tiles.map(({ id, label, icon: Icon, active, onClick }) => (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={onClick}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[11px] font-medium transition-all active:scale-95',
                  active
                    ? 'border-secondary/60 bg-secondary/15 text-foreground'
                    : 'border-border bg-card/60 text-muted-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'size-5',
                    active && id === 'favorite' && 'fill-red-500 text-red-500',
                    active && id !== 'favorite' && 'text-secondary'
                  )}
                />
                <span className="max-w-full truncate">{label}</span>
              </button>
            ))}
          </div>
          {hasTools && (
            <button
              type="button"
              aria-label={t('tools')}
              onClick={() => setToolsOpen(true)}
              className="flex w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card/60 active:scale-95"
            >
              <MoreHorizontal className="size-5" />
            </button>
          )}
        </div>
        {!isVolume && (
          <p className="text-center text-xs text-muted-foreground">
            {t('Use the volumes below to mark individual issues as read')}
          </p>
        )}
      </div>

      <ActionSheet
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        title={title}
        actions={tools}
      />
    </div>
  );
}

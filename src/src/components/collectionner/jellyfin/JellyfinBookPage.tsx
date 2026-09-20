import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Check, Info, RotateCcw, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import JellyfinDownloadDialog, {
  type DownloadState,
} from './JellyfinDownloadDialog.tsx';
import { HeroCard } from '@/components/collectionner/details/contentviewer/HeroCard.tsx';
import { DetailsCard } from '@/components/collectionner/details/contentviewer/DetailsCard.tsx';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as JellyfinAPI from '@/API/JellyfinAPI';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { toDisplayBook } from '@/API/jellyfinLibrary.ts';
import { providerEnum } from '@/utils/utils.ts';

interface Props {
  serverId: string;
  item: JellyfinAPI.JellyfinItem;
  onBack: () => void;
  onChanged: () => void;
  onUnauthorized: () => void;
}

export default function JellyfinBookPage({
  serverId,
  item,
  onBack,
  onChanged,
  onUnauthorized,
}: Props) {
  const { t } = useTranslation();
  const [book, setBook] = React.useState(item);
  const [opening, setOpening] = React.useState(false);
  const [download, setDownload] = React.useState<DownloadState>({
    written: 0,
    total: null,
  });

  React.useEffect(() => {
    setBook(item);
    let alive = true;
    JellyfinAPI.getItem(serverId, item.id)
      .then((full) => alive && setBook(full))
      .catch((e) => {
        if (JellyfinAPI.isUnauthorized(e)) onUnauthorized();
      });
    return () => {
      alive = false;
    };
  }, [serverId, item, onUnauthorized]);

  const unsupported = !JellyfinAPI.isReadable(book);
  const canResume = JellyfinAPI.hasProgress(book);
  const isEpub = book.format?.toLowerCase() === 'epub';

  async function read(fromStart: boolean) {
    if (unsupported) {
      ToasterHandler(
        t('jellyfin_unsupported_format', { format: book.format }),
        'error'
      );
      return;
    }
    setOpening(true);
    setDownload({ written: 0, total: null });
    const stop = await JellyfinAPI.onDownloadProgress((p) => {
      if (p.item_id === book.id) {
        setDownload({ written: p.written, total: p.total });
      }
    });
    try {
      const prepared = await JellyfinAPI.prepareBook(serverId, book.id);
      JellyfinAPI.openInViewer(
        fromStart
          ? { ...prepared, resume_page: 0, resume_fraction: 0 }
          : prepared,
        {
          serverId,
          itemId: book.id,
          title: book.name,
          seriesName: book.series_name,
          format: prepared.format,
        }
      );
    } catch (e) {
      if (JellyfinAPI.isUnauthorized(e)) onUnauthorized();
      else
        ToasterHandler(`${t('jellyfin_open_failed')}: ${String(e)}`, 'error');
      setOpening(false);
    } finally {
      stop();
    }
  }

  async function update(change: () => Promise<void>) {
    try {
      await change();
      setBook(await JellyfinAPI.getItem(serverId, book.id));
      onChanged();
    } catch (e) {
      if (JellyfinAPI.isUnauthorized(e)) onUnauthorized();
      else ToasterHandler(String(e), 'error');
    }
  }

  const displayBook: DisplayBook = {
    ...toDisplayBook(
      { serverId, serverName: '', libraryId: '', libraryName: '' },
      book
    ),
    cover_url: book.image_tag
      ? JellyfinAPI.coverUrl(serverId, book.id, book.image_tag, 600)
      : '',
  };
  const status = book.played
    ? {
        variant: 'default' as const,
        icon: <Check className="h-3 w-3 mr-1" />,
        text: 'READ',
      }
    : canResume
      ? {
          variant: 'secondary' as const,
          icon: <BookOpen className="h-3 w-3 mr-1" />,
          text: 'READING',
        }
      : {
          variant: 'destructive' as const,
          icon: <X className="h-3 w-3 mr-1" />,
          text: 'mkunread',
        };
  const date = book.year ?? book.date_created?.slice(0, 4) ?? '';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <HeroCard
        remote
        TheBook={displayBook}
        type="volume"
        provider={providerEnum.MANUAL}
        externalUrl={null}
        coverUrl={displayBook.cover_url || '/Images/fileDefault.png'}
        title={book.name}
        dateDisplay={date || 'Jellyfin'}
        rating={null}
        favorite={book.favorite}
        hasFile={!unsupported}
        onPlay={() => read(false)}
        playLabel={
          canResume
            ? isEpub
              ? t('jellyfin_resume_percent', {
                  percent: Math.round(book.resume_fraction * 100),
                })
              : t('jellyfin_resume_page', { page: book.resume_page + 1 })
            : undefined
        }
        extraActions={
          canResume ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => read(true)}
              disabled={opening}
            >
              <RotateCcw className="h-4 w-4" />
              {t('jellyfin_start_over')}
            </Button>
          ) : undefined
        }
        onFavoriteToggle={() =>
          update(() =>
            JellyfinAPI.setFavorite(serverId, book.id, !book.favorite)
          )
        }
        onStatusRead={() =>
          update(() => JellyfinAPI.setPlayed(serverId, book.id, true))
        }
        onStatusUnread={() =>
          update(() => JellyfinAPI.setPlayed(serverId, book.id, false))
        }
        onRatingChange={() => {}}
        onBack={onBack}
        statusBadge={
          <Badge variant={status.variant}>
            {status.icon}
            {t(status.text)}
          </Badge>
        }
      />

      <JellyfinDownloadDialog
        open={opening}
        title={book.name}
        state={download}
      />
      {unsupported && (
        <p className="text-sm text-destructive">
          {t('jellyfin_unsupported_format', { format: book.format })}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {book.overview.trim() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t('description')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-justify text-sm leading-relaxed">
                  {book.overview}
                </p>
              </CardContent>
            </Card>
          )}

          {book.people.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('Staff')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {book.people.map((p, i) => (
                  <Badge key={`${p.name}-${i}`} variant="outline">
                    {p.role ? `${p.name} · ${p.role}` : p.name}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <DetailsCard
            TheBook={displayBook}
            type="volume"
            provider={providerEnum.MANUAL}
            isValid={(v) =>
              v !== null && v !== undefined && v !== '' && v !== 0
            }
            hasValidPrices={() => false}
            getSeriesName={() => book.series_name ?? ''}
          />
          {book.genres.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Genres')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {book.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">Jellyfin</p>
    </div>
  );
}

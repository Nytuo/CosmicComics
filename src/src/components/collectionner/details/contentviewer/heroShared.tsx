import { useTranslation } from 'react-i18next';
import { CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import type { BookOrSeries } from './useContentViewer';
import { providerEnum } from '@/utils/utils.ts';
import type { IMarvelUnlimitedDownloadProgress } from '@/interfaces/IMarvelUnlimited';
import type { IDCInfiniteDownloadProgress } from '@/interfaces/IDCInfinite';
import type { IVizDownloadProgress } from '@/interfaces/IViz';
import { getProvider } from '@/API/providers/ProviderRegistry.ts';

export interface HeroCardProps {
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
  onStatusReading?: () => void;
  onStatusUnread: () => void;
  onRatingChange: (star: number) => void;
  onEditClick?: () => void;
  onRefreshMeta?: () => void;
  onRematchClick?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  statusBadge: React.ReactNode;
  remote?: boolean;
  playLabel?: string;
  extraActions?: React.ReactNode;
}

/** Provider download button / progress badge for downloadable (remote) items. */
export function DownloaderAction({
  TheBook,
  provider,
  downloadProgress,
  onDownloaderDetailPage,
}: Pick<
  HeroCardProps,
  'TheBook' | 'provider' | 'downloadProgress' | 'onDownloaderDetailPage'
>) {
  const { t } = useTranslation();
  if (
    !onDownloaderDetailPage ||
    (provider !== providerEnum.MarvelUnlimited &&
      provider !== providerEnum.DCInfinite &&
      provider !== providerEnum.Viz)
  ) {
    return null;
  }

  return (
    <div className="mt-2">
      {downloadProgress?.status === 'downloading' ? (
        <Badge variant="outline" className="gap-1">
          <Spinner size="sm" />
          {`${downloadProgress.currentPage}/${downloadProgress.totalPages}`}
        </Badge>
      ) : downloadProgress?.status === 'archiving' ||
        downloadProgress?.status === 'db_inserting' ? (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="gap-1 whitespace-nowrap w-fit">
            <Spinner size="sm" />
            {downloadProgress.message || t('Saving…')}
          </Badge>
          <Progress value={100} className="h-1 w-full animate-pulse" />
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
        <Button onClick={() => onDownloaderDetailPage(TheBook)} size="sm">
          <CloudDownload className="h-4 w-4 mr-2" />
          {t(
            'Download from ' + getProvider(provider)?.badgeName ||
              'unknown-provider'
          )}
        </Button>
      )}
    </div>
  );
}

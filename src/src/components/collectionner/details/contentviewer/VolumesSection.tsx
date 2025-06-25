import { useTranslation } from 'react-i18next';
import { BookCopy, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CardWrapper from '../../card/CardWrapper.tsx';
import type { BookOrSeries, OpenExplorerState } from './useContentViewer';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { providerEnum } from '@/utils/utils.ts';

interface VolumesSectionProps {
  openExplorer: OpenExplorerState;
  type: 'series' | 'volume';
  provider: number;
  showPlaceholders: boolean;
  onTogglePlaceholders: () => void;
  handleChangeToDetails?: (
    open: boolean,
    book: BookOrSeries,
    provider: any
  ) => void;
  onVolumeDownload?: (book: DisplayBook) => void;
}

export function VolumesSection({
  openExplorer,
  type,
  provider,
  showPlaceholders,
  onTogglePlaceholders,
  handleChangeToDetails,
  onVolumeDownload,
}: VolumesSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookCopy className="h-4 w-4" />
            {t('volumes')}
          </CardTitle>
          {type === 'series' && provider === providerEnum.Metron && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePlaceholders}
              className="gap-1.5"
            >
              {showPlaceholders
                ? t('Hide Placeholders')
                : t('Show Placeholders')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="cards-list" id="ContainerExplorer">
          {openExplorer.explorer
            .filter((book) => {
              if (type !== 'series' || provider !== providerEnum.Metron)
                return true;
              const isPlaceholder =
                !book.path || book.path === '' || book.path === 'null';
              return showPlaceholders || !isPlaceholder;
            })
            .map((book, index) => {
              const isPlaceholder =
                !book.path || book.path === '' || book.path === 'null';
              return (
                <div
                  key={index}
                  className="relative"
                  style={{
                    opacity:
                      isPlaceholder &&
                      type === 'series' &&
                      provider === providerEnum.Metron
                        ? 0.4
                        : 1,
                  }}
                >
                  <CardWrapper
                    type="book"
                    provider={openExplorer.provider}
                    book={book}
                    handleOpenDetails={handleChangeToDetails}
                  />
                  {isPlaceholder && onVolumeDownload && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onVolumeDownload(book);
                      }}
                      className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                      title={t('download')}
                    >
                      <CloudDownload className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

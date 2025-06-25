import { useTranslation } from 'react-i18next';
import {
  Hash,
  BookOpen,
  BookCopy,
  Info,
  TrendingUp,
  DollarSign,
  Palette,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { BookOrSeries } from './useContentViewer';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

interface DetailsCardProps {
  TheBook: BookOrSeries;
  type: 'series' | 'volume';
  provider: number;
  isValid: (val: any) => boolean;
  hasValidPrices: () => boolean;
  getSeriesName: () => string;
}

export function DetailsCard({
  TheBook,
  type,
  provider,
  isValid,
  hasValidPrices,
  getSeriesName,
}: DetailsCardProps) {
  const { t } = useTranslation();
  const isSeries = type === 'series';
  const isBook = type !== 'series';
  const book = TheBook as DisplayBook;
  const series = TheBook as DisplaySeries;
  const extra = TheBook.extra as Record<string, any> | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('details')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSeries && series.genres?.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Palette className="h-3.5 w-3.5" />
              {t('Genres')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {series.genres.map((genre: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {isBook && isValid(book.issue_number) && (
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {type === 'volume'
                ? t('Numberofthisvolumewithintheseries') + book.issue_number
                : (provider === providerEnum.Marvel
                    ? t('NumberComics')
                    : t('NumberChapter')) + book.issue_number}
            </span>
          </div>
        )}

        {isSeries && isValid(series.chapters) && (
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {(provider === providerEnum.Marvel
                ? t('NumberComics')
                : t('NumberChapter')) + series.chapters}
            </span>
          </div>
        )}

        {isBook && isValid(book.format) && (
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {book.format}
              {book.page_count ? ` · ${book.page_count} ${t('pages')}` : ''}
            </span>
          </div>
        )}

        {type === 'volume' && (
          <div className="flex items-center gap-2">
            <BookCopy className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {t('Thisispartofthe')} <strong>'{getSeriesName()}'</strong>{' '}
              {t('series')}.
            </span>
          </div>
        )}

        {isSeries && provider === providerEnum.Marvel && (
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {t('ThisseriesIDfromMarvel')}: {TheBook.external_id}
            </span>
          </div>
        )}

        {isSeries && isValid(series.volumes) && (
          <div className="flex items-center gap-2">
            <BookCopy className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {t('numberOfVolume')}: {series.volumes}
            </span>
          </div>
        )}

        {isValid(extra?.trending) && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              {t('trending')}: {extra?.trending as string}
            </span>
          </div>
        )}

        {hasValidPrices() && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                {t('prices')}
              </div>
              {(Array.isArray(extra?.prices)
                ? extra.prices
                : tryToParse(extra?.prices)
              ).map((price: { type: string; price: string }, index: number) => (
                <p key={index} className="text-sm">
                  {price.type.replace(/([A-Z])/g, ' $1').trim()}: ${price.price}
                </p>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

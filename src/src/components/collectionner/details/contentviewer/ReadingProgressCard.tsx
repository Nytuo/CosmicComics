import { useTranslation } from 'react-i18next';
import { BookOpen, BookCopy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import * as TauriAPI from '@/API/TauriAPI';
import { ToasterHandler } from '../../../common/ToasterHandler.tsx';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';

interface ReadingProgressCardProps {
  type: 'series' | 'volume';
  book?: DisplayBook;
  readStatSeries: string;
  getReadingProgress: () => number;
}

export function ReadingProgressCard({
  type,
  book,
  readStatSeries,
  getReadingProgress,
}: ReadingProgressCardProps) {
  const { t } = useTranslation();

  if (type === 'volume') {
    if (!book) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t('reading-progress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              step={1}
              min={0}
              max={book.page_count}
              defaultValue={book.reading_progress?.last_page ?? 0}
              className="w-24"
              onBlur={async (e) => {
                await TauriAPI.updateReadingProgress(
                  book.id,
                  parseInt(e.target.value)
                ).catch((err) => {
                  ToasterHandler(err, 'error');
                });
              }}
            />
            <span className="text-sm text-muted-foreground">
              / {book.page_count} {t('pages')}
            </span>
          </div>
          <Progress value={getReadingProgress()} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {getReadingProgress()}% {t('pagesRead')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookCopy className="h-4 w-4" />
          {t('progress')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{readStatSeries}</p>
      </CardContent>
    </Card>
  );
}

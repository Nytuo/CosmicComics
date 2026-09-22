import * as React from 'react';
import { Download, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/spinner.tsx';
import VirtualizedCardGrid from '@/components/collectionner/card/VirtualizedCardGrid.tsx';
import { useLibraryData } from '@/components/collectionner/home/useLibraryData.ts';
import {
  applySearchFilterSort,
  defaultFilterState,
} from '@/components/collectionner/home/SearchFilterBar.tsx';
import {
  jellyfinRef,
  navFor,
  type JellyfinNav,
} from '@/API/jellyfinLibrary.ts';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import MobileCard from './MobileCard.tsx';

interface MobileOfflineProps {
  handleOpenDetails: (open: boolean, book: DisplayBook, provider: any) => void;
  onOpenJellyfin: (nav: JellyfinNav) => void;
  CosmicComicsTemp: string;
  refreshKey?: number;
}

/**
 * Books readable without a network: Jellyfin books kept on the device and
 * books fetched by the downloaders.
 */
export default function MobileOffline({
  handleOpenDetails,
  onOpenJellyfin,
  CosmicComicsTemp,
  refreshKey,
}: MobileOfflineProps) {
  const { t } = useTranslation();
  const { downloads, isLoading } = useLibraryData(CosmicComicsTemp, refreshKey);
  const [query, setQuery] = React.useState('');

  const shown = React.useMemo(
    () => applySearchFilterSort(downloads, { ...defaultFilterState, query }),
    [downloads, query]
  );

  const open = (book: DisplayBook) => {
    const ref = jellyfinRef(book);
    if (ref) onOpenJellyfin(navFor(ref, book.title));
    else handleOpenDetails(true, book, book.provider_id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-7" />
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-muted">
          <Download className="size-9 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{t('offline_empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          enterKeyHint="search"
          placeholder={t('searchInLibrary')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 w-full rounded-full border border-border/70 bg-muted/60 pr-10 pl-10 text-base outline-none placeholder:text-muted-foreground focus:border-secondary [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label={t('reset')}
            onClick={() => setQuery('')}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {t('offline_count', { count: downloads.length })}
      </p>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          {t('nothingHere')}
        </p>
      ) : (
        <VirtualizedCardGrid
          items={shown}
          handleOpenDetails={() => {}}
          rowEstimate={250}
          renderItem={(item) => (
            <MobileCard
              key={item.id}
              item={item}
              onOpen={() => open(item as DisplayBook)}
            />
          )}
        />
      )}
    </div>
  );
}

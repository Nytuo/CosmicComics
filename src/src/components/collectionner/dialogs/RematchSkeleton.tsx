import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import * as TauriAPI from '@/API/TauriAPI.ts';
import CardWrapper from '@/components/collectionner/card/CardWrapper.tsx';
import { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { getProvider, getAllProviders } from '@/API/providers';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

function makeDisplayBookFromSearch(result: {
  id: string;
  title: string;
  coverUrl: string | null;
}): DisplayBook {
  return {
    id: '',
    external_id: result.id,
    provider_id: 0,
    provider_name: '',
    title: result.title,
    path: '',
    cover_url: result.coverUrl ?? '',
    description: '',
    issue_number: '',
    format: '',
    page_count: 0,
    creators: [],
    characters: [],
    read: false,
    reading: false,
    unread: true,
    favorite: false,
    note: null,
    lock: false,
    reading_progress: { last_page: 0, page_count: 0, percentage: 0 },
    extra: {},
    series_id: null,
  };
}

function getRematchableProviders(type: 'book' | 'series') {
  return getAllProviders().filter((p) => {
    if (type === 'book') return p.canRematchBook && !!p.searchBooks;
    return p.canRematchSeries && !!p.searchSeries;
  });
}

/**
 * A component that allows the user to search for a book or a series in different APIs and rematch it with a different provider.
 * The user can switch API provider via a dropdown. The search adapts to the provider's capabilities
 * (e.g. Anilist supports series only, OpenLibrary supports books only).
 *
 * @param provider - The initial provider to use for the rematch.
 * @param type - The type of the search (book or series).
 * @param oldID - The ID of the existing item to rematch.
 * @param isNewBookMode - When true, inserts a new book via the provider instead of rematching an existing one.
 * @param onSuccess - Callback fired after a successful rematch or insert.
 */
export default function RematchSkeleton({
  provider,
  type,
  oldID,
  isNewBookMode = false,
  onSuccess,
}: {
  provider: number;
  type: 'book' | 'series';
  oldID: string;
  isNewBookMode?: boolean;
  onSuccess?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [selectedProvider, setSelectedProvider] =
    React.useState<number>(provider);
  const [rematchResult, setRematchResult] = React.useState<
    { book: DisplayBook; onclick: () => void }[]
  >([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [yearQuery, setYearQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  const rematchableProviders = React.useMemo(
    () => getRematchableProviders(type),
    [type]
  );
  const currentProviderImpl = React.useMemo(
    () => getProvider(selectedProvider),
    [selectedProvider]
  );

  const handleSearch = React.useCallback(async () => {
    if (!currentProviderImpl) {
      ToasterHandler(t('providerCannotRematch'), 'error');
      return;
    }

    if (!searchQuery.trim()) return;

    setRematchResult([]);
    setIsSearching(true);

    try {
      if (type === 'book') {
        if (
          !currentProviderImpl.canRematchBook ||
          !currentProviderImpl.searchBooks
        ) {
          ToasterHandler(t('providerCannotRematch'), 'error');
          return;
        }
        const results = await currentProviderImpl.searchBooks(
          searchQuery,
          yearQuery || undefined
        );
        console.log('[RematchSkeleton] Search results for books:', results);
        const items = results.map((result) => ({
          book: makeDisplayBookFromSearch(result),
          onclick: async () => {
            try {
              if (isNewBookMode) {
                await TauriAPI.insertNewBookByProvider(
                  result.id,
                  selectedProvider
                );
                ToasterHandler(t('rematchSuccess'), 'success');
              } else {
                await TauriAPI.rematchItem(
                  oldID,
                  result.id,
                  selectedProvider,
                  'book'
                );
                ToasterHandler(t('rematchSuccess'), 'success');
              }
              if (onSuccess) await onSuccess();
            } catch (err) {
              ToasterHandler(String(err), 'error');
            }
          },
        }));
        setRematchResult(items);
      } else if (type === 'series') {
        if (
          !currentProviderImpl.canRematchSeries ||
          !currentProviderImpl.searchSeries
        ) {
          ToasterHandler(t('providerCannotRematch'), 'error');
          return;
        }
        const results = await currentProviderImpl.searchSeries(
          searchQuery,
          yearQuery || undefined
        );
        console.log('[RematchSkeleton] Search results for series:', results);
        const items = results.map((result) => ({
          book: makeDisplayBookFromSearch(result),
          onclick: async () => {
            try {
              await TauriAPI.rematchItem(
                oldID,
                result.id,
                selectedProvider,
                'series'
              );
              ToasterHandler(t('rematchSuccess'), 'success');
              if (onSuccess) await onSuccess();
            } catch (err) {
              ToasterHandler(String(err), 'error');
            }
          },
        }));
        setRematchResult(items);
      }
    } catch (err) {
      ToasterHandler(String(err), 'error');
    } finally {
      setIsSearching(false);
    }
  }, [
    currentProviderImpl,
    searchQuery,
    t,
    type,
    yearQuery,
    isNewBookMode,
    onSuccess,
    selectedProvider,
    oldID,
  ]);

  return (
    <div className="mt-5 space-y-4">
      <div className="space-y-1">
        <Label>{t('switchProvider')}</Label>
        <Select
          value={String(selectedProvider)}
          onValueChange={(value) => {
            setSelectedProvider(parseInt(value, 10));
            setRematchResult([]);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('selectAProvider')} />
          </SelectTrigger>
          <SelectContent>
            {rematchableProviders.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="rematchSearch">
          {type === 'series'
            ? t('nameOfTheSeries')
            : t('searchTitleInTheLibrarysApi')}
        </Label>
        <Input
          id="rematchSearch"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="rematchYearSearch">{t('yearOptional')}</Label>
        <Input
          id="rematchYearSearch"
          value={yearQuery}
          onChange={(e) => setYearQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
      </div>

      <Button
        id="rematchSearchSender"
        disabled={isSearching || !searchQuery.trim()}
        onClick={handleSearch}
      >
        {isSearching ? t('loading') + '...' : t('search')}
      </Button>

      <div
        id="resultRematch"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
      >
        {rematchResult.map(({ book, onclick }, index) => {
          return (
            <CardWrapper
              provider={selectedProvider}
              key={index}
              book={book}
              onClick={onclick}
              type="lite"
            />
          );
        })}
      </div>
    </div>
  );
}

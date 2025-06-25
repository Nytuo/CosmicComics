import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Label } from '@/components/ui/label.tsx';
import { ArrowDownAZ, ArrowUpAZ, Filter, Search, Star, X } from 'lucide-react';
import {
  DisplayBook,
  DisplayCreator,
  DisplayCharacter,
} from '@/interfaces/IDisplayBook.ts';
import type { DisplaySeries } from '@/interfaces/IDisplayBook.ts';

export type SortField = 'name' | 'note' | 'date' | 'favorite' | 'trending';
export type SortOrder = 'asc' | 'desc';

export interface ReadingStatusFilter {
  read: boolean;
  reading: boolean;
  unread: boolean;
}

export interface SearchFilterState {
  query: string;
  sort: SortField;
  order: SortOrder;
  readingStatus: ReadingStatusFilter;
  favoriteOnly: boolean;
}

export const defaultFilterState: SearchFilterState = {
  query: '',
  sort: 'name',
  order: 'asc',
  readingStatus: { read: false, reading: false, unread: false },
  favoriteOnly: false,
};

type Filterable = DisplayBook | DisplaySeries;

function matchesSearch(item: Filterable, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const creatorsText =
    ('creators' in item ? item.creators : (item as DisplaySeries).staff)
      ?.map((c: DisplayCreator) => c.name)
      .join(' ') ?? '';
  const charsText =
    item.characters?.map((c: DisplayCharacter) => c.name).join(' ') ?? '';
  return (
    (item.title ?? '').toLowerCase().includes(q) ||
    (item.description ?? '').toLowerCase().includes(q) ||
    creatorsText.toLowerCase().includes(q) ||
    charsText.toLowerCase().includes(q)
  );
}

function matchesFilters(item: Filterable, filters: SearchFilterState): boolean {
  const rs = filters.readingStatus;
  const anyStatusChecked = rs.read || rs.reading || rs.unread;
  if (anyStatusChecked) {
    const isRead = 'read' in item ? item.read : false;
    const isReading = 'reading' in item ? (item as DisplayBook).reading : false;
    const isUnread = 'unread' in item ? (item as DisplayBook).unread : false;
    const pass =
      (rs.read && isRead) ||
      (rs.reading && isReading) ||
      (rs.unread && isUnread);
    if (!pass) return false;
  }

  return !(filters.favoriteOnly && !item.favorite);
}

function compareItems(
  a: Filterable,
  b: Filterable,
  sort: SortField,
  order: SortOrder
): number {
  let cmp = 0;

  switch (sort) {
    case 'name':
      cmp = (a.title ?? '').localeCompare(b.title ?? '');
      break;
    case 'note': {
      const na = a.note ?? 0;
      const nb = b.note ?? 0;
      cmp = na - nb;
      break;
    }
    case 'date': {
      const da = 'start_date' in a ? a.start_date : '';
      const db = 'start_date' in b ? b.start_date : '';
      cmp = (da ?? '').localeCompare(db ?? '');
      break;
    }
    case 'favorite': {
      cmp = Number(a.favorite ?? false) - Number(b.favorite ?? false);
      break;
    }
    case 'trending': {
      const ta = Number(
        (a.extra as Record<string, unknown>)?.['trending'] ?? 0
      );
      const tb = Number(
        (b.extra as Record<string, unknown>)?.['trending'] ?? 0
      );
      cmp = ta - tb;
      break;
    }
  }

  return order === 'asc' ? cmp : -cmp;
}

export function applySearchFilterSort<T extends Filterable>(
  items: T[],
  state: SearchFilterState
): T[] {
  return items
    .filter((b) => matchesSearch(b, state.query) && matchesFilters(b, state))
    .sort((a, b) => compareItems(a, b, state.sort, state.order));
}

function activeFilterCount(state: SearchFilterState): number {
  let count = 0;
  const rs = state.readingStatus;
  if (rs.read) count++;
  if (rs.reading) count++;
  if (rs.unread) count++;
  if (state.favoriteOnly) count++;
  return count;
}

interface SearchFilterBarProps {
  state: SearchFilterState;
  onChange: (next: SearchFilterState) => void;
}

function SearchFilterBar({ state, onChange }: SearchFilterBarProps) {
  const { t } = useTranslation();

  const set = <K extends keyof SearchFilterState>(
    key: K,
    value: SearchFilterState[K]
  ) => onChange({ ...state, [key]: value });

  const filterCount = activeFilterCount(state);

  const hasAnyFilter =
    state.query !== '' ||
    filterCount > 0 ||
    state.sort !== 'name' ||
    state.order !== 'asc';

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-50 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t('searchInLibrary')}
          value={state.query}
          onChange={(e) => set('query', e.target.value)}
          className="pl-8 h-9"
        />
        {state.query && (
          <button
            onClick={() => set('query', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Popover>
        <PopoverTrigger>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-4 w-4" />
            {t('filters')}
            {filterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 px-1.5 py-0 text-[10px]"
              >
                {filterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-56 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t('status')}
            </p>
            {(['read', 'reading', 'unread'] as const).map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={state.readingStatus[key]}
                  onCheckedChange={(v) =>
                    set('readingStatus', {
                      ...state.readingStatus,
                      [key]: !!v,
                    })
                  }
                />
                <Label className="cursor-pointer text-sm">
                  {t(
                    key === 'read'
                      ? 'mkread'
                      : key === 'reading'
                        ? 'mkreading'
                        : 'mkunread'
                  )}
                </Label>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={state.favoriteOnly}
              onCheckedChange={(v) => set('favoriteOnly', !!v)}
            />
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <Label className="cursor-pointer text-sm">{t('favorite')}</Label>
          </label>
        </PopoverContent>
      </Popover>

      <Select
        value={state.sort}
        onValueChange={(v) => set('sort', v as SortField)}
      >
        <SelectTrigger size="sm" className="w-35">
          <SelectValue placeholder={t('sortBy')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{t('sortByName')}</SelectItem>
          <SelectItem value="note">{t('rating')}</SelectItem>
          <SelectItem value="date">{t('dates')}</SelectItem>
          <SelectItem value="favorite">{t('favorite')}</SelectItem>
          <SelectItem value="trending">{t('trending')}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => set('order', state.order === 'asc' ? 'desc' : 'asc')}
        title={state.order === 'asc' ? t('ascending') : t('descending')}
      >
        {state.order === 'asc' ? (
          <ArrowDownAZ className="h-4 w-4" />
        ) : (
          <ArrowUpAZ className="h-4 w-4" />
        )}
      </Button>

      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => onChange({ ...defaultFilterState })}
        >
          <X className="h-3.5 w-3.5" />
          {t('reset')}
        </Button>
      )}
    </div>
  );
}

export default SearchFilterBar;

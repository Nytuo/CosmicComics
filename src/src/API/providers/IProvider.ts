import { DisplayBook } from '@/interfaces/IDisplayBook';

export interface ISearchResult {
  id: string;
  title: string;
  coverUrl: string | null;
}

export interface IProvider {
  readonly id: number;
  readonly label: string;
  readonly badgeName: string;
  readonly attribution: string;

  readonly canInsertSeries: boolean;
  readonly canRematchBook: boolean;
  readonly canRematchSeries: boolean;
  readonly canRefreshBookMeta: boolean;
  readonly canRefreshSeriesMeta: boolean;
  readonly useDatabaseEditor: boolean;
  readonly needsYearInput: boolean;

  searchBooks?(query: string, year?: string): Promise<ISearchResult[]>;
  searchSeries?(query: string, year?: string): Promise<ISearchResult[]>;

  getExternalUrl(item: any, type: 'volume' | 'series'): string | null;
  parseCharacterImage(rawImage: any): string;
  parseCreatorImage(rawImage: any): string;
}

export function createFallbackBook(
  name: string,
  path: string,
  provider: number
): DisplayBook {
  return {
    id: '',
    external_id: 'null',
    provider_id: provider,
    provider_name: '',
    title: name,
    path: path,
    cover_url: '',
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

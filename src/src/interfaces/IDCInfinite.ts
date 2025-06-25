export interface IDCInfiniteCookies {
  cookies: Record<string, string>;
  authenticated: boolean;
}

export interface IDCInfiniteComic {
  id: string;
  title: string;
  issueNumber: string;
  description: string;
  coverUrl: string;
  seriesId?: string;
  seriesTitle?: string;
  creators?: string[];
  publishDate?: string;
  pageCount?: number;
  rating?: string;
  format?: string;
  price?: string;
}

export interface IDCInfiniteSeries {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  startYear?: string;
  endYear?: string;
  issueCount?: number;
}

export interface IDCInfiniteDownloadProgress {
  comicId: string;
  comicTitle: string;
  currentPage: number;
  totalPages: number;
  status:
    | 'downloading'
    | 'files_downloaded'
    | 'archiving'
    | 'db_inserting'
    | 'completed'
    | 'error';
  error?: string;
  message?: string;
}

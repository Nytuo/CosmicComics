export interface IMarvelUnlimitedCookies {
  cookies: Record<string, string>;
  authenticated: boolean;
}

export interface IMarvelUnlimitedComic {
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
  upc?: string;
  focDate?: string;
  price?: string;
  extendedCredits?: string[];
}

export interface IMarvelUnlimitedSeries {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  startYear?: string;
  endYear?: string;
  issueCount?: number;
}

export interface IMarvelUnlimitedDownloadProgress {
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

export interface IVizCookies {
  cookies: Record<string, string>;
  authenticated: boolean;
}

export interface IVizChapter {
  id: string;
  title: string;
  chapterNumber: string;
  description: string;
  coverUrl: string;
  seriesId?: string;
  seriesTitle?: string;
  creators?: string[];
  publishDate?: string;
  pageCount?: number;
  subscription?: string;
  free?: boolean;
}

export interface IVizSeries {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  startYear?: string;
  endYear?: string;
  chapterCount?: number;
  subscription?: string;
}

export interface IVizDownloadProgress {
  chapterId: string;
  chapterTitle: string;
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

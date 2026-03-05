export interface IMangaDexAuth {
  accessToken: string;
  refreshToken: string;
  authenticated: boolean;
}

export interface IMangaDexManga {
  id: string;
  title: string;
  altTitles?: string[];
  description: string;
  coverUrl: string;
  status?: string;
  year?: number;
  contentRating?: string;
  tags?: string[];
  authors?: string[];
  artists?: string[];
  originalLanguage?: string;
  lastChapter?: string;
  lastVolume?: string;
  demographicTarget?: string;
}

export interface IMangaDexChapter {
  id: string;
  title: string;
  volume: string;
  chapter: string;
  pages: number;
  translatedLanguage: string;
  scanlationGroup?: string;
  publishAt?: string;
  readableAt?: string;
  externalUrl?: string;
}

export interface IMangaDexDownloadProgress {
  chapterId: string;
  chapterTitle: string;
  currentPage: number;
  totalPages: number;
  status: 'downloading' | 'archiving' | 'db_inserting' | 'completed' | 'error';
  error?: string;
  message?: string;
}

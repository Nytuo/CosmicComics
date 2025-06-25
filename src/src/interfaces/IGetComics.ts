export interface IGetComicsPost {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  postUrl: string;
  category: string;
  year?: string;
  size?: string;
  date?: string;
}

export interface IGetComicsDownloadLink {
  label: string;
  url: string;
  linkType: string;
}

export interface IGetComicsDetail {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  postUrl: string;
  category: string;
  year?: string;
  size?: string;
  language?: string;
  format?: string;
  downloadLinks: IGetComicsDownloadLink[];
  tags?: string[];
}

export interface IGetComicsDownloadProgress {
  postId: string;
  postTitle: string;
  currentBytes: number;
  totalBytes: number;
  status: 'downloading' | 'archiving' | 'db_inserting' | 'completed' | 'error';
  error?: string;
  message?: string;
}

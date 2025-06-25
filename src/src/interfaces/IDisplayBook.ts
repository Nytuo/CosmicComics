export interface DisplayCreator {
  name: string;
  role?: string;
  image_url?: string;
}

export interface DisplayCharacter {
  name: string;
  role?: string;
  image_url?: string;
}

export interface ReadingProgress {
  last_page: number;
  page_count: number;
  percentage: number;
}

export interface DisplayBook {
  id: string;
  external_id: string;
  provider_id: number;
  provider_name: string;

  title: string;
  path: string;
  cover_url: string;
  description: string;
  issue_number: string;
  format: string;
  page_count: number;
  creators: DisplayCreator[];
  characters: DisplayCharacter[];

  read: boolean;
  reading: boolean;
  unread: boolean;
  favorite: boolean;
  note: number | null;
  lock: boolean;

  reading_progress: ReadingProgress;

  extra: Record<string, unknown>;

  series_id: string | null;
}

export interface DisplaySeries {
  id: string;
  external_id: string;
  provider_id: number;
  provider_name: string;

  title: string;
  path: string;
  cover_url: string;
  bg_url: string;
  description: string;

  status: string;
  start_date: string;
  end_date: string;
  score: number;
  genres: string[];
  volumes: number | null;
  chapters: number | null;

  characters: DisplayCharacter[];
  staff: DisplayCreator[];

  note: number | null;
  favorite: boolean;
  lock: boolean;

  book_count: number;
  read_count: number;
  read_progress_text: string;

  extra: Record<string, unknown>;
}

export interface FieldDef {
  key: string;
  label: string;
  field_type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'url'
    | 'text'
    | 'rating'
    | 'json'
    | 'select'
    | 'tags';
  group: 'core' | 'metadata' | 'status' | 'api_specific';
  editable: boolean;
  visible: boolean;
  order: number;
  options?: string[];
  placeholder?: string;
}

export interface FieldSchema {
  provider_id: number;
  provider_name: string;
  item_type: 'book' | 'series';
  fields: FieldDef[];
}

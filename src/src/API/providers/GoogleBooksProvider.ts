import { IProvider, ISearchResult } from './IProvider.ts';
import { GoogleBooks } from '@/API/GoogleBooks.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { t } from 'i18next';

/**
 * Google Books provider.
 */
export class GoogleBooksProvider implements IProvider {
  readonly id = providerEnum.GBooks;
  readonly label = 'Google Books';
  readonly badgeName = 'google_books';
  readonly attribution = 'Provided By Google Books.';
  readonly canInsertSeries = true;
  readonly canRematchBook = true;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = false;

  private api = new GoogleBooks();

  private static extractCover(volumeInfo: any): string | null {
    if (!volumeInfo['imageLinks']) return null;
    const links = volumeInfo['imageLinks'];
    return links['large'] ?? links['thumbnail'] ?? null;
  }

  async searchBooks(query: string): Promise<ISearchResult[]> {
    const cdata = await this.api.GetComics(query);
    if (!cdata) {
      return [];
    }
    const parsed = tryToParse(cdata);
    if (!parsed['totalItems'] || parsed['totalItems'] <= 0) {
      return [];
    }
    if (!parsed['items'] || !Array.isArray(parsed['items'])) {
      return [];
    }
    return parsed['items'].map((item: any) => {
      const volumeInfo = item['volumeInfo'] || {};
      const coverUrl = GoogleBooksProvider.extractCover(volumeInfo);
      return {
        id: item['id'] || '',
        title: volumeInfo['title'] || item['title'] || t('untitled'),
        coverUrl,
      };
    });
  }

  getExternalUrl(_item: any, _type: 'volume' | 'series'): string | null {
    return null;
  }

  parseCharacterImage(rawImage: any): string {
    return typeof rawImage === 'string'
      ? rawImage.replaceAll('"', '')
      : rawImage;
  }

  parseCreatorImage(rawImage: any): string {
    return typeof rawImage === 'string'
      ? rawImage.replaceAll('"', '')
      : rawImage;
  }
}

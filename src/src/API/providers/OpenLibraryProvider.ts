import { IProvider, ISearchResult } from './IProvider.ts';
import { OpenLibrary } from '@/API/OpenLibrary.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { t } from 'i18next';

/**
 * Open Library provider — open-source book metadata.
 */
export class OpenLibraryProvider implements IProvider {
  readonly id = providerEnum.OL;
  readonly label = 'Open Library';
  readonly badgeName = 'openlibrary';
  readonly attribution = 'provided By OpenLibrary.';
  readonly canInsertSeries = true;
  readonly canRematchBook = true;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = false;

  private api = new OpenLibrary();

  async searchBooks(query: string): Promise<ISearchResult[]> {
    const cdata = await this.api.GetComics(query);
    if (!cdata) return [];
    const parsed = tryToParse(cdata);
    if (!parsed['num_found'] || parsed['num_found'] <= 0) return [];
    if (!parsed['docs'] || !Array.isArray(parsed['docs'])) return [];
    return parsed['docs'].map((item: any) => {
      const seed = item['seed'];
      const id =
        Array.isArray(seed) && seed.length > 0
          ? seed[0]?.split('/')?.[2] || ''
          : '';
      return {
        id: id,
        title: item['title'] || t('untitled'),
        coverUrl: item['cover_i']
          ? 'https://covers.openlibrary.org/b/id/' + item['cover_i'] + '-L.jpg'
          : null,
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

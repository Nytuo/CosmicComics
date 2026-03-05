import { IProvider, ISearchResult } from './IProvider.ts';
import { Marvel } from '@/API/Marvel.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { t } from 'i18next';

/**
 * Marvel Comics provider — uses the Marvel Developer API.
 */
export class MarvelProvider implements IProvider {
  readonly id = providerEnum.Marvel;
  readonly label = 'Marvel (Marvel & Star Wars)';
  readonly badgeName = 'Marvel';
  readonly attribution = 'provided By Marvel. © 2014 Marvel';
  readonly canInsertSeries = true;
  readonly canRematchBook = true;
  readonly canRematchSeries = true;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = true;

  private api = new Marvel();

  async searchBooks(query: string, year?: string): Promise<ISearchResult[]> {
    const cdata = await this.api.GetComics(query, year ?? '');
    if (!cdata) return [];
    const parsed = tryToParse(cdata);
    if (!parsed['data'] || parsed['data']['total'] <= 0) return [];
    return parsed['data']['results'].map((item: any) => {
      const thumbnail = item['thumbnail'];
      const coverUrl =
        thumbnail?.path && thumbnail?.extension
          ? `${thumbnail.path}/detail.${thumbnail.extension}`
          : null;
      return {
        id: String(item['id'] ?? ''),
        title: item['title'] || t('untitled'),
        coverUrl,
      };
    });
  }

  async searchSeries(query: string, year?: string): Promise<ISearchResult[]> {
    const cdata = await this.api.SearchComic(query, year ?? '');
    if (!cdata) return [];
    const parsed = tryToParse(cdata);
    if (!parsed['data'] || parsed['data']['total'] <= 0) return [];
    return parsed['data']['results'].map((item: any) => {
      const thumbnail = item['thumbnail'];
      const coverUrl =
        thumbnail?.path && thumbnail?.extension
          ? `${thumbnail.path}/detail.${thumbnail.extension}`
          : null;
      return {
        id: String(item['id'] ?? ''),
        title: item['title'] || t('untitled'),
        coverUrl,
      };
    });
  }

  getExternalUrl(item: any, _type: 'volume' | 'series'): string | null {
    if (item.URLs && item.URLs !== 'null') {
      const urls = tryToParse(item.URLs);
      return Array.isArray(urls) && urls.length > 0 ? urls[0].url : null;
    }
    return null;
  }

  parseCharacterImage(rawImage: any): string {
    if (!rawImage) return '';
    const parsed = tryToParse(rawImage);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.path !== 'string'
    )
      return '';
    return parsed.path + '/detail.' + parsed['extension'];
  }

  parseCreatorImage(rawImage: any): string {
    if (!rawImage) return '';
    const parsed = tryToParse(rawImage);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.path !== 'string'
    )
      return '';
    return parsed.path + '/detail.' + parsed['extension'];
  }
}

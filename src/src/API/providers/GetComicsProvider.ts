import { IProvider } from './IProvider.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

/**
 * GetComics provider — comic download integration via getcomics.org scraping.
 */
export class GetComicsProvider implements IProvider {
  readonly id = providerEnum.GetComics;
  readonly label = 'GetComics';
  readonly badgeName = 'GetComics';
  readonly attribution = 'Content sourced from GetComics.org';
  readonly canInsertSeries = false;
  readonly canRematchBook = false;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = false;
  readonly canRefreshSeriesMeta = false;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = false;

  getExternalUrl(item: any, _type: 'volume' | 'series'): string | null {
    const extra = tryToParse(item.extra);
    if (extra?.post_url) {
      return extra.post_url;
    }
    return null;
  }

  parseCharacterImage(rawImage: any): string {
    if (!rawImage) return '';
    const parsed = tryToParse(rawImage);
    if (typeof parsed === 'string') return parsed;
    return '';
  }

  parseCreatorImage(rawImage: any): string {
    if (!rawImage) return '';
    const parsed = tryToParse(rawImage);
    if (typeof parsed === 'string') return parsed;
    return '';
  }
}

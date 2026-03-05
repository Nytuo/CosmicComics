import { IProvider } from './IProvider.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

/**
 * Marvel Unlimited provider — extends Marvel with Unlimited-specific features.
 * Shares most behavior with the Marvel provider but has its own ID (5).
 */
export class MarvelUnlimitedProvider implements IProvider {
  readonly id = providerEnum.MarvelUnlimited;
  readonly label = 'Marvel Unlimited';
  readonly badgeName = 'Marvel Unlimited';
  readonly attribution = 'provided By Marvel Unlimited. © 2014 Marvel';
  readonly canInsertSeries = false;
  readonly canRematchBook = false;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = true;

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

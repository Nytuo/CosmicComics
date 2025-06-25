import { IProvider } from './IProvider.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

/**
 * DC Universe Infinite provider — subscription-based digital comics.
 */
export class DCInfiniteProvider implements IProvider {
  readonly id = providerEnum.DCInfinite;
  readonly label = 'DC Universe Infinite';
  readonly badgeName = 'DC Universe Infinite';
  readonly attribution =
    'Content provided by DC Universe Infinite. © DC Comics';
  readonly canInsertSeries = false;
  readonly canRematchBook = false;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = true;

  getExternalUrl(item: any, _type: 'volume' | 'series'): string | null {
    const extra = tryToParse(item.extra);
    if (extra?.urls && Array.isArray(extra.urls) && extra.urls.length > 0) {
      return extra.urls[0].url;
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

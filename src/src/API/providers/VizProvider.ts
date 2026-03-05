import { IProvider } from './IProvider.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

/**
 * VIZ Media provider — subscription-based manga reading (Shonen Jump + VIZ Manga).
 * Provider ID: 10
 */
export class VizProvider implements IProvider {
  readonly id = providerEnum.Viz;
  readonly label = 'VIZ Media';
  readonly badgeName = 'VIZ Media';
  readonly attribution = 'Content provided by VIZ Media. © VIZ Media, LLC';
  readonly canInsertSeries = false;
  readonly canRematchBook = false;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = false;

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

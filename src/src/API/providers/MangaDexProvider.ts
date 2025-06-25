import { IProvider } from './IProvider.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

/**
 * MangaDex provider — manga reader / downloader integration.
 */
export class MangaDexProvider implements IProvider {
  readonly id = providerEnum.MangaDex;
  readonly label = 'MangaDex';
  readonly badgeName = 'MangaDex';
  readonly attribution = 'Data provided by MangaDex. © MangaDex';
  readonly canInsertSeries = false;
  readonly canRematchBook = false;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = false;
  readonly canRefreshSeriesMeta = false;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = false;

  getExternalUrl(item: any, _type: 'volume' | 'series'): string | null {
    if (_type === 'series' && item.external_id) {
      return `https://mangadex.org/title/${item.external_id}`;
    }
    if (_type === 'volume' && item.extra) {
      const extra = tryToParse(item.extra);
      if (extra?.mangadex_manga_id) {
        return `https://mangadex.org/title/${extra.mangadex_manga_id}`;
      }
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

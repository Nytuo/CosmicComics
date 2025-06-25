import { IProvider, ISearchResult } from './IProvider.ts';
import { Anilist } from '@/API/Anilist.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { t } from 'i18next';

/**
 * Anilist provider — for manga metadata.
 */
export class AnilistProvider implements IProvider {
  readonly id = providerEnum.Anilist;
  readonly label = 'Anilist (Manga)';
  readonly badgeName = 'anilist-manga';
  readonly attribution = 'Content provided by Anilist';
  readonly canInsertSeries = true;
  readonly canRematchBook = false;
  readonly canRematchSeries = true;
  readonly canRefreshBookMeta = false;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = true;
  readonly needsYearInput = false;

  private api = new Anilist();

  async searchSeries(query: string): Promise<ISearchResult[]> {
    const result = await this.api.GET_SEARCH(query);
    if (!result?.base || !Array.isArray(result.base)) return [];
    return result.base.map((el: any) => {
      const titleObj = el.title || {};
      const english = titleObj['english'] || '';
      const romaji = titleObj['romaji'] || '';
      const native = titleObj['native'] || '';
      const parts = [english, romaji, native].filter(Boolean);
      const title = parts.length > 0 ? parts.join(' / ') : t('untitled');
      return {
        id: String(el.id || ''),
        title: title,
        coverUrl:
          el['coverImage']?.['large'] || el['coverImage']?.['medium'] || null,
      };
    });
  }

  getExternalUrl(item: any, type: 'volume' | 'series'): string | null {
    if (type === 'series' && item.URLs && item.URLs !== 'null') {
      return tryToParse(item.URLs);
    }
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

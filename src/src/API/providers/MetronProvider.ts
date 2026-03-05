import { IProvider, ISearchResult } from './IProvider.ts';
import { Metron } from '@/API/Metron.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';

/**
 * Metron provider — community-built comic book database.
 * https://metron.cloud
 */
export class MetronProvider implements IProvider {
  readonly id = providerEnum.Metron;
  readonly label = 'Metron (Comics)';
  readonly badgeName = 'metron';
  readonly attribution = 'provided By Metron.';
  readonly canInsertSeries = true;
  readonly canRematchBook = true;
  readonly canRematchSeries = true;
  readonly canRefreshBookMeta = true;
  readonly canRefreshSeriesMeta = true;
  readonly useDatabaseEditor = false;
  readonly needsYearInput = false;

  private api = new Metron();

  async searchBooks(query: string, year?: string): Promise<ISearchResult[]> {
    const cdata = await this.api.GetComics(query, year);
    if (!cdata) {
      console.log('[Metron] No data returned from API');
      return [];
    }
    const parsed = tryToParse(cdata);
    console.log('[Metron] Parsed response:', parsed);
    if (!parsed['results'] || !Array.isArray(parsed['results'])) {
      console.log('[Metron] Results array missing or invalid');
      return [];
    }
    console.log('[Metron] First result:', parsed['results'][0]);
    return parsed['results'].map((item: any) => {
      const seriesName = item['series']?.['name'] || 'Unknown';
      const issueNumber = item['number'] || '?';
      const title = `${seriesName} #${issueNumber}`;
      console.log('[Metron] Item:', {
        id: item['id'],
        title,
        image: item['image'],
        series: item['series'],
      });
      return {
        id: String(item['id'] || ''),
        title: title,
        coverUrl: item['image'] || null,
      };
    });
  }

  async searchSeries(query: string): Promise<ISearchResult[]> {
    const cdata = await this.api.SearchSeries(query);
    if (!cdata) return [];
    const parsed = tryToParse(cdata);
    if (!parsed['results'] || !Array.isArray(parsed['results'])) return [];
    return parsed['results'].map((item: any) => {
      const seriesName = item['series'] || item['name'] || 'Unknown Series';
      const volume = item['volume'];
      const title = volume ? `${seriesName} v${volume}` : seriesName;
      return {
        id: String(item['id'] || ''),
        title: title,
        coverUrl: null,
      };
    });
  }

  getExternalUrl(item: any, _type: 'volume' | 'series'): string | null {
    if (item.URLs && item.URLs !== 'null') {
      const urls = tryToParse(item.URLs);
      if (typeof urls === 'string' && urls.startsWith('http')) {
        return urls;
      }
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

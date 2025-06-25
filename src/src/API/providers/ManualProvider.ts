import { providerEnum } from '@/utils/utils.ts';
import { IProvider } from './IProvider.ts';
import { t } from 'i18next';

/**
 * Manual provider — books added without any external API.
 */
export class ManualProvider implements IProvider {
  readonly id = providerEnum.MANUAL;
  readonly label = t('manual');
  readonly badgeName = 'manual';
  readonly attribution = 'notFromAPI';
  readonly canInsertSeries = true;
  readonly canRematchBook = false;
  readonly canRematchSeries = false;
  readonly canRefreshBookMeta = false;
  readonly canRefreshSeriesMeta = false;
  readonly useDatabaseEditor = true;
  readonly needsYearInput = false;

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

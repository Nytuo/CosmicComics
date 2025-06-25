import { ToasterHandler } from '@/components/common/ToasterHandler.tsx';
import logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI';
import { t } from 'i18next';

/**
 * Represents a class that interacts with the Anilist API to search and add manga to the database.
 */
class Anilist {
  /**
   * Search on ANILIST API by the manga name
   * @param {string} name The name of the manga
   * @return {Promise<*>} The list of mangas
   */
  async GET_SEARCH(name: string): Promise<any> {
    try {
      const data = await TauriAPI.anilistSearchOnly(name);
      logger.info('Anilist search result: ' + data);
      return data;
    } catch (error) {
      ToasterHandler(t('error-while-searching-for-manga'), 'error');
      logger.error(error);
    }
  }
}

export { Anilist };

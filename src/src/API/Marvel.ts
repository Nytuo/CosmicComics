import logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI';

/**
 * Marvel class for interacting with the Marvel API.
 */
class Marvel {
  /**
   * Search for comics by name and date.
   * @param name - The name of the comic to search for.
   * @param date - The date of the comic to search for.
   * @returns A Promise that resolves to the search results.
   */
  async SearchComic(name = '', date = ''): Promise<string | undefined> {
    try {
      const data = (await TauriAPI.marvelSearchOnly(
        name,
        date || undefined
      )) as string;
      logger.debug('Marvel search result: ' + data);
      return data;
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * Get comics by name and date.
   * @param name - The name of the comic to get.
   * @param date - The date of the comic to get.
   * @returns A Promise that resolves to the comic data.
   */
  async GetComics(name = '', date = ''): Promise<string | undefined> {
    try {
      const data = (await TauriAPI.marvelGetComics(name, date)) as string;
      logger.debug('Marvel search result: ' + data);
      return data;
    } catch (error) {
      logger.error(error);
    }
  }
}

export { Marvel };

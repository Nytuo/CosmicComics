import logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI';

/**
 * A class for interacting with the Google Books API.
 */
class GoogleBooks {
  /**
   * Fetches comics from the Google Books API based on the provided name.
   * @param name The name of the comic to search for.
   * @returns A Promise that resolves to the fetched data.
   */
  async GetComics(name = ''): Promise<string | undefined> {
    try {
      const data = (await TauriAPI.googlebooksGetComics(name)) as string;
      logger.debug('Google Books search result: ' + data);
      return data;
    } catch (error) {
      logger.error(error);
    }
  }
}

export { GoogleBooks };

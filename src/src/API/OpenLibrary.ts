import logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI';

/**
 * A class representing the OpenLibrary API.
 */
class OpenLibrary {
  async GetComics(name = ''): Promise<string | undefined> {
    try {
      const data = (await TauriAPI.openlibraryGetComics(name)) as string;
      logger.debug('Open Library search result: ' + data);
      return data;
    } catch (error) {
      logger.error(error);
    }
  }
}

export { OpenLibrary };

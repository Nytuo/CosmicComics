import logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI';

/**
 * A class representing the Metron API (https://metron.cloud).
 * Metron is a community-based comic book database with a REST API.
 */
class Metron {
  /**
   * Searches for comics/issues on Metron by series name.
   * @param name The series name to search for.
   * @param year Optional year filter.
   * @returns A Promise that resolves to the search results.
   */
  async GetComics(name = '', year?: string): Promise<string | undefined> {
    try {
      const data = (await TauriAPI.metronGetComics(name, year)) as string;
      logger.debug('Metron search result: ' + data);
      return data;
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * Searches for series on Metron by name.
   * @param name The series name to search for.
   * @returns A Promise that resolves to the search results.
   */
  async SearchSeries(name = ''): Promise<string | undefined> {
    try {
      const data = (await TauriAPI.metronSearchSeries(name)) as string;
      logger.debug('Metron series search result: ' + data);
      return data;
    } catch (error) {
      logger.error(error);
    }
  }
}

export { Metron };

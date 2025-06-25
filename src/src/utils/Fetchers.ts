import Logger from '@/logger.ts';
import * as TauriAPI from '@/API/TauriAPI';

/**
 * Modify user's profile configuration JSON file
 * @param {string|number} tomod The key to modify
 * @param {*} mod the new value
 */
async function modifyConfigJson(tomod: string | number, mod: any) {
  try {
    const configData = (await TauriAPI.getUserConfig()) as Record<string, any>;
    const config =
      typeof configData === 'string' ? JSON.parse(configData) : configData;
    const keys = Object.keys(config);
    for (const element of keys) {
      if (element === tomod) {
        config[tomod] = mod;
        break;
      }
    }
    await TauriAPI.writeUserConfig(config);
  } catch (error) {
    Logger.error(error);
  }
}

export { modifyConfigJson };

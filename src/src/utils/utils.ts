import { IProviderEnum } from '@/interfaces/IProviderEnum.ts';

/**
 * Attempts to parse a JSON string and returns the parsed object. If the string cannot be parsed, the original string is returned.
 * @param str - The string to parse.
 * @returns The parsed object or the original string.
 */
const tryToParse = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

const providerEnum: IProviderEnum = {
  MANUAL: 0,
  Marvel: 1,
  Anilist: 2,
  OL: 3,
  GBooks: 4,
  MarvelUnlimited: 5,
  Metron: 6,
  MangaDex: 7,
  GetComics: 8,
  DCInfinite: 9,
  Viz: 10,
};

function openBOOKM(path: string, page: string) {
  localStorage.setItem('currentBook', path);
  localStorage.setItem('currentPage', page);
  window.location.href = '/viewer';
}

export { providerEnum, openBOOKM, tryToParse };

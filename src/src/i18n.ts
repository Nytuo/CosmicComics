import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const previousLanguage = localStorage.getItem('language') ?? 'en';
// noinspection JSIgnoredPromiseFromCall
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: previousLanguage,
    debug: false,
    detection: {
      order: ['queryString', 'cookie'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

const translateString = (key: string) => {
  return i18n.t(key);
};
export { translateString };

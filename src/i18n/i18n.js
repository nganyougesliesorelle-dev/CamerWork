import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';

const savedLang = localStorage.getItem('camerwork-lang') || 'fr';

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: savedLang,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  detection: { order: ['localStorage', 'navigator'] },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('camerwork-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n/i18n';

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('camerwork-lang') || 'fr');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('camerwork-dark') === 'true');

  // Sync le switch de langue avec i18next (pour les boutons existants)
  const changeLanguage = (lng) => {
    setLang(lng);
    i18n.changeLanguage(lng);
  };

  // Écouter les changements de langue venant d'i18next (ex: détection navigateur)
  useEffect(() => {
    const handleLanguageChanged = (lng) => {
      if (lng !== lang) setLang(lng);
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('camerwork-dark', darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <LangContext.Provider value={{ lang, setLang: changeLanguage, darkMode, toggleDarkMode }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

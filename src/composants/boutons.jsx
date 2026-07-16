import { useTranslation } from 'react-i18next';
import { useLang } from './LangContext';

/**
 * LanguageSwitcher — Boutons FR / EN réutilisables.
 * 
 * Usage :
 *   <LanguageSwitcher />
 * 
 * Les boutons appellent i18n.changeLanguage() et mettent à jour
 * le LangContext, ce qui déclenche la traduction instantanée de
 * TOUS les composants utilisant useTranslation().
 */
export function LanguageSwitcher({ className = '', variant = 'pill' }) {
  const { i18n } = useTranslation();
  const { setLang } = useLang();
  const currentLang = i18n.language || 'fr';

  const switchTo = (lng) => {
    setLang(lng); // → LangContext + i18n.changeLanguage (via le pont dans LangProvider)
  };

  const baseBtn = "text-xs font-bold px-3 py-1.5 rounded-lg transition-all";

  if (variant === 'pill') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => switchTo('fr')}
          className={`${baseBtn} ${currentLang === 'fr' ? 'bg-cyan-500 text-white' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}
        >
          🇫🇷 Français FR
        </button>
        <button
          onClick={() => switchTo('en')}
          className={`${baseBtn} ${currentLang === 'en' ? 'bg-cyan-500 text-white' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}
        >
          🇬🇧 English EN
        </button>
      </div>
    );
  }

  // Variant 'icon' (compact, pour la LandingPage)
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => switchTo('fr')}
        className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${currentLang === 'fr' ? 'bg-sky-100 text-sky-700' : 'text-sky-400 hover:text-sky-600'}`}
      >
        🇫🇷
      </button>
      <button
        onClick={() => switchTo('en')}
        className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${currentLang === 'en' ? 'bg-sky-100 text-sky-700' : 'text-sky-400 hover:text-sky-600'}`}
      >
        🇬🇧
      </button>
    </div>
  );
}

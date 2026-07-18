import { useTranslation } from 'react-i18next';
import { Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

export function Header({ onNavigate }) {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex justify-between items-center shadow-sm transition-colors duration-300">
      <h1 className="text-xl font-bold text-teal-600 dark:text-teal-400">CamerWork</h1>
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('home')} className="hover:text-teal-500 dark:text-gray-300 dark:hover:text-teal-400 transition-colors">
          {t('header.home')}
        </button>
        <button onClick={() => onNavigate('dashboard')} className="hover:text-teal-500 dark:text-gray-300 dark:hover:text-teal-400 transition-colors">
          {t('header.dashboard')}
        </button>
        <button onClick={() => onNavigate('profile')} className="hover:text-teal-500 dark:text-gray-300 dark:hover:text-teal-400 transition-colors">
          {t('header.profile')}
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className="p-2 text-sky-400 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-sky-50 dark:hover:bg-gray-800 rounded-xl transition-all"
          title={t('header.settings') || 'Paramètres'}
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}

import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';

export function Header({ onNavigate }) {
  const { t } = useTranslation();

  return (
    <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-teal-600">CamerWork</h1>
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('home')} className="hover:text-teal-500">
          {t('header.home')}
        </button>
        <button onClick={() => onNavigate('dashboard')} className="hover:text-teal-500">
          {t('header.dashboard')}
        </button>
        <button onClick={() => onNavigate('profile')} className="hover:text-teal-500">
          {t('header.profile')}
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className="p-2 text-sky-400 hover:text-teal-500 hover:bg-sky-50 rounded-xl transition-all"
          title={t('header.settings') || 'Paramètres'}
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}

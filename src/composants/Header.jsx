import { useTranslation } from 'react-i18next';

export function Header({ onNavigate }) {
  const { t } = useTranslation();

  return (
    <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-bold text-teal-600">CamerWork</h1>
      <div className="space-x-4">
        <button onClick={() => onNavigate('home')} className="hover:text-teal-500">
          {t('header.home')}
        </button>
        <button onClick={() => onNavigate('dashboard')} className="hover:text-teal-500">
          {t('header.dashboard')}
        </button>
        <button onClick={() => onNavigate('profile')} className="hover:text-teal-500">
          {t('header.profile')}
        </button>
      </div>
    </nav>
  );
}

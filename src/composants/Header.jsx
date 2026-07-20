import { useTranslation } from 'react-i18next';
import { Settings, Moon, Sun, MessageCircle } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export function Header({ onNavigate }) {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('type', '==', 'message'), where('read', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      setUnreadMessages(snap.size || 0);
    }, () => {});
    return () => unsub();
  }, []);

  return (
    <nav className="bg-transparent p-4 flex justify-between items-center transition-colors duration-300">
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

        <button onClick={() => navigate('/messages')} className="relative p-2 text-sky-400 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-sky-50 dark:hover:bg-gray-800 rounded-xl transition-all" title="Messages">
          <MessageCircle size={20} />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none rounded-full bg-red-500 text-white">{unreadMessages}</span>
          )}
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

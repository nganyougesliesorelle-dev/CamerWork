import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTheme } from './ThemeContext';
import { LanguageSwitcher } from './boutons';
import {
  Menu, X, Settings, LogOut, HelpCircle, FileText, Shield, Sun, Moon, ExternalLink, MessageCircle
} from 'lucide-react';

export function HamburgerMenu({ className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let unsubscribe = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setUnreadMessages(0);
        if (unsubscribe) unsubscribe();
        return;
      }
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('type', '==', 'message'),
        where('read', '==', false)
      );
      unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        setUnreadMessages(snapshot.size || 0);
      }, (error) => {
        console.error('[HamburgerMenu] Notification listen error:', error);
        setUnreadMessages(0);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success(t('notifications.success_logout'));
      navigate('/');
    } catch {
      toast.error(t('notifications.error_logout'));
    }
  };

  const menuItems = [
    {
      label: t('jobList.nav_messages') || 'Messages',
      icon: MessageCircle,
      onClick: () => { setOpen(false); navigate('/messages'); },
      color: 'text-sky-600 dark:text-sky-400',
      badge: unreadMessages,
    },
    {
      label: 'Paramètres',
      icon: Settings,
      onClick: () => { setOpen(false); navigate('/parametres'); },
      color: 'text-sky-600 dark:text-sky-400',
    },

    { divider: true },
    {
      label: 'Aide / FAQ',
      icon: HelpCircle,
      onClick: () => { setOpen(false); },
      color: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Mentions légales & Confidentialité',
      icon: Shield,
      onClick: () => { setOpen(false); },
      color: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Conditions Générales (CGU)',
      icon: FileText,
      onClick: () => { setOpen(false); },
      color: 'text-sky-600 dark:text-sky-400',
    },
    { divider: true },
    {
      label: 'Se déconnecter',
      icon: LogOut,
      onClick: handleLogout,
      color: 'text-red-500',
      danger: true,
    },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Bouton hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 hover:bg-sky-100 dark:hover:bg-gray-700 rounded-xl transition-all text-sky-600 dark:text-gray-300"
        aria-label="Menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panneau coulissant */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-sky-100 dark:border-gray-700">
          <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider">
            Menu
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 hover:bg-sky-50 dark:hover:bg-gray-700 rounded-lg text-sky-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Langue */}
        <div className="px-5 py-4 border-b border-sky-50 dark:border-gray-700">
          <p className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-2 tracking-wider">
            Langue
          </p>
          <LanguageSwitcher variant="pill" />
        </div>

        {/* Items */}
        <div className="p-3 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {menuItems.map((item, idx) =>
            item.divider ? (
              <div key={idx} className="my-2 border-t border-sky-50 dark:border-gray-700" />
            ) : (
              <button
                key={idx}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  item.danger
                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500'
                    : 'hover:bg-sky-50 dark:hover:bg-gray-700 text-sky-700 dark:text-gray-300'
                }`}
              >
                <div className="relative">
                  <item.icon size={18} className={item.color} />
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-[10px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.label}
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sky-100 dark:border-gray-700 text-center">
          <p className="text-[10px] text-sky-300 dark:text-gray-500">
            CamerWork © {new Date().getFullYear()} — Cameroun
          </p>
        </div>
      </div>
    </div>
  );
}

export default HamburgerMenu;

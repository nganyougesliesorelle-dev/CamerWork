import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { Bell, Sparkles, Briefcase, CheckCircle, Mail, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function Notifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(!!auth.currentUser);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      return;
    }

    // Requête en temps réel pour récupérer les notifications de l'étudiant connecté
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsList = [];
      snapshot.forEach((doc) => {
        notifsList.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifsList);
      setLoading(false);
    }, (error) => {
      console.error("Erreur notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Marquer une notification comme lue et rediriger l'étudiant
  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read) {
        const notifRef = doc(db, "notifications", notif.id);
        await updateDoc(notifRef, { read: true });
      }

      // Redirection intelligente selon le type d'opportunité détecté par le moteur de CamerWork
      if (notif.jobId) {
        navigate(`/offres/${notif.jobId}`);
      } else if (notif.type === "status_update") {
        navigate('/messages'); // Si un salon de pré-entretien a été ouvert
      }
    } catch (error) {
      console.error("Erreur mise à jour notification:", error);
    }
  };

  // Tout marquer comme lu d'un coup
  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach((notif) => {
        const ref = doc(db, "notifications", notif.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
      toast.success(t('notifications.all_read'));
    } catch (_error) {
      toast.error(t('notifications.cannot_update'));
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'opportunity_boost':
        return <Sparkles className="text-cyan-500" size={20} />;
      case 'application':
        return <Briefcase className="text-sky-500" size={20} />;
      case 'status_update':
        return <CheckCircle className="text-teal-500" size={20} />;
      default:
        return <Bell className="text-sky-500" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 dark:bg-gray-900 p-4 text-center">
        <Mail size={48} className="text-sky-300 dark:text-gray-500 mb-4" />
        <p className="text-sky-600 dark:text-gray-300 font-bold">{t('notifications.login_required')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* En-tête de page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-sky-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-3">
              <Bell className="text-cyan-600" /> {t('notifications.title')}
            </h1>
            <p className="text-sky-500 dark:text-gray-300 text-sm font-medium mt-1">
              {t('notifications.subtitle')}
            </p>
          </div>
          
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="text-xs font-black text-cyan-600 hover:text-sky-700 dark:hover:text-gray-300 uppercase tracking-wider bg-sky-50 dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl transition-all self-start sm:self-center"
            >
              {t('notifications.mark_all_read')}
            </button>
          )}
        </div>

        {/* Liste des notifications */}
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-sky-100 dark:border-gray-700 rounded-[2rem] p-12 text-center shadow-sm dark:shadow-gray-900/30">
            <div className="w-16 h-16 bg-sky-50 dark:bg-gray-800/60 text-sky-400 dark:text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell size={28} />
            </div>
            <h3 className="text-lg font-black text-sky-800 dark:text-gray-100 uppercase mb-1">{t('notifications.empty_title')}</h3>
            <p className="text-sky-500 dark:text-gray-300 text-sm font-medium max-w-sm mx-auto">
              {t('notifications.empty_body')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group border rounded-[2rem] p-5 flex gap-4 items-start transition-all cursor-pointer relative overflow-hidden ${
                  notif.read 
                    ? 'bg-white/60 dark:bg-gray-900/60 border-sky-100 dark:border-gray-700 opacity-75 hover:opacity-100 hover:bg-white dark:hover:bg-gray-900' 
                    : 'bg-white dark:bg-gray-900 border-sky-100 dark:border-gray-700 shadow-md dark:shadow-gray-900/30 shadow-sky-800/5 hover:border-blue-300'
                }`}
              >
                {/* Indicateur de non-lecture */}
                {!notif.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-600"></div>
                )}

                {/* Icône de gauche */}
                <div className={`p-3 rounded-xl shrink-0 ${
                  notif.read ? 'bg-sky-50 dark:bg-gray-800/60 text-sky-400 dark:text-gray-400' : 'bg-sky-50 dark:bg-gray-800/60 text-cyan-600'
                }`}>
                  {getIcon(notif.type)}
                </div>

                {/* Contenu */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className={`text-base font-black uppercase tracking-tight leading-tight ${
                      notif.read ? 'text-sky-700 dark:text-gray-300' : 'text-sky-900 dark:text-gray-100'
                    }`}>
                      {notif.title}
                    </h4>
                    {notif.globalScore && (
                      <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 border border-teal-100 dark:border-teal-900/40 font-black text-[10px] rounded-lg tracking-wider shrink-0">
                        {t('notifications.match')} {notif.globalScore}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sky-600 dark:text-gray-300 text-sm font-medium leading-relaxed">
                    {notif.message}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase tracking-wider">
                    <span>
                      {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      }) : t('notifications.just_now')}
                    </span>
                    {notif.jobId && (
                      <span className="text-cyan-600 font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <Eye size={12} /> {t('notifications.view_offer')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

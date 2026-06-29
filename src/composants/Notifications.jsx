import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { Bell, Sparkles, Briefcase, CheckCircle, Mail, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
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
      toast.success("Toutes les notifications ont été marquées comme lues.");
    } catch (error) {
      toast.error("Impossible de tout mettre à jour.");
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'opportunity_boost':
        return <Sparkles className="text-amber-500" size={20} />;
      case 'application':
        return <Briefcase className="text-blue-500" size={20} />;
      case 'status_update':
        return <CheckCircle className="text-emerald-500" size={20} />;
      default:
        return <Bell className="text-slate-500" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <Mail size={48} className="text-slate-300 mb-4" />
        <p className="text-slate-600 font-bold">Connecte-toi pour consulter ton centre d'alertes.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* En-tête de page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Bell className="text-blue-600" /> Centre d'alertes
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Suivi de tes opportunités de carrière et de tes candidatures au Cameroun.
            </p>
          </div>
          
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-all self-start sm:self-center"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Liste des notifications */}
        {notifications.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase mb-1">Aucune notification</h3>
            <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto">
              Dès qu'un recruteur publiera une offre alignée avec tes compétences, l'analyse proactive s'affichera ici.
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
                    ? 'bg-white/60 border-slate-100 opacity-75 hover:opacity-100 hover:bg-white' 
                    : 'bg-white border-blue-100 shadow-md shadow-blue-900/5 hover:border-blue-300'
                }`}
              >
                {/* Indicateur de non-lecture */}
                {!notif.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                )}

                {/* Icône de gauche */}
                <div className={`p-3 rounded-xl shrink-0 ${
                  notif.read ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  {getIcon(notif.type)}
                </div>

                {/* Contenu */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className={`text-base font-black uppercase tracking-tight leading-tight ${
                      notif.read ? 'text-slate-700' : 'text-slate-900'
                    }`}>
                      {notif.title}
                    </h4>
                    {notif.globalScore && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-[10px] rounded-lg tracking-wider shrink-0">
                        MATCH {notif.globalScore}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    {notif.message}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>
                      {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      }) : "À l'instant"}
                    </span>
                    {notif.jobId && (
                      <span className="text-blue-600 font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <Eye size={12} /> Voir l'offre
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
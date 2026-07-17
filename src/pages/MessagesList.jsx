import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { MessageCircle, ArrowLeft, User, Clock, ChevronRight } from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';

export function MessagesList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { navigate('/login'); return; }
      setUserId(user.uid);

      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubConv = onSnapshot(q, async (snapshot) => {
        const convs = await Promise.all(
          snapshot.docs.map(async (d) => {
            const data = d.data();
            const otherId = data.participants?.find(p => p !== user.uid);
            let otherUser = null;
            if (otherId) {
              try {
                const snap = await getDoc(doc(db, 'users', otherId));
                if (snap.exists()) otherUser = snap.data();
              } catch (_) {}
            }
            return {
              id: d.id,
              ...data,
              otherUser,
              otherName: otherUser?.displayName || otherUser?.fullName || otherUser?.company || 'Utilisateur',
            };
          })
        );
        setConversations(convs);
        setLoading(false);
      }, (err) => {
        console.error('Erreur conversations:', err);
        setLoading(false);
      });

      return () => unsubConv();
    });

    return () => unsub();
  }, [navigate]);

  const formatTime = (ts) => {
    if (!ts?.toDate) return '';
    const d = ts.toDate();
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 relative z-10">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <MessageCircle size={22} className="text-cyan-400" />
                  Messages
                </h1>
                <p className="text-sky-300 text-xs font-medium mt-0.5">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Message de bienvenue */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-3">
          <div className="bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 border border-cyan-200 dark:border-cyan-800 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">&#x1F44B;</span>
            <div>
              <p className="text-sm font-bold text-sky-800 dark:text-gray-100">Bienvenue sur la messagerie CamerWork</p>
              <p className="text-xs text-sky-500 dark:text-gray-400 mt-0.5">Nous vous souhaitons de passer un agreable moment. Retrouvez ici toutes vos conversations avec les recruteurs et ami(e)s.</p>
            </div>
          </div>
        </div>

        {/* Liste des conversations */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-sky-100 dark:border-gray-700">
              <MessageCircle size={48} className="text-sky-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sky-400 dark:text-gray-400 font-bold">Aucune conversation</p>
              <p className="text-xs text-sky-300 dark:text-gray-500 mt-1">
                Vos conversations avec les recruteurs apparaîtront ici.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isMine = conv.lastSenderId === userId;
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-sky-100 dark:border-gray-700 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
                    {conv.otherUser?.photoURL ? (
                      <img src={conv.otherUser.photoURL} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      conv.otherName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-sky-800 dark:text-gray-100 truncate">
                        {conv.otherName}
                      </h3>
                      <span className="text-[10px] text-sky-400 dark:text-gray-500 shrink-0 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isMine ? 'text-sky-400 dark:text-gray-400' : 'text-sky-600 dark:text-gray-300 font-semibold'}`}>
                      {isMine && 'Vous : '}
                      {conv.lastMessage || 'Aucun message'}
                    </p>
                  </div>

                  <ChevronRight size={16} className="text-sky-300 dark:text-gray-600 shrink-0 group-hover:text-cyan-500 transition-colors" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}

export default MessagesList;

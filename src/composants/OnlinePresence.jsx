/**
 * OnlinePresence — Indicateur de présence temps réel via Firestore.
 * 
 * Utilise une collection "presence" avec le userId comme doc ID.
 * Met à jour un timestamp toutes les 60s. Si le timestamp date
 * de plus de 90s, l'utilisateur est considéré hors-ligne.
 * 
 * Usage :
 *   <OnlinePresence userId={otherUserId} />
 */
import { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

/**
 * Hook : signale la présence de l'utilisateur courant.
 * À appeler une fois dans un composant racine (ex: App.jsx).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePresenceTracker(userId) {
  useEffect(() => {
    if (!userId) return;
    const presenceRef = doc(db, 'presence', userId);

    // Marquer en ligne immédiatement, puis toutes les 60s
    const markOnline = () => {
      setDoc(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    };

    markOnline();
    const interval = setInterval(markOnline, 60000);

    // Marquer hors-ligne au démontage
    return () => {
      clearInterval(interval);
      setDoc(presenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    };
  }, [userId]);
}

/**
 * Composant : affiche le statut en ligne/hors-ligne d'un utilisateur.
 */
export function OnlinePresence({ userId, showLabel = false, size = 'sm' }) {
  const [presence, setPresence] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'presence', userId), (snap) => {
      if (snap.exists()) setPresence(snap.data());
    });
    return () => unsub();
  }, [userId]);

  if (!presence) {
    return <span className={`w-2 h-2 bg-sky-200 rounded-full ${showLabel ? 'inline-block mr-1' : ''}`} />;
  }

  const isOnline = presence.online === true;

  const dotSize = size === 'lg' ? 'w-3 h-3' : 'w-2 h-2';
  const textSize = size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <span className="flex items-center gap-1.5">
      <span className={`${dotSize} rounded-full ${isOnline ? 'bg-teal-500 animate-pulse' : 'bg-sky-300'}`} />
      {showLabel && (
        <span className={`${textSize} font-bold ${isOnline ? 'text-teal-600' : 'text-sky-400'}`}>
          {isOnline ? 'En ligne' : 'Hors-ligne'}
        </span>
      )}
    </span>
  );
}

/**
 * Formate le lastSeen en texte lisible.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function formatLastSeen(timestamp) {
  if (!timestamp?.toDate) return '';
  const diff = Date.now() - timestamp.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return timestamp.toDate().toLocaleDateString('fr-FR');
}

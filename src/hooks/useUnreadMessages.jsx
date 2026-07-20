import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function useUnreadMessages() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let unsubNotif = null;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (unsubNotif) {
        unsubNotif();
        unsubNotif = null;
      }
      if (!user) {
        setCount(0);
        return;
      }
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('type', '==', 'message'),
        where('read', '==', false)
      );
      unsubNotif = onSnapshot(q, (snap) => {
        setCount(snap.size || 0);
      }, (err) => {
        console.error('useUnreadMessages error:', err);
        setCount(0);
      });
    });

    return () => {
      if (unsubNotif) unsubNotif();
      unsubAuth();
    };
  }, []);

  return count;
}

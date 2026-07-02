import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 
import { getMessaging } from "firebase/messaging"; // Ajouté pour le build

const firebaseConfig = {
  apiKey: "AIzaSyBxTb3bWqQCDlTGRG9B4XEE9ik9ZBjOkuQ",
  authDomain: "camerwork-1e3d0.firebaseapp.com",
  projectId: "camerwork-1e3d0",
  storageBucket: "camerwork-1e3d0.firebasestorage.app",
  messagingSenderId: "124342889976",
  appId: "1:124342889976:web:6198946af6b190962c3a0d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 
export const messaging = getMessaging(app);

// Mode hors-ligne PWA : persistance IndexedDB
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence not supported in this browser');
  }
});
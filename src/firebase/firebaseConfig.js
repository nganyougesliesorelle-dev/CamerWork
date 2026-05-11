import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Ajouté pour le CV et Chat

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
export const storage = getStorage(app); // Exporté pour tes fonctionnalités d'upload
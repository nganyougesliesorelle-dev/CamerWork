import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 
import { getMessaging, isSupported } from "firebase/messaging"; // Import de isSupported pour sécuriser le build

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Garde-fou : alerter en dev si une variable critique est absente
if (import.meta.env.DEV) {
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');
  if (missing.length > 0) {
    console.error(
      `[Firebase] Variables d'environnement manquantes : ${missing.join(', ')}.\n` +
      `Vérifiez que le fichier .env existe à la racine du projet avec les préfixes VITE_.`
    );
  }
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Persistance IndexedDB activée dès la création de l'instance Firestore
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
});

export const storage = getStorage(app); 

// Initialisation sécurisée de Messaging pour éviter les plantages au Build
let messagingInstance = null;

// On vérifie si l'environnement (le navigateur) supporte Firebase Messaging avant d'appeler getMessaging
isSupported().then((supported) => {
  if (supported) {
    messagingInstance = getMessaging(app);
  } else {
    console.warn("[Firebase] Les notifications push ne sont pas supportées sur ce navigateur.");
  }
}).catch((err) => {
  console.error("[Firebase] Erreur lors de la vérification du support de Messaging :", err);
});

export const messaging = messagingInstance;
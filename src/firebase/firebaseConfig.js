import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 
import { getMessaging, isSupported } from "firebase/messaging"; // Import de isSupported pour sécuriser le build

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env;

const firebaseConfig = {
  apiKey: env?.VITE_FIREBASE_API_KEY || '',
  authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env?.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env?.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env?.VITE_FIREBASE_APP_ID || '',
};

const hasRequiredConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

// Garde-fou : alerter en dev si une variable critique est absente
if (env?.DEV) {
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

let app = null;
let auth = null;
let db = null;
let storage = null;
let messagingInstance = null;

if (hasRequiredConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => {
      console.warn('[Firebase] Impossible d’activer la persistance de session :', err);
    });

  // Persistance IndexedDB activée dès la création de l'instance Firestore
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
  });

  storage = getStorage(app);

  // Initialisation sécurisée de Messaging pour éviter les plantages au Build
  isSupported().then((supported) => {
    if (supported) {
      messagingInstance = getMessaging(app);
    } else {
      console.warn("[Firebase] Les notifications push ne sont pas supportées sur ce navigateur.");
    }
  }).catch((err) => {
    console.error("[Firebase] Erreur lors de la vérification du support de Messaging :", err);
  });
} else {
  console.warn('[Firebase] Configuration Firebase absente ; les services d’authentification et de stockage seront indisponibles dans cette exécution.');
}

export { auth, db, storage, messagingInstance as messaging };
// Importation des scripts Firebase nécessaires en arrière-plan
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuration alignée à 100% avec ton projet actif camerwork-1e3d0
firebase.initializeApp({
  authDomain: "camerwork-1e3d0.firebaseapp.com",
  projectId: "camerwork-1e3d0",
  storageBucket: "camerwork-1e3d0.firebasestorage.app",
  messagingSenderId: "124342889976", // Mis à jour avec ton vrai ID
  appId: "1:124342889976:web:6198946af6b190962c3a0d" // Mis à jour avec ton vrai App ID
});

const messaging = firebase.messaging();

// Intercepter et afficher la notification quand l'application est fermée (arrière-plan)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan: ', payload);

  const notificationTitle = payload.notification?.title || "Nouveau message sur CamerWork";
  const notificationOptions = {
    body: payload.notification?.body || "Consultez votre espace pour en savoir plus.",
    icon: '/logo.png', 
    badge: '/logo.png',
    data: payload.data 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
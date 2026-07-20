import { messaging, db } from './firebaseConfig';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Demande la permission et enregistre le Token FCM de l'utilisateur
 */
export const requestNotificationPermission = async (userId) => {
  try {
    // 1. Demande l'autorisation au navigateur/téléphone
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Permission accordée pour les notifications !');

      let swRegistration = null;
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service worker FCM enregistré:', swRegistration.scope);
      } catch (swError) {
        console.error('Impossible d’enregistrer le service worker FCM :', swError);
      }
      
      // 2. Récupère le Token FCM unique de l'appareil
      const currentToken = await getToken(messaging, {
        vapidKey: 'BP4FqtrbTG8uiflMy83l_pNfIO6D-ImuDXhlWTlYh1Ufoxdw85LcYr5svvdfp9-bvt6WQ5JRjKTCJNw5OaQVJIA',
        serviceWorkerRegistration: swRegistration || undefined,
      });
      
      if (currentToken) {
        console.log('Token FCM généré:', currentToken);
        
        // 3. Sauvegarde ce token dans le document de l'utilisateur sous forme de tableau
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        
        return { success: true, token: currentToken };
      } else {
        console.warn('Aucun jeton d’inscription disponible.');
        return { success: false, error: 'No token available' };
      }
    } else {
      console.warn('Permission de notification refusée.');
      return { success: false, error: 'Permission denied' };
    }
  } catch (error) {
    console.error('Erreur lors de la configuration des notifications push:', error);
    return { success: false, error: error.message };
  }
};
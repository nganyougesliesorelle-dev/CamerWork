/**
 * phoneVerificationService.js — Vérification par numéro de téléphone via Firebase Phone Auth.
 *
 * Utilise l'API Firebase Auth pour envoyer un SMS avec un code OTP,
 * puis vérifier ce code pour confirmer le numéro.
 *
 * Prérequis Firebase :
 *   - Phone Auth activé dans la console Firebase (Authentication → Sign-in method → Phone)
 *   - Projet sur le plan Blaze (pay-as-you-go) pour les SMS
 *   - SHA-1 debug/prod ajouté dans les paramètres du projet
 *
 * Usage :
 *   import { sendPhoneOTP, verifyPhoneOTP, setUpRecaptcha } from '../firebase/phoneVerificationService';
 *
 *   // Étape 1 : Initialiser reCAPTCHA
 *   const verifier = setUpRecaptcha('recaptcha-container');
 *
 *   // Étape 2 : Envoyer le code
 *   const result = await sendPhoneOTP('+237612345678', verifier);
 *
 *   // Étape 3 : Vérifier le code
 *   const verified = await verifyPhoneOTP(result.verificationId, '123456');
 */

import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Configure le vérificateur reCAPTCHA invisible.
 * À appeler UNE SEULE fois, au montage du composant.
 *
 * @param {string} containerId — ID de l'élément DOM conteneur
 * @returns {RecaptchaVerifier}
 */
export function setUpRecaptcha(containerId = 'recaptcha-container') {
  const auth = getAuth();
  // Nettoyer l'ancien vérificateur s'il existe
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA résolu — l'utilisateur est humain
      console.log('reCAPTCHA vérifié');
    },
    'expired-callback': () => {
      // reCAPTCHA expiré — l'utilisateur doit recommencer
      console.warn('reCAPTCHA expiré, veuillez réessayer');
    },
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Envoie un code OTP par SMS au numéro spécifié.
 *
 * @param {string} phoneNumber — Numéro international (ex: '+237612345678')
 * @param {RecaptchaVerifier} verifier — Instance reCAPTCHA
 * @returns {Promise<{ success: boolean, verificationId?: string, error?: string }>}
 */
export async function sendPhoneOTP(phoneNumber, verifier) {
  try {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return { success: false, error: 'Format de téléphone invalide. Utilisez le format international (+237...)' };
    }

    const auth = getAuth();
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);

    return {
      success: true,
      verificationId: confirmationResult.verificationId,
    };
  } catch (error) {
    console.error('Erreur envoi OTP:', error);

    let message = 'Impossible d\'envoyer le code.';
    if (error.code === 'auth/too-many-requests') {
      message = 'Trop de tentatives. Veuillez patienter avant de réessayer.';
    } else if (error.code === 'auth/invalid-phone-number') {
      message = 'Numéro de téléphone invalide. Vérifiez le format international.';
    } else if (error.code === 'auth/missing-phone-number') {
      message = 'Veuillez entrer un numéro de téléphone.';
    }

    return { success: false, error: message };
  }
}

/**
 * Vérifie le code OTP saisi par l'utilisateur.
 *
 * @param {string} verificationId — ID de vérification retourné par sendPhoneOTP
 * @param {string} otpCode — Code à 6 chiffres reçu par SMS
 * @param {string} userId — UID Firebase (pour mise à jour du profil)
 * @param {string} phoneNumber — Numéro vérifié (pour mise à jour Firestore)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function verifyPhoneOTP(verificationId, otpCode, userId, phoneNumber) {
  try {
    if (!verificationId || !otpCode) {
      return { success: false, error: 'Données de vérification manquantes.' };
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return { success: false, error: 'Le code doit contenir exactement 6 chiffres.' };
    }

    const credential = PhoneAuthProvider.credential(verificationId, otpCode);

    // Lier le téléphone au compte actuel ou se connecter si compte téléphone uniquement
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      // Lier le numéro au compte existant
      await currentUser.linkWithCredential(credential);
    } else {
      // Ce cas ne devrait pas arriver (on vérifie depuis un compte connecté)
      return { success: false, error: 'Vous devez être connecté pour vérifier votre téléphone.' };
    }

    // Mettre à jour Firestore
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        phone: phoneNumber,
        phoneVerified: true,
        phoneVerifiedAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur vérification OTP:', error);

    let message = 'Code invalide.';
    if (error.code === 'auth/invalid-verification-code') {
      message = 'Code incorrect. Veuillez vérifier et réessayer.';
    } else if (error.code === 'auth/credential-already-in-use') {
      message = 'Ce numéro est déjà lié à un autre compte.';
    } else if (error.code === 'auth/session-expired') {
      message = 'Session expirée. Veuillez recommencer.';
    }

    return { success: false, error: message };
  }
}

/**
 * Vérifie si un utilisateur a déjà vérifié son téléphone.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function isPhoneVerified(userId) {
  try {
    const userSnap = await (await import('firebase/firestore')).getDoc(
      doc(db, 'users', userId)
    );
    return userSnap.exists() && userSnap.data().phoneVerified === true;
  } catch {
    return false;
  }
}

export default { setUpRecaptcha, sendPhoneOTP, verifyPhoneOTP, isPhoneVerified };
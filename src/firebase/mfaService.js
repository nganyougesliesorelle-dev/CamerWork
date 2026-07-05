/**
 * mfaService.js — Gestionnaire de challenge MFA Firebase lors de l'authentification.
 *
 * Firebase Auth supporte le Multi-Factor Authentication (MFA) via :
 *   1. TOTP (Time-based One-Time Password) — application d'authentification
 *   2. Téléphone (SMS) — vérification par SMS
 *
 * Ce module gère le flux complet de connexion avec MFA :
 *   1. L'utilisateur saisit email + mot de passe
 *   2. Firebase détecte que MFA est requis et renvoie une erreur MFA
 *   3. On récupère le resolver MFA et on présente le challenge
 *   4. L'utilisateur fournit le code TOTP ou SMS
 *   5. On finalise la connexion
 *
 * Usage :
 *   import { initiateLogin, completeMfaChallenge, isMfaError } from './mfaService';
 *
 *   const result = await initiateLogin(email, password);
 *   if (result.mfaRequired) {
 *     // Afficher l'UI de saisie du code MFA
 *     const finalResult = await completeMfaChallenge(result.resolver, code);
 *   }
 */

import {
  signInWithEmailAndPassword,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  PhoneMultiFactorGenerator,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * Vérifie si une erreur Firebase est liée au MFA.
 * @param {Error} error
 * @returns {boolean}
 */
export function isMfaError(error) {
  return error?.code === 'auth/multi-factor-auth-required';
}

/**
 * Initie la connexion email/mot de passe.
 * Si MFA est requis, retourne le resolver MFA pour l'étape 2.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{
 *   success: boolean,
 *   user?: import('firebase/auth').User,
 *   mfaRequired?: boolean,
 *   resolver?: import('firebase/auth').MultiFactorResolver,
 *   error?: string
 * }>}
 */
export async function initiateLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    // Connexion directe réussie (pas de MFA)
    return { success: true, user: userCredential.user, mfaRequired: false };
  } catch (error) {
    if (isMfaError(error)) {
      // MFA requis — on récupère le resolver
      const resolver = getMultiFactorResolver(auth, error);
      return {
        success: false,
        mfaRequired: true,
        resolver,
        error: 'Vérification en deux étapes requise.',
      };
    }
    // Autre erreur (mauvais mot de passe, compte inexistant, etc.)
    return { success: false, mfaRequired: false, error: error.message };
  }
}

/**
 * Finalise la connexion MFA avec un code TOTP.
 *
 * @param {import('firebase/auth').MultiFactorResolver} resolver
 * @param {string} totpCode — Code à 6 chiffres de l'application d'authentification
 * @returns {Promise<{ success: boolean, user?: import('firebase/auth').User, error?: string }>}
 */
export async function completeMfaChallenge(resolver, totpCode) {
  try {
    if (!resolver) throw new Error('Resolver MFA manquant.');

    const assertion = TotpMultiFactorGenerator.assertionForSignIn(
      resolver.hints[0]?.uid || '',
      totpCode
    );

    const userCredential = await resolver.resolveSignIn(assertion);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Erreur MFA:', error);
    let message = 'Code de vérification invalide.';
    if (error.code === 'auth/invalid-verification-code') {
      message = 'Code incorrect. Veuillez vérifier et réessayer.';
    } else if (error.code === 'auth/mfa-session-expired') {
      message = 'Session expirée. Veuillez vous reconnecter.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Trop de tentatives. Veuillez patienter avant de réessayer.';
    }
    return { success: false, error: message };
  }
}

/**
 * Récupère la liste des facteurs MFA disponibles depuis le resolver.
 * Utile pour afficher les options à l'utilisateur (TOTP vs SMS).
 *
 * @param {import('firebase/auth').MultiFactorResolver} resolver
 * @returns {{ uid: string, displayName?: string, factorId: string }[]}
 */
export function getMfaHints(resolver) {
  if (!resolver?.hints) return [];
  return resolver.hints.map((hint) => ({
    uid: hint.uid || '',
    displayName: hint.displayName || 'Non nommé',
    factorId: hint.factorId || 'unknown',
  }));
}

export default { initiateLogin, completeMfaChallenge, isMfaError, getMfaHints };

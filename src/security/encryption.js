/**
 * encryption.js — Chiffrement AES-256 côté client avec crypto-js.
 *
 * Utilise la bibliothèque crypto-js pour chiffrer les champs sensibles
 * (téléphone, adresse) avant insertion dans Firestore.
 *
 * Note : La clé de chiffrement NE DOIT PAS être exposée côté client
 * en production. Utiliser ce module pour le chiffrement via le backend
 * (envoyer les données au serveur, qui les chiffre avec la clé serveur).
 *
 * Pour une utilisation 100% client, générer une clé par utilisateur
 * dérivée de son UID Firebase (moins sécurisé mais acceptable).
 *
 * Usage :
 *   import { encryptField, decryptField } from './security/encryption';
 *   const encrypted = encryptField('0612345678', user.uid);
 *   const decrypted = decryptField(encrypted, user.uid);
 */

import CryptoJS from 'crypto-js';

// ─── Clé de chiffrement par utilisateur ────────────────────────────

/**
 * Dérive une clé AES-256 à partir de l'UID Firebase.
 * En production, utiliser une clé maître côté serveur.
 *
 * @param {string} uid — UID Firebase de l'utilisateur
 * @returns {CryptoJS.lib.WordArray} Clé de 256 bits
 */
function deriveUserKey(uid) {
  if (!uid) throw new Error('UID requis pour le chiffrement');
  // Combiner UID + salt fixe pour dériver une clé stable
  const salt = 'CamerWork_SecureKey_2026_v1';
  return CryptoJS.PBKDF2(uid + salt, CryptoJS.enc.Hex.parse('camerwork_salt_16'), {
    keySize: 256 / 32,
    iterations: 10000,
  });
}

// ─── Chiffrement AES-256 ───────────────────────────────────────────

/**
 * Chiffre un champ texte avec AES-256.
 * @param {string} value — Valeur à chiffrer
 * @param {string} uid — UID utilisateur pour la dérivation de clé
 * @returns {string} Format : "ivBase64:ciphertextBase64"
 */
export function encryptField(value, uid) {
  if (!value || typeof value !== 'string') return value;

  const key = deriveUserKey(uid);
  const iv = CryptoJS.lib.WordArray.random(16); // 128 bits IV

  const encrypted = CryptoJS.AES.encrypt(value, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return `${CryptoJS.enc.Base64.stringify(iv)}:${encrypted.toString()}`;
}

/**
 * Déchiffre un champ texte avec AES-256.
 * @param {string} encryptedValue — Format "ivBase64:ciphertextBase64"
 * @param {string} uid — UID utilisateur pour la dérivation de clé
 * @returns {string} Valeur déchiffrée
 */
export function decryptField(encryptedValue, uid) {
  if (!encryptedValue || typeof encryptedValue !== 'string') return encryptedValue;

  const parts = encryptedValue.split(':');
  if (parts.length !== 2) return encryptedValue; // Pas chiffré

  const [ivBase64, ciphertext] = parts;

  try {
    const key = deriveUserKey(uid);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    return plaintext || encryptedValue; // Fallback si échec
  } catch {
    return encryptedValue;
  }
}

/**
 * Chiffre un objet en ne touchant que les champs sensibles spécifiés.
 * @param {Object} data — Objet à protéger partiellement
 * @param {string} uid — UID utilisateur
 * @param {string[]} sensitiveFields — Champs à chiffrer
 * @returns {Object} Copie avec champs sensibles chiffrés
 */
export function encryptSensitiveFields(data, uid, sensitiveFields = ['phone', 'address', 'adresse']) {
  if (!data || typeof data !== 'object') return data;

  const result = { ...data };
  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encryptField(result[field], uid);
    }
  }
  return result;
}

/**
 * Déchiffre les champs sensibles d'un objet.
 * @param {Object} data — Objet avec champs chiffrés
 * @param {string} uid — UID utilisateur
 * @param {string[]} sensitiveFields — Champs à déchiffrer
 * @returns {Object} Copie avec champs déchiffrés
 */
export function decryptSensitiveFields(data, uid, sensitiveFields = ['phone', 'address', 'adresse']) {
  if (!data || typeof data !== 'object') return data;

  const result = { ...data };
  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decryptField(result[field], uid);
    }
  }
  return result;
}

/**
 * Hachage SHA-256 simple (pour les tokens, pas les mots de passe !).
 * Les mots de passe sont gérés par Firebase Auth.
 */
export function sha256(text) {
  return CryptoJS.SHA256(text).toString();
}

export default { encryptField, decryptField, encryptSensitiveFields, decryptSensitiveFields, sha256 };

/**
 * crypto.js — Utilitaires de chiffrement AES-256 et hachage bcrypt.
 *
 * Chiffrement : AES-256 en mode CBC avec IV aléatoire.
 * Hachage    : bcrypt avec salt rounds configurable.
 *
 * Usage chiffrement :
 *   const { encrypt, decrypt } = require('./crypto');
 *   const cipher = encrypt('0612345678');          // → "iv:encryptedBase64"
 *   const plain  = decrypt(cipher);                // → "0612345678"
 *
 * Usage hachage :
 *   const { hashPassword, verifyPassword } = require('./crypto');
 *   const hash = await hashPassword('userPassword');
 *   const valid = await verifyPassword('userPassword', hash); // → true
 */

import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

// ─── Configuration ────────────────────────────────────────────────
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 128 bits pour AES
const BCRYPT_ROUNDS = 12;

// Récupère la clé de chiffrement depuis l'environnement
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_SECRET;
  if (!key) throw new Error('ENCRYPTION_SECRET non définie dans .env');
  // La clé doit faire 32 octets (256 bits) pour AES-256
  return crypto.createHash('sha256').update(key).digest();
}

// ─── AES-256 Chiffrement / Déchiffrement ──────────────────────────

/**
 * Chiffre une chaîne avec AES-256-CBC.
 * @param {string} text — Texte à chiffrer
 * @returns {string} Format : "ivHex:ciphertextHex"
 */
export function encrypt(text) {
  if (!text || typeof text !== 'string') return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-CBC.
 * @param {string} encryptedText — Format "ivHex:ciphertextHex"
 * @returns {string} Texte déchiffré
 */
export function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;

  const parts = encryptedText.split(':');
  if (parts.length !== 2) return encryptedText; // pas chiffré, retourner tel quel

  const [ivHex, cipherHex] = parts;
  if (ivHex.length !== IV_LENGTH * 2) return encryptedText;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText; // échec silencieux, retourne la valeur brute
  }
}

/**
 * Chiffre récursivement les champs sensibles dans un objet.
 * Champs ciblés : phone, telephone, address, adresse, location (optionnel).
 * @param {Object} data — Objet à chiffrer partiellement
 * @param {string[]} fields — Champs à chiffrer
 * @returns {Object} Copie avec champs chiffrés
 */
export function encryptSensitiveFields(data, fields = ['phone', 'telephone', 'address', 'adresse']) {
  if (!data || typeof data !== 'object') return data;

  const result = { ...data };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

/**
 * Déchiffre récursivement les champs sensibles dans un objet.
 * @param {Object} data — Objet avec champs chiffrés
 * @param {string[]} fields — Champs à déchiffrer
 * @returns {Object} Copie avec champs déchiffrés
 */
export function decryptSensitiveFields(data, fields = ['phone', 'telephone', 'address', 'adresse']) {
  if (!data || typeof data !== 'object') return data;

  const result = { ...data };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
}

// ─── bcrypt Hachage ───────────────────────────────────────────────

/**
 * Hache un mot de passe avec bcrypt.
 * @param {string} password — Mot de passe en clair
 * @returns {Promise<string>} Hash bcrypt
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Vérifie un mot de passe contre un hash bcrypt.
 * @param {string} password — Mot de passe en clair
 * @param {string} hash — Hash bcrypt stocké
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export default { encrypt, decrypt, encryptSensitiveFields, decryptSensitiveFields, hashPassword, verifyPassword };

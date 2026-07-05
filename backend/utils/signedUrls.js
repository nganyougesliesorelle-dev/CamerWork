/**
 * signedUrls.js — Génération d'URLs signées temporaires pour Firebase Storage.
 *
 * Utilise l'Admin SDK pour créer des signed URLs expirant après
 * une durée configurable (défaut : 15 minutes).
 *
 * Usage :
 *   const url = await generateSignedUrl('cvs/user123_cv.pdf', 900); // 15 min
 */

import { getStorage } from 'firebase-admin/storage';

const DEFAULT_EXPIRY_SECONDS = 900; // 15 minutes
const MAX_EXPIRY_SECONDS = 3600;    // 1 heure max

/**
 * Génère une URL signée temporaire pour un fichier Storage.
 * @param {string} filePath — Chemin du fichier dans le bucket (ex: "cvs/user123_cv.pdf")
 * @param {number} expiresInSeconds — Durée de validité en secondes (défaut: 900, max: 3600)
 * @returns {Promise<string>} URL signée
 */
export async function generateSignedUrl(filePath, expiresInSeconds = DEFAULT_EXPIRY_SECONDS) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Chemin de fichier invalide');
  }

  const expires = Math.min(Math.max(1, expiresInSeconds), MAX_EXPIRY_SECONDS);
  const bucket = getStorage().bucket();

  const [url] = await bucket.file(filePath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expires * 1000,
  });

  return url;
}

/**
 * Génère une URL signée pour un upload temporaire.
 * @param {string} filePath — Chemin de destination
 * @param {number} expiresInSeconds — Durée (défaut: 300 = 5 min)
 * @returns {Promise<string>}
 */
export async function generateUploadSignedUrl(filePath, expiresInSeconds = 300) {
  const expires = Math.min(Math.max(1, expiresInSeconds), MAX_EXPIRY_SECONDS);
  const bucket = getStorage().bucket();

  const [url] = await bucket.file(filePath).getSignedUrl({
    version: 'v4',
    action: 'write',
    contentType: 'application/octet-stream',
    expires: Date.now() + expires * 1000,
  });

  return url;
}

export default { generateSignedUrl, generateUploadSignedUrl };

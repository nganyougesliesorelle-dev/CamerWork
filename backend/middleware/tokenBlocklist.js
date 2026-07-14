/**
 * tokenBlocklist.js — Mécanisme de révocation de tokens JWT.
 *
 * Problème : les JWT sont stateless — une fois émis, ils restent valides
 * jusqu'à expiration. Impossible de les révoquer sans état serveur.
 *
 * Solution : une blocklist (Set en mémoire, Redis en production) qui stocke
 * les jetons révoqués (par jti ou par hash). Le middleware vérifie chaque
 * jeton entrant contre cette liste.
 *
 * Usage :
 *   import { blocklistToken, isTokenBlocked, cleanupBlocklist } from './middleware/tokenBlocklist.js';
 *
 *   // Révoquer un token (logout, changement de mot de passe, admin kick)
 *   await blocklistToken(tokenHash, expiresInSeconds);
 *
 *   // Vérifier dans le middleware d'authentification
 *   if (isTokenBlocked(tokenHash)) return res.status(401).json(...);
 *
 * ⚠️  En mémoire uniquement — utiliser Redis (ioredis) en production
 *     pour la persistance et le partage multi-process.
 */

import crypto from 'node:crypto';
import { logger } from './auditLogger.js';

// Map<jtiHash, { revokedAt, expiresAt }>
const blocklist = new Map();

// Nettoyage périodique : supprimer les entrées expirées
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calcule un hash SHA-256 du token pour la blocklist.
 * Le hash permet de stocker une référence non-réversible.
 *
 * @param {string} token — Le JWT complet
 * @returns {string} Hash hexadécimal
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Extrait le jti (JWT ID) d'un payload décodé, ou fallback sur le hash.
 *
 * @param {Object} decoded — Payload JWT décodé
 * @param {string} rawToken — Token brut (pour le hash si pas de jti)
 * @returns {string} Identifiant unique du token
 */
export function getTokenIdentifier(decoded, rawToken) {
  // Priorité au jti (standard, plus court)
  if (decoded.jti) return decoded.jti;
  // Fallback : hash du token complet
  return hashToken(rawToken);
}

/**
 * Ajoute un token à la blocklist.
 *
 * @param {string} identifier — jti ou hash du token
 * @param {number} ttlSeconds — Durée de vie restante en secondes
 */
export function blocklistToken(identifier, ttlSeconds = 3600) {
  const expiresAt = Date.now() + ttlSeconds * 1000;

  blocklist.set(identifier, {
    revokedAt: Date.now(),
    expiresAt,
  });

  logger.info('Token révoqué', {
    action: 'token_revoked',
    tokenPrefix: identifier.substring(0, 16),
    ttlSeconds,
  });
}

/**
 * Vérifie si un token est dans la blocklist.
 *
 * @param {string} identifier — jti ou hash du token
 * @returns {boolean}
 */
export function isTokenBlocked(identifier) {
  const entry = blocklist.get(identifier);
  if (!entry) return false;

  // Si l'entrée est expirée, on peut la nettoyer
  if (Date.now() > entry.expiresAt) {
    blocklist.delete(identifier);
    return false;
  }

  return true;
}

/**
 * Révoque tous les tokens d'un utilisateur (ex: reset password, admin kick).
 * En production, maintenir une Map<userId, Set<jti>>.
 *
 * @param {string} userId — UID de l'utilisateur
 */
export function revokeAllUserTokens(userId) {
  // En mémoire, on ne peut pas facilement retrouver tous les tokens d'un user
  // En production (Redis) : stocker userId → Set<jti>
  logger.info('Révocation de tous les tokens demandée (mode mémoire limité)', {
    action: 'revoke_all_tokens',
    userId,
  });

  // Implémentation Redis :
  // const userTokens = await redis.smembers(`user_tokens:${userId}`);
  // for (const jti of userTokens) {
  //   await redis.set(`blocked:${jti}`, '1', 'EX', tokenTtl);
  // }
  // await redis.del(`user_tokens:${userId}`);
}

/**
 * Nettoie périodiquement les entrées expirées de la blocklist.
 */
function cleanupBlocklist() {
  const now = Date.now();
  let cleaned = 0;

  for (const [identifier, entry] of blocklist.entries()) {
    if (now > entry.expiresAt) {
      blocklist.delete(identifier);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Blocklist nettoyée : ${cleaned} entrées expirées`, {
      action: 'blocklist_cleanup',
      cleaned,
      remaining: blocklist.size,
    });
  }
}

// Démarrer le nettoyage périodique
const cleanupTimer = setInterval(cleanupBlocklist, CLEANUP_INTERVAL_MS);
// Permettre au processus de s'arrêter proprement
if (typeof cleanupTimer?.unref === 'function') cleanupTimer.unref();

// Stats (pour monitoring)
export function getBlocklistStats() {
  return {
    size: blocklist.size,
    memory: process.memoryUsage?.()?.heapUsed || 0,
  };
}

export { cleanupBlocklist };
export default { hashToken, getTokenIdentifier, blocklistToken, isTokenBlocked, revokeAllUserTokens, getBlocklistStats };
/**
 * auditLogger.js — Journalisation et audit avec Winston.
 *
 * Trace toutes les actions critiques :
 *   - Connexions (réussies / échouées)
 *   - Modifications de CV
 *   - Suppressions (offres, candidatures, comptes)
 *   - Uploads de fichiers
 *   - Actions admin
 *
 * Niveaux de log :
 *   - audit  : actions critiques (connexions, suppressions, modifications admin)
 *   - info   : actions normales (créations, mises à jour)
 *   - warn   : anomalies (tentatives échouées répétées, fichiers invalides)
 *   - error  : erreurs serveur
 *
 * Sorties :
 *   - Console (développement)
 *   - Fichiers avec rotation quotidienne (production) : logs/audit-YYYY-MM-DD.log
 *
 * Intégration Sentry : utiliser un transport Winston → Sentry en production.
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');

// Niveaux personnalisés
const customLevels = {
  levels: {
    audit: 0,  // Plus critique que error pour les actions de sécurité
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    audit: 'red bold',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'grey',
  },
};

winston.addColors(customLevels.colors);

// Transport : rotation quotidienne avec rétention 30 jours
const dailyRotateTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'audit-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',  // Rotation après 20 MB
  maxFiles: '30d', // Conservation 30 jours
  level: 'audit',  // Niveau minimum pour ce transport
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.json()
  ),
  zippedArchive: true, // Compresser les anciens logs
});

// Transport : console (développement)
const consoleTransport = new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, userId, action, ip, ...meta }) => {
      const userPart = userId ? ` [uid:${userId}]` : '';
      const actionPart = action ? ` [${action}]` : '';
      const ipPart = ip ? ` [${ip}]` : '';
      const metaPart = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level}${userPart}${actionPart}${ipPart} ${message}${metaPart}`;
    })
  ),
});

// Logger principal
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: 'debug',
  transports: [
    consoleTransport,
    // En production, activer la rotation fichier
    ...(process.env.NODE_ENV === 'production' ? [dailyRotateTransport] : []),
  ],
});

// Transport Sentry (chargement lazy — ne bloque pas si @sentry/node absent)
if (process.env.SENTRY_DSN) {
  import('./sentryTransport.js').then(({ createSentryTransport }) => {
    logger.add(createSentryTransport());
    logger.info('Transport Sentry activé');
  }).catch(() => {
    logger.warn('Transport Sentry non disponible (@sentry/node manquant)');
  });
} else if (process.env.NODE_ENV === 'production') {
  logger.warn('SENTRY_DSN non configuré — alertes Sentry désactivées');
}

// ─── Fonctions d'audit spécialisées ────────────────────────────────

/**
 * Journalise une connexion (réussie ou échouée).
 * @param {Object} params
 * @param {string} params.email — Email tenté
 * @param {boolean} params.success — Connexion réussie ?
 * @param {string} params.ip — Adresse IP
 * @param {string} [params.userId] — UID Firebase si réussi
 * @param {string} [params.reason] — Raison de l'échec
 */
export function auditLogin({ email, success, ip, userId, reason }) {
  const level = success ? 'info' : 'warn';
  logger.log(level, `Connexion ${success ? 'réussie' : 'échouée'}`, {
    action: 'login',
    userId: userId || undefined,
    email,
    ip,
    success,
    reason: reason || undefined,
  });
}

/**
 * Journalise la modification ou suppression d'un CV.
 */
export function auditCvAction({ userId, action, fileName, ip }) {
  logger.log('audit', `CV ${action}`, {
    action: `cv_${action}`, // cv_upload, cv_delete, cv_generate
    userId,
    fileName,
    ip,
  });
}

/**
 * Journalise une suppression (offre, candidature, compte).
 */
export function auditDeletion({ userId, resourceType, resourceId, reason, ip }) {
  logger.log('audit', `${resourceType} supprimé`, {
    action: `delete_${resourceType}`,
    userId,
    resourceId,
    reason: reason || 'Non spécifiée',
    ip,
  });
}

/**
 * Journalise une action administrative.
 */
export function auditAdmin({ userId, action, targetId, details, ip }) {
  logger.log('audit', `Admin: ${action}`, {
    action: `admin_${action}`,
    userId,
    targetId,
    details,
    ip,
  });
}

// ─── Détection comportementale ─────────────────────────────────────

// Compteur en mémoire (reset au redémarrage; utiliser Redis en prod)
const bruteForceTracker = new Map(); // Map<ip:email, { count, firstAttempt, blocked }>

const BRUTE_FORCE_THRESHOLD = 50;   // 50 tentatives
const BRUTE_FORCE_WINDOW_MS = 60000; // en 1 minute

/**
 * Détecte les tentatives de brute-force et déclenche une alerte.
 * @param {string} ip — IP du client
 * @param {string} email — Email tenté
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function detectBruteForce(ip, email) {
  const key = `${ip}:${email}`;
  const now = Date.now();

  let entry = bruteForceTracker.get(key);

  if (!entry || now - entry.firstAttempt > BRUTE_FORCE_WINDOW_MS) {
    // Nouvelle fenêtre
    entry = { count: 1, firstAttempt: now, blocked: false };
    bruteForceTracker.set(key, entry);
    return { blocked: false };
  }

  entry.count++;

  if (entry.count >= BRUTE_FORCE_THRESHOLD && !entry.blocked) {
    entry.blocked = true;

    // ALERTE : à connecter à Sentry ou un webhook Slack/email
    logger.log('audit',
      `🚨 ALERTE BRUTE-FORCE : ${entry.count} tentatives en 1 minute`,
      {
        action: 'brute_force_alert',
        ip,
        email,
        count: entry.count,
        windowMs: BRUTE_FORCE_WINDOW_MS,
      }
    );

    return { blocked: true, reason: `Seuil de ${BRUTE_FORCE_THRESHOLD} tentatives dépassé en 1 minute` };
  }

  bruteForceTracker.set(key, entry);
  return { blocked: entry.blocked };
}

/**
 * Nettoie périodiquement les entrées expirées du tracker (appeler via setInterval).
 */
export function cleanupBruteForceTracker() {
  const now = Date.now();
  for (const [key, entry] of bruteForceTracker.entries()) {
    if (now - entry.firstAttempt > BRUTE_FORCE_WINDOW_MS * 2) {
      bruteForceTracker.delete(key);
    }
  }
}

export { logger };
export default logger;

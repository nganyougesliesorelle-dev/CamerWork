/**
 * httpsEnforcer.js — Middleware de redirection HTTPS obligatoire.
 *
 * En environnement de production, redirige toutes les requêtes HTTP
 * vers HTTPS avec un code 301 (Moved Permanently).
 *
 * Combine avec le Strict-Transport-Security (HSTS) déjà configuré dans
 * Helmet pour une double protection :
 *   1. Ce middleware redirige HTTP → HTTPS (première visite)
 *   2. HSTS empêche le navigateur de retenter HTTP pendant 1 an
 *
 * Usage :
 *   import { httpsEnforcer } from './middleware/httpsEnforcer.js';
 *   app.use(httpsEnforcer);
 *
 * Placer AVANT Helmet et les autres middlewares.
 */

import { logger } from './auditLogger.js';

/**
 * Middleware de redirection HTTPS.
 * À placer tout en haut de la chaîne Express.
 */
export function httpsEnforcer(req, res, next) {
  // En développement, skip (les certificats locaux sont pénibles)
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Vérifier si la requête est déjà en HTTPS
  // Express : req.secure ou req.protocol === 'https'
  // Derrière un proxy (nginx/Cloudflare) : vérifier X-Forwarded-Proto
  const proto = req.headers['x-forwarded-proto'] || req.protocol;

  if (proto === 'https') {
    return next();
  }

  // Redirection HTTP → HTTPS
  const httpsUrl = `https://${req.headers.host}${req.originalUrl}`;

  logger.info('Redirection HTTP → HTTPS', {
    action: 'https_redirect',
    from: req.originalUrl,
    ip: req.ip,
    host: req.headers.host,
  });

  return res.redirect(301, httpsUrl);
}

export default httpsEnforcer;

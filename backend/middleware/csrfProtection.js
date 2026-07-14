/**
 * csrfProtection.js — Protection CSRF par double-submit cookie pattern.
 *
 * Stratégie : double-submit cookie (stateless, pas de session serveur requise).
 *
 * Fonctionnement :
 *   1. À l'arrivée sur l'app, le serveur génère un token CSRF aléatoire.
 *   2. Le token est envoyé dans un cookie HttpOnly: false (lisible par JS)
 *      ET comme en-tête de réponse X-CSRF-Token.
 *   3. Le frontend lit le cookie et l'envoie dans l'en-tête X-CSRF-Token
 *      à chaque requête POST/PUT/DELETE.
 *   4. Le middleware vérifie que cookie === header.
 *
 * Protection :
 *   - Un attaquant ne peut pas lire le cookie (SameSite=Strict)
 *   - Un attaquant ne peut pas définir l'en-tête X-CSRF-Token (CORS)
 *   - Double vérification : le cookie et le header doivent correspondre
 *
 * Usage :
 *   import { csrfProtection, csrfTokenGenerator } from './middleware/csrfProtection.js';
 *   app.use(csrfTokenGenerator); // Envoie le token initial
 *   app.use(csrfProtection);     // Vérifie les requêtes mutantes
 *
 * Endpoints exclus (pas de vérification CSRF) :
 *   - GET, HEAD, OPTIONS (lecture seule)
 *   - Webhooks externes (Stripe, etc.)
 *   - API mobile (utilise des tokens Bearer)
 */

import crypto from 'node:crypto';
import { logger } from './auditLogger.js';

const TOKEN_BYTE_LENGTH = 32;
const COOKIE_NAME = '__Host-csrf-token';
const HEADER_NAME = 'x-csrf-token';
const CSRF_MAX_AGE_MS = 86400 * 1000; // 24 heures

// Routes exclues de la vérification CSRF
const CSRF_EXCLUDED_PATHS = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/mfa/verify',
  '/api/webhooks/', // Webhooks externes
];

function isExcluded(req) {
  return CSRF_EXCLUDED_PATHS.some(prefix => req.path.startsWith(prefix));
}

/**
 * Génère un token CSRF aléatoire.
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
}

/**
 * Middleware : Génère et envoie le token CSRF initial.
 * À appeler avant les routes pour que le frontend reçoive le cookie.
 */
export function csrfTokenGenerator(req, res, next) {
  // Ne générer un nouveau token que si le cookie n'existe pas
  const existingToken = req.cookies?.[COOKIE_NAME];

  if (!existingToken) {
    const token = generateToken();
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,     // Doit être lisible par JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: CSRF_MAX_AGE_MS,
      // Pas de signed: le double-submit vérifie cookie == header
    });

    // Envoyer aussi dans l'en-tête pour les clients qui préfèrent
    res.setHeader('X-CSRF-Token', token);
  }

  next();
}

/**
 * Middleware : Vérifie la correspondance cookie ↔ header.
 * Protège les requêtes mutantes (POST, PUT, PATCH, DELETE).
 */
export function csrfProtection(req, res, next) {
  // Ne vérifier que les méthodes mutantes
  const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Exclure les chemins configurés
  if (isExcluded(req)) {
    return next();
  }

  // Vérifier le token
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers[HEADER_NAME];

  if (!cookieToken || !headerToken) {
    logger.warn('CSRF : token manquant', {
      action: 'csrf_missing_token',
      method: req.method,
      path: req.path,
      ip: req.ip,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });

    return res.status(403).json({
      error: 'Validation CSRF échouée',
      message: 'Token CSRF manquant. Actualisez la page et réessayez.',
    });
  }

  // Comparaison en temps constant pour éviter le timing attack
  if (cookieToken.length !== headerToken.length) {
    logger.warn('CSRF : longueur de token incohérente', {
      action: 'csrf_length_mismatch',
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    return res.status(403).json({
      error: 'Validation CSRF échouée',
      message: 'Token CSRF invalide.',
    });
  }

  // Comparaison en temps constant
  const valid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );

  if (!valid) {
    logger.warn('CSRF : token invalide', {
      action: 'csrf_validation_failed',
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    return res.status(403).json({
      error: 'Validation CSRF échouée',
      message: 'Token CSRF invalide.',
    });
  }

  next();
}

export default { csrfTokenGenerator, csrfProtection };
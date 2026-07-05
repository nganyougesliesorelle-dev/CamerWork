/**
 * rateLimiter.js — Limitation de requêtes par IP via express-rate-limit.
 *
 * - Limiteur global : 100 requêtes / 15 minutes par IP
 * - Limiteur auth  : 10 tentatives / 15 minutes par IP (force brute)
 * - Limiteur API   : 30 requêtes / minute par IP (endpoints sensibles)
 *
 * En production, derrière un proxy (nginx/Cloudflare), utiliser :
 *   app.set('trust proxy', 1);
 */

import rateLimit from 'express-rate-limit';

// Stockage en mémoire (OK pour dev mono-process; utiliser Redis/Memcached en prod)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,  // Retourne RateLimit-* headers
  legacyHeaders: false,   // Désactive X-RateLimit-*
  message: {
    error: 'Trop de requêtes',
    message: 'Limite de requêtes dépassée. Veuillez réessayer dans 15 minutes.',
    retryAfter: '900 seconds',
  },
  keyGenerator: (req) => {
    // Priorité : X-Forwarded-For (proxy) → X-Real-IP → req.ip
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.ip;
  },
  skip: () => process.env.NODE_ENV === 'test', // Désactiver en test
});

/**
 * Limiteur strict pour les endpoints d'authentification.
 * 10 tentatives / 15 minutes → bloque l'énumération d'emails et le brute-force.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de tentatives',
    message: 'Trop de tentatives de connexion. Compte bloqué temporairement. Réessayez dans 15 minutes.',
  },
  keyGenerator: (req) => {
    // Combiner IP + email pour un blocage plus granulaire
    const email = req.body?.email || 'unknown';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.ip;
    return `${ip}:${email}`;
  },
});

/**
 * Limiteur pour les endpoints API sensibles (upload, suppression, etc.).
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Débit dépassé',
    message: 'Trop de requêtes API. Limite : 30/minute.',
  },
});

export { globalLimiter, authLimiter, apiLimiter };
export default globalLimiter;

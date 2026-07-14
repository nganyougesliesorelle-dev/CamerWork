/**
 * inputSanitizer.js — Assainissement récursif des entrées HTTP.
 *
 * Nettoie tous les champs de req.body, req.query, et req.params :
 *   - Trim automatique des chaînes
 *   - Suppression des caractères de contrôle Unicode (U+0000-U+001F, U+007F-U+009F)
 *   - Normalisation Unicode (NFC)
 *   - Blocage des chaînes contenant des patterns d'injection évidents
 *   - Protection contre le prototype pollution
 *
 * Ne remplace PAS la validation métier (Joi/Yup) — c'est une couche
 * supplémentaire de défense en profondeur.
 *
 * Usage :
 *   import { sanitizeInput } from './middleware/inputSanitizer.js';
 *   app.use(sanitizeInput);
 *
 *   // Placer AVANT express.json() pour nettoyer les entrées brutes
 *   // ou APRÈS pour nettoyer les objets parsés (recommandé)
 */

import { logger } from './auditLogger.js';

// Caractères de contrôle Unicode dangereux (hors tab, CR, LF)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// Patterns d'injection évidents à bloquer
const INJECTION_PATTERNS = [
  /<script[^>]*>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?[^"'>]*["']?/i,
  /\$\{.*\}/, // Template injection
  /eval\s*\(/i,
  /Function\s*\(/i,
  /setTimeout\s*\(\s*["'][^"']*["']/i,
];

// Clés à protéger contre le prototype pollution
const PROTECTED_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * Détecte si une chaîne contient des patterns d'injection.
 */
function hasInjectionPattern(value) {
  if (typeof value !== 'string') return false;
  return INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Nettoie une valeur scalaire.
 */
function sanitizeScalar(value) {
  if (typeof value === 'string') {
    // Supprimer les caractères de contrôle
    let cleaned = value.replace(CONTROL_CHARS_REGEX, '');

    // Trim
    cleaned = cleaned.trim();

    // Normalisation Unicode NFC
    try {
      cleaned = cleaned.normalize('NFC');
    } catch {
      // Normalisation non supportée, on garde la valeur nettoyée
    }

    // Tronquer les chaînes excessivement longues (>100K caractères)
    if (cleaned.length > 100000) {
      cleaned = cleaned.substring(0, 100000);
    }

    return cleaned;
  }

  return value;
}

/**
 * Nettoie récursivement un objet ou tableau.
 * Protège contre le prototype pollution.
 *
 * @param {*} input — Valeur à nettoyer
 * @param {number} depth — Profondeur maximale de récursion
 * @returns {*} Copie nettoyée
 */
function sanitizeRecursive(input, depth = 10) {
  // Limite de profondeur pour éviter les attaques par récursion infinie
  if (depth <= 0) return null;

  // Scalaires
  if (typeof input === 'string') return sanitizeScalar(input);
  if (typeof input !== 'object' || input === null) return input;

  // Tableaux
  if (Array.isArray(input)) {
    // Limiter la taille des tableaux
    const maxLength = Math.min(input.length, 1000);
    const result = [];
    for (let i = 0; i < maxLength; i++) {
      result.push(sanitizeRecursive(input[i], depth - 1));
    }
    return result;
  }

  // Objets
  const result = {};
  const keys = Object.keys(input);
  // Limiter le nombre de clés
  const maxKeys = Math.min(keys.length, 500);

  for (let i = 0; i < maxKeys; i++) {
    const key = keys[i];

    // Protéger contre le prototype pollution
    if (PROTECTED_KEYS.has(key)) {
      continue;
    }

    // Limiter la longueur des clés
    if (typeof key === 'string' && key.length > 256) {
      continue;
    }

    result[key] = sanitizeRecursive(input[key], depth - 1);
  }

  return result;
}

/**
 * Middleware Express : assainit req.body, req.query, req.params.
 */
export function sanitizeInput(req, _res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      const sanitized = sanitizeRecursive(req.body);

      // Vérifier les patterns d'injection
      const bodyStr = JSON.stringify(sanitized);
      if (hasInjectionPattern(bodyStr)) {
        logger.warn('Pattern d\'injection détecté dans le body', {
          action: 'injection_detected',
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        return _res.status(400).json({
          error: 'Requête invalide',
          message: 'La requête contient des caractères non autorisés.',
        });
      }

      req.body = sanitized;
    }

    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeRecursive(req.query);
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeRecursive(req.params);
    }
  } catch (err) {
    logger.error('Erreur assainissement des entrées', {
      action: 'sanitize_error',
      error: err.message,
      path: req.path,
    });
  }

  next();
}

export default { sanitizeInput };
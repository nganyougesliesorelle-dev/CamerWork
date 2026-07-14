/**
 * contentTypeGuard.js — Validation du Content-Type des requêtes entrantes.
 *
 * Protège contre :
 *   - Content-Type spoofing (ex: JSON envoyé comme multipart pour bypasser les validations)
 *   - MIME type mismatch sur les uploads
 *   - Content-Type manquant sur les requêtes mutantes
 *
 * Usage :
 *   import { requireContentType, validateUploadMime } from './middleware/contentTypeGuard.js';
 *
 *   // Exiger un Content-Type spécifique
 *   app.post('/api/data', requireContentType('application/json'), handler);
 *
 *   // Valider le MIME type d'un upload
 *   app.post('/api/files/upload', ...upload.single('file'), validateUploadMime, handler);
 */

import { logger } from './auditLogger.js';

// Types MIME autorisés par endpoint
const ALLOWED_UPLOAD_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * Middleware : exige un Content-Type spécifique.
 *
 * @param  {...string} allowedTypes — Types MIME autorisés
 */
export function requireContentType(...allowedTypes) {
  return (req, res, next) => {
    // GET et HEAD n'ont pas de body → pas de Content-Type requis
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'] || '';

    // Normaliser (retirer les paramètres comme charset=utf-8)
    const baseType = contentType.split(';')[0].trim().toLowerCase();

    const isAllowed = allowedTypes.some(allowed => {
      const allowedBase = allowed.split(';')[0].trim().toLowerCase();
      return baseType === allowedBase;
    });

    if (!isAllowed) {
      logger.warn('Content-Type non autorisé', {
        action: 'invalid_content_type',
        method: req.method,
        path: req.path,
        received: contentType || '(aucun)',
        expected: allowedTypes.join(', '),
        ip: req.ip,
      });

      return res.status(415).json({
        error: 'Type de contenu non supporté',
        message: `Content-Type attendu : ${allowedTypes.join(' ou ')}. Reçu : ${contentType || 'aucun'}.`,
      });
    }

    next();
  };
}

/**
 * Middleware : valide le MIME type d'un fichier uploadé.
 *
 * À placer APRÈS multer.
 * Vérifie que le MIME déclaré par le navigateur correspond à un type autorisé.
 * Ne remplace PAS la validation Magic Number (qui vérifie le contenu réel).
 */
export function validateUploadMime(req, res, next) {
  const file = req.file;

  if (!file) {
    return next(); // Pas de fichier, on continue
  }

  const mimeType = file.mimetype || '';

  if (!ALLOWED_UPLOAD_MIMES.has(mimeType)) {
    // Supprimer le fichier rejeté (synchrone via require, cohérent avec server.js)
    try {
      require('node:fs').unlinkSync(file.path);
    } catch { /* ignore */ }

    logger.warn('MIME type de fichier rejeté', {
      action: 'mime_type_rejected',
      fileName: file.originalname,
      mimeType,
      expected: [...ALLOWED_UPLOAD_MIMES],
      ip: req.ip,
      userId: req.user?.uid,
    });

    return res.status(400).json({
      error: 'Type de fichier non autorisé',
      message: `Format "${mimeType}" non accepté. Formats autorisés : PDF, JPEG, PNG, WebP, GIF.`,
    });
  }

  next();
}

export default { requireContentType, validateUploadMime };
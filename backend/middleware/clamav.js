/**
 * clamav.js — Middleware de scan antivirus ClamAV (implémentation réelle).
 *
 * Utilise le client ClamAV réel (socket TCP clamd + fallback clamscan CLI).
 * En cas d'indisponibilité de ClamAV, le middleware refuse le fichier
 * par principe de sécurité (fail-closed).
 *
 * Configuration via .env :
 *   CLAMAV_HOST, CLAMAV_PORT, CLAMAV_TIMEOUT
 *
 * Usage :
 *   import { clamavMiddleware } from './middleware/clamav.js';
 *   router.post('/upload', upload.single('file'), clamavMiddleware, handler);
 */

import { logger } from './auditLogger.js';
import { scanFile, scanBuffer, isClamavAvailable } from '../services/clamavClient.js';
import fs from 'node:fs/promises';

// Cache de disponibilité (évite de tester à chaque requête)
let availabilityChecked = false;
let clamavAvailable = false;

async function checkAvailability() {
  if (availabilityChecked) return clamavAvailable;
  clamavAvailable = await isClamavAvailable();
  availabilityChecked = true;
  logger.info(`ClamAV ${clamavAvailable ? 'disponible' : 'indisponible'} — mode ${clamavAvailable ? 'réel' : 'rejet-sécurisé'}`, {
    action: 'clamav_init',
    available: clamavAvailable,
  });
  return clamavAvailable;
}

/**
 * Middleware Express pour scanner les fichiers uploadés.
 * En cas de virus détecté ou ClamAV indisponible :
 *   - Supprime le fichier temporaire
 *   - Retourne 400/500
 *   - Journalise l'incident
 */
export function clamavMiddleware(req, res, next) {
  const file = req.file;

  if (!file) {
    return next();
  }

  (async () => {
    const available = await checkAvailability();

    if (!available) {
      // ClamAV non disponible = refus sécurisé
      await fs.unlink(file.path).catch(() => {});
      logger.log('audit', 'ClamAV indisponible — fichier rejeté', {
        action: 'clamav_unavailable_reject',
        fileName: file.originalname,
        ip: req.ip,
      });
      return res.status(503).json({
        error: 'Service de scan indisponible',
        message: 'Le scan antivirus est momentanément indisponible. Veuillez réessayer plus tard.',
      });
    }

    try {
      const result = await scanFile(file.path);

      if (!result.clean) {
        await fs.unlink(file.path).catch(() => {});
        logger.log('audit', `🚨 FICHIER INFECTÉ DÉTECTÉ : ${result.message}`, {
          action: 'virus_detected',
          fileName: file.originalname,
          filePath: file.path,
          method: result.method,
          message: result.message,
          ip: req.ip,
          userId: req.user?.uid,
        });
        return res.status(400).json({
          error: 'Fichier rejeté',
          message: 'Le fichier a été rejeté par le scan de sécurité.',
        });
      }

      logger.debug('Scan fichier OK', {
        action: 'file_scan_clean',
        fileName: file.originalname,
        fileSize: file.size,
        method: result.method,
      });

      next();
    } catch (err) {
      await fs.unlink(file.path).catch(() => {});
      logger.error('Erreur scan antivirus', {
        action: 'scan_error',
        error: err.message,
        fileName: file.originalname,
      });
      return res.status(500).json({
        error: 'Erreur de sécurité',
        message: 'Impossible de vérifier le fichier.',
      });
    }
  })();
}

export default { clamavMiddleware };

/**
 * clamav.js — Middleware conceptuel de scan antivirus (ClamAV).
 *
 * Ce module offre UNIQUEMENT l'interface conceptuelle et la configuration.
 * Implémentation réelle nécessite :
 *   1. Un serveur ClamAV installé (clamd) accessible en TCP (port 3310)
 *   2. Le package npm `clamscan` ou `clamav.js` OU une connexion socket directe
 *
 * Installation ClamAV (Ubuntu/Debian) :
 *   sudo apt install clamav clamav-daemon
 *   sudo systemctl enable clamav-daemon
 *   sudo systemctl start clamav-daemon
 *
 * Pour activer en production, installer clamscan :
 *   npm install clamscan
 *
 * Puis décommenter l'implémentation réelle ci-dessous.
 *
 * Mode fallback : si ClamAV n'est pas disponible, le middleware laisse passer
 * en journalisant un avertissement (mode development-friendly).
 */

import { logger } from './auditLogger.js';
import path from 'node:path';
import fs from 'node:fs/promises';

// ─── CONCEPT : Interface ClamAV ────────────────────────────────────

/**
 * Scanne un fichier avec ClamAV.
 * IMPLÉMENTATION RÉELLE (décommenter après `npm install clamscan`) :
 *
 *   import NodeClam from 'clamscan';
 *   const clamscan = await new NodeClam().init({
 *     clamdscan: {
 *       host: process.env.CLAMAV_HOST || '127.0.0.1',
 *       port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
 *       timeout: 30000,
 *     },
 *   });
 *
 *   export async function scanFile(filePath) {
 *     const { isInfected, viruses } = await clamscan.scanFile(filePath);
 *     if (isInfected) {
 *       await fs.unlink(filePath); // Supprimer le fichier infecté
 *     }
 *     return { clean: !isInfected, viruses };
 *   }
 */

/**
 * Version simulée du scan (fallback quand ClamAV n'est pas installé).
 * En production, remplacer par l'implémentation réelle ci-dessus.
 *
 * @param {string} filePath — Chemin du fichier temporaire à scanner
 * @returns {Promise<{ clean: boolean, viruses: string[], reason?: string }>}
 */
async function scanFileFallback(filePath) {
  logger.warn('ClamAV non installé — scan simulé', {
    action: 'clamav_fallback',
    filePath: path.basename(filePath),
  });

  // En développement, on fait juste une vérification basique de taille
  try {
    const stat = await fs.stat(filePath);
    if (stat.size === 0) {
      return { clean: false, viruses: ['Fichier vide suspect'], reason: 'empty_file' };
    }
    if (stat.size > 50 * 1024 * 1024) {
      return { clean: false, viruses: ['Fichier trop volumineux (>50MB)'], reason: 'too_large' };
    }
  } catch {
    return { clean: false, viruses: ['Fichier inaccessible'], reason: 'unreadable' };
  }

  return { clean: true, viruses: [] };
}

// Export unifié : utiliser scanFileFallback tant que ClamAV n'est pas branché
export const scanFile = scanFileFallback;

// ─── Middleware Express ─────────────────────────────────────────────

/**
 * Middleware Express pour scanner les fichiers uploadés via multer.
 * Usage :
 *   import multer from 'multer';
 *   import { clamavMiddleware } from './middleware/clamav.js';
 *
 *   const upload = multer({ dest: 'uploads/' });
 *   router.post('/upload', upload.single('file'), clamavMiddleware, handler);
 *
 * En cas de virus détecté :
 *   - Supprime le fichier temporaire
 *   - Retourne 400 avec le nom du virus
 *   - Journalise l'incident dans l'audit log
 */
export function clamavMiddleware(req, res, next) {
  const file = req.file;

  if (!file) {
    return next(); // Pas de fichier, on continue
  }

  scanFile(file.path)
    .then((result) => {
      if (!result.clean) {
        // Supprimer le fichier infecté
        fs.unlink(file.path).catch(() => {});

        logger.log('audit', `🚨 FICHIER INFECTÉ DÉTECTÉ : ${result.viruses.join(', ')}`, {
          action: 'virus_detected',
          fileName: file.originalname,
          filePath: file.path,
          viruses: result.viruses,
          ip: req.ip,
          userId: req.user?.uid,
        });

        return res.status(400).json({
          error: 'Fichier rejeté',
          message: 'Le fichier a été rejeté par le scan de sécurité. Veuillez contacter le support.',
        });
      }

      logger.debug('Scan fichier OK', {
        action: 'file_scan_clean',
        fileName: file.originalname,
        fileSize: file.size,
      });

      next();
    })
    .catch((err) => {
      logger.error('Erreur scan antivirus', {
        action: 'scan_error',
        error: err.message,
        fileName: file.originalname,
      });

      // En cas d'erreur de scan, refuser par sécurité
      fs.unlink(file.path).catch(() => {});
      return res.status(500).json({
        error: 'Erreur de sécurité',
        message: 'Impossible de vérifier le fichier. Veuillez réessayer.',
      });
    });
}

export default { scanFile, clamavMiddleware };

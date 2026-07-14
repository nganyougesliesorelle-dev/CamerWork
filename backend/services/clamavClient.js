/**
 * clamavClient.js — Client ClamAV pour scan antivirus réel.
 *
 * Deux modes de fonctionnement :
 *   1. Socket TCP vers clamd (recommandé en production) — rapide, temps réel
 *   2. CLI clamscan (fallback) — plus lent, processus séparé
 *
 * Configuration via .env :
 *   CLAMAV_HOST=127.0.0.1
 *   CLAMAV_PORT=3310
 *   CLAMAV_TIMEOUT=30000
 *
 * Usage :
 *   import { scanFile, scanBuffer, isClamavAvailable } from './services/clamavClient.js';
 *   const result = await scanBuffer(fileBuffer);
 */

import net from 'node:net';
import { spawn } from 'node:child_process';
import { logger } from '../middleware/auditLogger.js';

// ─── Configuration ───────────────────────────────────────────────────
const CLAMAV_HOST = process.env.CLAMAV_HOST || '127.0.0.1';
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310', 10);
const CLAMAV_TIMEOUT = parseInt(process.env.CLAMAV_TIMEOUT || '30000', 10);

// ─── Mode 1 : Socket TCP vers clamd ──────────────────────────────────

/**
 * Envoie une commande INSTREAM à clamd via socket TCP.
 * Protocole ClamAV : on envoie la longueur du chunk (4 octets network byte order),
 * puis le chunk lui-même, puis un chunk de longueur 0 pour signaler la fin.
 *
 * @param {Buffer} buffer — Contenu du fichier à scanner
 * @returns {Promise<{clean:boolean, message:string, error?:string}>}
 */
function scanViaSocket(buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Timeout de connexion ClamAV'));
    }, CLAMAV_TIMEOUT);

    socket.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
      // Envoyer la commande INSTREAM
      const chunkSize = Buffer.alloc(4);
      chunkSize.writeUInt32BE(buffer.length, 0);
      socket.write(chunkSize);
      socket.write(buffer);

      // Chunk terminal (taille 0)
      const zeroChunk = Buffer.alloc(4);
      zeroChunk.writeUInt32BE(0, 0);
      socket.write(zeroChunk);
    });

    socket.on('data', (data) => {
      response += data.toString();
    });

    socket.on('end', () => {
      clearTimeout(timeout);
      const trimmed = response.trim();

      if (trimmed.endsWith('OK')) {
        resolve({ clean: true, message: 'Fichier sain — aucun virus détecté.' });
      } else if (trimmed.includes('FOUND')) {
        const virusName = trimmed.replace('stream:', '').replace('FOUND', '').trim();
        resolve({ clean: false, message: `Virus détecté : ${virusName}` });
      } else if (trimmed.includes('ERROR')) {
        resolve({ clean: false, message: `Erreur ClamAV : ${trimmed}`, error: trimmed });
      } else {
        resolve({ clean: false, message: `Réponse inattendue : ${trimmed}`, error: trimmed });
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ─── Mode 2 : CLI clamscan (fallback) ────────────────────────────────

/**
 * Utilise clamscan en ligne de commande (processus séparé).
 * Écrit le buffer dans un fichier temporaire, lance clamscan, supprime le fichier.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{clean:boolean, message:string, error?:string}>}
 */
async function scanViaCli(buffer) {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');

  const tmpDir = await mkdtemp(join(tmpdir(), 'clamav-'));
  const tmpFile = join(tmpDir, 'scan-target');
  await writeFile(tmpFile, buffer);

  return new Promise((resolve) => {
    const clamscan = spawn('clamscan', ['--no-summary', '--stdout', tmpFile], {
      timeout: CLAMAV_TIMEOUT,
    });

    let stdout = '';
    let stderr = '';

    clamscan.stdout.on('data', (d) => { stdout += d.toString(); });
    clamscan.stderr.on('data', (d) => { stderr += d.toString(); });

    clamscan.on('close', async (code) => {
      // Nettoyer le fichier temporaire
      try { await rm(tmpDir, { recursive: true, force: true }); } catch {}

      if (code === 0) {
        resolve({ clean: true, message: 'Fichier sain — aucun virus détecté.' });
      } else if (code === 1) {
        const virusName = stdout.replace(tmpFile + ':', '').replace('FOUND', '').trim();
        resolve({ clean: false, message: `Virus détecté : ${virusName}` });
      } else {
        resolve({
          clean: false,
          message: `Erreur clamscan (code ${code})`,
          error: stderr || stdout || 'Erreur inconnue',
        });
      }
    });

    clamscan.on('error', async (err) => {
      try { await rm(tmpDir, { recursive: true, force: true }); } catch {}
      resolve({ clean: false, message: 'ClamAV non disponible', error: err.message });
    });
  });
}

// ─── API Publique ────────────────────────────────────────────────────

/**
 * Vérifie si ClamAV est disponible (socket TCP ou CLI).
 * @returns {Promise<boolean>}
 */
export async function isClamavAvailable() {
  try {
    // Test rapide : tenter une connexion TCP
    const socket = new net.Socket();
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('timeout'));
      }, 2000);
      socket.connect(CLAMAV_PORT, CLAMAV_HOST, () => {
        clearTimeout(timeout);
        socket.write('PING\n');
      });
      socket.on('data', (data) => {
        if (data.toString().trim() === 'PONG') {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        }
      });
      socket.on('error', () => {
        clearTimeout(timeout);
        reject(new Error('connection refused'));
      });
    });
    return true;
  } catch {
    // Fallback : vérifier si clamscan est installé
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn('clamscan', ['--version'], { timeout: 3000 });
        proc.on('close', (code) => code === 0 ? resolve() : reject());
        proc.on('error', reject);
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Scanne un buffer (contenu de fichier) avec ClamAV.
 * Essaie d'abord le socket TCP (clamd), puis fallback vers clamscan CLI.
 *
 * @param {Buffer} buffer — Contenu du fichier à scanner
 * @returns {Promise<{clean:boolean, message:string, error?:string, method:string}>}
 */
export async function scanBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    return { clean: true, message: 'Buffer vide — pas de scan.', method: 'none' };
  }

  // Essayer le socket TCP d'abord
  try {
    const result = await scanViaSocket(buffer);
    return { ...result, method: 'socket' };
  } catch (socketErr) {
    logger.warn('ClamAV socket indisponible, tentative CLI', {
      action: 'clamav_socket_failed',
      error: socketErr.message,
    });
  }

  // Fallback CLI
  try {
    const result = await scanViaCli(buffer);
    return { ...result, method: 'cli' };
  } catch (cliErr) {
    logger.error('ClamAV complètement indisponible', {
      action: 'clamav_unavailable',
      error: cliErr.message,
    });
    return {
      clean: false,
      message: 'Scan antivirus indisponible — fichier rejeté par sécurité.',
      error: 'ClamAV non disponible (ni socket ni CLI)',
      method: 'none',
    };
  }
}

/**
 * Scanne un fichier sur disque.
 * @param {string} filePath — Chemin absolu vers le fichier
 * @returns {Promise<{clean:boolean, message:string, error?:string, method:string}>}
 */
export async function scanFile(filePath) {
  const fs = await import('node:fs/promises');
  try {
    const buffer = await fs.readFile(filePath);
    return scanBuffer(buffer);
  } catch (err) {
    return {
      clean: false,
      message: 'Impossible de lire le fichier pour le scan.',
      error: err.message,
      method: 'none',
    };
  }
}

export default { scanBuffer, scanFile, isClamavAvailable };

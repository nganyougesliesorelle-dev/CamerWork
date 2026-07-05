/**
 * magicNumber.js — Validation de type de fichier par Magic Number (Magic Bytes).
 *
 * Vérifie les premiers octets d'un fichier pour confirmer son type réel,
 * indépendamment de l'extension ou du MIME type déclaré.
 *
 * Approche : lit les 4 premiers octets (suffisants pour PDF, images, docs).
 * Pour une couverture complète utiliser file-type (côté serveur) ou appeler
 * ce validateur avant tout upload.
 */

// Magic numbers pour les formats acceptés
const MAGIC_SIGNATURES = {
  // PDF : %PDF
  pdf: {
    signatures: [[0x25, 0x50, 0x44, 0x46]],
    mime: 'application/pdf',
    label: 'PDF',
  },
  // JPEG : FF D8 FF
  jpeg: {
    signatures: [[0xff, 0xd8, 0xff]],
    mime: 'image/jpeg',
    label: 'JPEG',
  },
  // PNG : 89 50 4E 47
  png: {
    signatures: [[0x89, 0x50, 0x4e, 0x47]],
    mime: 'image/png',
    label: 'PNG',
  },
  // GIF : GIF89a / GIF87a
  gif: {
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    ],
    mime: 'image/gif',
    label: 'GIF',
  },
  // WebP : RIFF....WEBP
  webp: {
    signatures: [[0x52, 0x49, 0x46, 0x46]],
    mime: 'image/webp',
    label: 'WebP',
    // Vérification supplémentaire : octets 8-11 = WEBP
    extraCheck: (bytes) =>
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50,
  },
};

const ALLOWED_FORMATS = Object.keys(MAGIC_SIGNATURES);

/**
 * Vérifie si un buffer d'octets correspond à une signature magique.
 * @param {Uint8Array} bytes — Premiers octets du fichier
 * @param {number[][]} signatures — Liste de signatures possibles
 * @returns {boolean}
 */
function matchesSignature(bytes, signatures) {
  return signatures.some((sig) => {
    if (bytes.length < sig.length) return false;
    return sig.every((b, i) => bytes[i] === b);
  });
}

/**
 * Détecte le format réel d'un fichier à partir de ses Magic Bytes.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file — Le fichier à analyser
 * @returns {Promise<{ detected: string|null, mime: string|null, label: string|null }>}
 */
export async function detectFileType(file) {
  let bytes;

  if (file instanceof Uint8Array) {
    bytes = file;
  } else if (file instanceof ArrayBuffer) {
    bytes = new Uint8Array(file);
  } else if (file instanceof Blob || file instanceof File) {
    const buffer = await file.slice(0, 12).arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else {
    return { detected: null, mime: null, label: null };
  }

  if (bytes.length < 4) {
    return { detected: null, mime: null, label: null };
  }

  for (const [format, config] of Object.entries(MAGIC_SIGNATURES)) {
    if (matchesSignature(bytes, config.signatures)) {
      if (config.extraCheck && !config.extraCheck(bytes)) continue;
      return { detected: format, mime: config.mime, label: config.label };
    }
  }

  return { detected: null, mime: null, label: null };
}

/**
 * Valide qu'un fichier est d'un type autorisé via Magic Number.
 * Lance une erreur descriptive si le type est invalide.
 *
 * @param {File} file — Fichier à valider
 * @param {string[]} allowed — Liste des formats autorisés (ex: ['pdf', 'jpeg', 'png'])
 * @returns {Promise<{ valid: true, format: string, label: string }>}
 * @throws {Error} Si le type n'est pas autorisé
 */
export async function validateFileMagicNumber(file, allowed = ALLOWED_FORMATS) {
  const result = await detectFileType(file);

  if (!result.detected) {
    throw new Error(
      `Type de fichier non reconnu. Les formats acceptés sont : ${allowed.join(', ').toUpperCase()}. ` +
      `Le fichier "${file.name}" ne correspond à aucune signature valide.`
    );
  }

  if (!allowed.includes(result.detected)) {
    throw new Error(
      `Format "${result.label}" non autorisé pour "${file.name}". ` +
      `Formats acceptés : ${allowed.join(', ').toUpperCase()}.`
    );
  }

  return { valid: true, format: result.detected, label: result.label };
}

/**
 * Vérification synchrone sur un buffer déjà chargé (usage serveur).
 * @param {Buffer} buffer — Buffer Node.js contenant le fichier
 * @param {string[]} allowed — Formats autorisés
 * @returns {{ valid: boolean, format: string|null, error: string|null }}
 */
export function validateBufferMagicNumber(buffer, allowed = ALLOWED_FORMATS) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return { valid: false, format: null, error: 'Buffer invalide ou trop petit' };
  }

  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(buffer.length, 12));

  for (const [format, config] of Object.entries(MAGIC_SIGNATURES)) {
    if (matchesSignature(bytes, config.signatures)) {
      if (config.extraCheck && !config.extraCheck(bytes)) continue;
      if (!allowed.includes(format)) {
        return { valid: false, format, error: `Format ${config.label} non autorisé` };
      }
      return { valid: true, format, error: null };
    }
  }

  return { valid: false, format: null, error: 'Type de fichier non reconnu par Magic Number' };
}

export { ALLOWED_FORMATS, MAGIC_SIGNATURES };
export default validateFileMagicNumber;

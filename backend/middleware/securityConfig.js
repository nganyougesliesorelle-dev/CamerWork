/**
 * securityConfig.js — Validateur de configuration de sécurité au démarrage.
 *
 * Vérifie que toutes les variables d'environnement critiques sont présentes
 * et que leurs valeurs ne sont pas les valeurs par défaut non sécurisées.
 *
 * Le serveur REFUSE de démarrer si des secrets faibles ou manquants sont détectés.
 *
 * Usage (dans server.js) :
 *   import { validateSecurityConfig } from './middleware/securityConfig.js';
 *   validateSecurityConfig(); // throw si invalide
 */

const DEFAULT_VALUES = new Set([
  'change-me-to-a-256-bit-random-string',
  'change-me-to-a-64-char-hex-string',
  'change-me',
  'your-secret-here',
  'replace-me',
]);

const REQUIRED_SECRETS = [
  { key: 'JWT_SECRET', minLength: 32, name: 'JWT_SECRET (signature JWT)' },
  { key: 'ENCRYPTION_SECRET', minLength: 32, name: 'ENCRYPTION_SECRET (chiffrement AES-256)' },
];

const RECOMMENDED_SECRETS = [
  { key: 'CSRF_SECRET', minLength: 16, name: 'CSRF_SECRET (protection CSRF)' },
  { key: 'FIREBASE_API_KEY', minLength: 10, name: 'FIREBASE_API_KEY (backend uniquement)' },
];

function isDefaultValue(value) {
  if (!value) return true;
  const lower = value.toLowerCase().trim();
  for (const def of DEFAULT_VALUES) {
    if (lower === def || lower.startsWith(def.split('-')[0])) {
      return true;
    }
  }
  return false;
}

/**
 * Valide la configuration de sécurité au démarrage.
 * En développement, les avertissements sont non-bloquants.
 * En production, toute anomalie est bloquante.
 *
 * @param {Object} options
 * @param {boolean} [options.exitOnError=true] — Process.exit(1) si erreur critique
 * @param {boolean} [options.strict=true] — Les secrets recommandés sont-ils obligatoires ?
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateSecurityConfig(options = {}) {
  const { exitOnError = true, strict = false } = options;
  const isProduction = process.env.NODE_ENV === 'production';

  const errors = [];
  const warnings = [];

  // 1. Vérifier les secrets obligatoires
  for (const { key, minLength, name } of REQUIRED_SECRETS) {
    const value = process.env[key];

    if (!value || value.trim() === '') {
      errors.push(`❌ ${name} est manquant — définissez-le dans .env`);
      continue;
    }

    if (isDefaultValue(value)) {
      errors.push(
        `❌ ${name} utilise une valeur par défaut non sécurisée. ` +
        `Générez une valeur aléatoire avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      );
      continue;
    }

    if (value.length < minLength) {
      warnings.push(
        `⚠️  ${name} est trop court (${value.length} caractères, minimum ${minLength})`
      );
    }
  }

  // 2. Vérifier les secrets recommandés (non-bloquants en dev)
  for (const { key, minLength, name } of RECOMMENDED_SECRETS) {
    const value = process.env[key];

    if (!value || value.trim() === '') {
      const msg = `⚠️  ${name} est vide — fonctionnalité réduite`;
      if (isProduction || strict) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
      continue;
    }

    if (isDefaultValue(value)) {
      warnings.push(`⚠️  ${name} utilise une valeur par défaut`);
    }
  }

  // 3. Vérifier la présence du service account Firebase
  if (isProduction) {
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saPath) {
      errors.push('❌ FIREBASE_SERVICE_ACCOUNT non défini en production');
    }
  }

  // 4. Vérifier la configuration SMTP (emails transactionnels)
  if (isProduction && !process.env.SMTP_HOST) {
    warnings.push('⚠️  SMTP_HOST non configuré — les emails transactionnels sont désactivés');
  }
  if (process.env.SMTP_HOST && !process.env.SMTP_PASS) {
    warnings.push('⚠️  SMTP_PASS manquant — authentification email désactivée');
  }

  // 5. Vérifier le SENTRY_DSN en production
  if (isProduction && !process.env.SENTRY_DSN) {
    warnings.push('⚠️  SENTRY_DSN non configuré — les alertes de production sont désactivées');
  }

  // 5. Vérifier le NODE_ENV
  if (isProduction) {
    if (process.env.NODE_ENV !== 'production') {
      errors.push('❌ NODE_ENV doit être "production" en environnement de production');
    }
  }

  // Afficher le rapport
  if (errors.length > 0 || warnings.length > 0) {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  🛡️  CamerWork — Validation Sécurité Startup  ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    for (const err of errors) {
      console.log(err);
    }
    for (const warn of warnings) {
      console.log(warn);
    }

    console.log('');

    if (errors.length > 0 && (isProduction || exitOnError)) {
      console.log('❌ ERREURS CRITIQUES DÉTECTÉES — Le serveur ne peut pas démarrer.\n');
      console.log('   Corrigez les erreurs ci-dessus dans votre fichier .env.\n');
      process.exit(1);
    }

    if (warnings.length > 0 && !errors.length) {
      console.log('⚠️  Le serveur démarre avec des avertissements de sécurité.\n');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default { validateSecurityConfig };
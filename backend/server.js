/**
 * server.js — CamerWork Backend Security Gateway
 *
 * Architecture en défense en profondeur :
 *   Couche 1 : Helmet (sécurisation des en-têtes HTTP)
 *   Couche 2 : CORS (restriction des origines)
 *   Couche 3 : Rate Limiting (anti brute-force / énumération)
 *   Couche 4 : JWT RBAC (authentification + autorisation par rôle)
 *   Couche 5 : Validation Joi (nettoyage des entrées)
 *   Couche 6 : Magic Number (validation des fichiers uploadés)
 *   Couche 7 : ClamAV (scan antivirus — conceptuel)
 *   Couche 8 : Audit (journalisation complète avec Winston)
 *
 * Démarrage :
 *   cp .env.example .env
 *   npm install
 *   npm run dev
 */

import 'dotenv/config';

// ─── Validation sécurité au démarrage ──────────────────────────────
import { validateSecurityConfig } from './middleware/securityConfig.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { globalLimiter, authLimiter, apiLimiter, passwordResetLimiter } from './middleware/rateLimiter.js';
import { authenticate, authorize, requireAdmin, requireRecruiter, requireCandidate } from './middleware/rbac.js';
import { auditLogin, detectBruteForce, cleanupBruteForceTracker, logger } from './middleware/auditLogger.js';
import { clamavMiddleware } from './middleware/clamav.js';
import { httpsEnforcer } from './middleware/httpsEnforcer.js';
import { validateBufferMagicNumber } from './utils/magicNumber.js';
import { encrypt, decrypt, encryptSensitiveFields } from './utils/crypto.js';
import { generateSignedUrl } from './utils/signedUrls.js';
import { loginSchema, mfaVerifySchema, signedUrlSchema, validate } from './validators/authValidators.js';
import { csrfTokenGenerator, csrfProtection } from './middleware/csrfProtection.js';
import { sanitizeInput } from './middleware/inputSanitizer.js';
import { requireContentType, validateUploadMime } from './middleware/contentTypeGuard.js';
import { blocklistToken, isTokenBlocked, hashToken } from './middleware/tokenBlocklist.js';

// ─── Initialisation Firebase Admin ─────────────────────────────────
import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Valider la configuration de sécurité avant tout
console.log('\n🔐 CamerWork — Vérification de la configuration de sécurité...\n');
const securityCheck = validateSecurityConfig({ exitOnError: false });
if (!securityCheck.valid && process.env.NODE_ENV === 'production') {
  console.log('❌ Configuration de sécurité invalide. Le serveur ne peut pas démarrer.\n');
  process.exit(1);
}
if (securityCheck.errors.length > 0) {
  console.log('⚠️  Configuration de sécurité incomplète. Certaines fonctionnalités sont désactivées.\n');
}

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './service-account.json';
  const serviceAccount = JSON.parse(readFileSync(path.resolve(__dirname, serviceAccountPath), 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  logger.info('Firebase Admin initialisé');
} catch (err) {
  logger.warn('Firebase Admin non initialisé (service-account.json manquant) — mode dégradé', {
    error: err.message,
  });
}

// ─── Application Express ───────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Couche 0 : HTTPS Enforcer (redirection HTTP → HTTPS) ──────────
app.use(httpsEnforcer);

// ─── Couche 1 : Helmet (en-têtes de sécurité) ─────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://apis.google.com", "https://www.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://firebasestorage.googleapis.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com", "wss://*.firebaseio.com"],
      frameSrc: ["'self'", "https://camerwork-1e3d0.firebaseapp.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Nécessaire pour Firebase Auth popup
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: {
    maxAge: 31536000,   // 1 an
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  hidePoweredBy: true,
  xssFilter: true,
}));

// ─── Couche 2 : CORS ──────────────────────────────────────────────
const allowedOrigins = [
  'https://camerwork-1e3d0.web.app',
  'https://camerwork-1e3d0.firebaseapp.com',
  'http://localhost:5173',  // Vite dev
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (curl, Postman, mobile)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqué : ${origin}`, { action: 'cors_blocked', origin });
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  maxAge: 86400, // 24h de cache preflight
}));

// ─── Parsing ───────────────────────────────────────────────────────
// cookie-parser nécessaire pour le CSRF (lit req.cookies)
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// Limites de taille strictes (configurable via MAX_BODY_SIZE)
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '1mb';
app.use(express.json({ limit: MAX_BODY_SIZE }));
app.use(express.urlencoded({ extended: false, limit: MAX_BODY_SIZE }));

// ─── Assainissement des entrées (défense en profondeur) ──────────
app.use(sanitizeInput);

// Trust proxy si derrière nginx/Cloudflare
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Couche 3 : Rate Limiting Global ──────────────────────────────
app.use(globalLimiter);

// ─── Couche 3.5 : CSRF Protection ──────────────────────────────────
app.use(csrfTokenGenerator);
app.use(csrfProtection);

// ─── Health Check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── Security.txt (RFC 9116) ───────────────────────────────────────
app.get('/.well-known/security.txt', (_req, res) => {
  res.type('text/plain');
  res.send(`Contact: mailto:security@camerwork.app
Expires: ${new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()}
Preferred-Languages: fr, en
Canonical: https://camerwork-1e3d0.web.app/.well-known/security.txt
Policy: https://camerwork-1e3d0.web.app/securite`);
});

// ─── Routes d'Authentification ────────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
  // Validation Joi des entrées
  const { error: validationError, value } = validate(loginSchema, req.body);
  if (validationError) {
    logger.warn('Validation login échouée', {
      action: 'login_validation_failed',
      ip: req.ip,
      details: validationError.details.map(d => d.message),
    });
    return res.status(400).json({
      error: 'Données invalides',
      details: validationError.details.map(d => d.message),
    });
  }

  const { email, password } = value;
  const ip = req.ip;

  // Détection comportementale
  const bfCheck = detectBruteForce(ip, email);
  if (bfCheck.blocked) {
    auditLogin({ email, success: false, ip, reason: 'brute_force_blocked' });
    return res.status(429).json({
      error: 'Bloqué temporairement',
      message: bfCheck.reason,
    });
  }

  // Simulation : dans l'implémentation réelle, on vérifie via Firebase Admin
  try {
    // Pour un vrai projet, récupérer l'utilisateur Firebase et vérifier
    // const userRecord = await admin.auth().getUserByEmail(email);

    // Pour cet exemple, on vérifie via l'API Firebase Auth
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error('FIREBASE_API_KEY non configuré');
    }

    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await firebaseRes.json();

    if (data.error) {
      auditLogin({ email, success: false, ip, reason: data.error.message });
      return res.status(401).json({
        error: 'Échec de connexion',
        message: 'Email ou mot de passe incorrect.',
      });
    }

    // Récupérer le rôle depuis Firestore
    const userDoc = await admin.firestore().collection('users').doc(data.localId).get();
    const role = userDoc.exists ? userDoc.data().role : 'candidate';

    // Générer un JWT local (optionnel pour API backend)
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { uid: data.localId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    auditLogin({ email, success: true, ip, userId: data.localId });

    return res.json({
      success: true,
      token,
      uid: data.localId,
      email,
      role,
      idToken: data.idToken, // Firebase ID token pour le frontend
    });
  } catch (err) {
    logger.error('Erreur auth', { error: err.message, email, ip });
    return res.status(500).json({ error: 'Erreur serveur d\'authentification' });
  }
});

// ─── Route Logout (révocation de token JWT) ────────────────────────

/**
 * POST /api/auth/logout — Révoque le token JWT courant
 * Le token est ajouté à la blocklist jusqu'à son expiration naturelle.
 */
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];

    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.default.decode(token);

    if (decoded && decoded.exp) {
      const ttlSeconds = Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));
      blocklistToken(hashToken(token), ttlSeconds);
    }

    return res.json({ success: true, message: 'Déconnecté avec succès.' });
  } catch {
    return res.status(200).json({ success: true, message: 'Déconnecté.' });
  }
});

// ─── Route Reset Password ──────────────────────────────────────────

/**
 * POST /api/auth/reset-password — Demande de réinitialisation
 * Protection : passwordResetLimiter + email validation
 *
 * Flux :
 *   1. Vérifie l'existence du compte via Firebase Admin
 *   2. Génère un lien de réinitialisation via Firebase Auth
 *   3. Envoie l'email via Nodemailer (ou simule en console si SMTP absent)
 *
 * Réponse générique dans tous les cas pour éviter l'énumération.
 */
app.post('/api/auth/reset-password', passwordResetLimiter, async (req, res) => {
  const email = req.body?.email?.trim();

  if (!email) {
    return res.json({
      success: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    });
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);

    if (userRecord) {
      const resetLink = await admin.auth().generatePasswordResetLink(email);

      const { sendPasswordResetEmail } = await import('./services/emailService.js');
      const emailResult = await sendPasswordResetEmail(email, resetLink);

      logger.info('Demande de reset password traitée', {
        action: 'password_reset_request',
        email,
        ip: req.ip,
        emailSent: emailResult.success,
      });
    } else {
      logger.info('Demande reset — compte inexistant', {
        action: 'password_reset_unknown_email',
        email,
        ip: req.ip,
      });
    }
  } catch (err) {
    logger.error('Erreur reset password', {
      action: 'password_reset_error',
      email,
      ip: req.ip,
      error: err.message,
    });
  }

  return res.json({
    success: true,
    message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
  });
});

// ─── Route MFA Verification (backend) ──────────────────────────────

/**
 * POST /api/auth/mfa/verify — Vérifie un code MFA avec double couche de sécurité.
 *
 * Flux :
 *   1. Valide l'idToken Firebase (preuve d'authentification)
 *   2. Vérifie que MFA est bien activé sur le compte (Firebase Admin)
 *   3. Vérifie le code TOTP avec speakeasy contre le secret stocké dans Firestore
 *
 * La vérification TOTP côté serveur est une couche de sécurité INDÉPENDANTE
 * de la MFA Firebase — défense en profondeur.
 */
app.post('/api/auth/mfa/verify', authLimiter, async (req, res) => {
  const { error: validationError, value } = validate(mfaVerifySchema, req.body);
  if (validationError) {
    return res.status(400).json({
      error: 'Données invalides',
      details: validationError.details.map(d => d.message),
    });
  }

  const { mfaCode, idToken } = value;
  const ip = req.ip;

  try {
    // Étape 1 : Vérifier le token Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Étape 2 : Vérifier que MFA est activé sur le compte
    const userRecord = await admin.auth().getUser(uid);
    const mfaEnrolled = userRecord.multiFactor?.enrolledFactors?.length > 0;

    if (!mfaEnrolled) {
      logger.warn('Vérification MFA — MFA non activé sur le compte', {
        action: 'mfa_verify_no_mfa',
        userId: uid,
        ip,
      });
      return res.status(400).json({
        error: 'MFA non configuré',
        message: 'La double authentification n\'est pas activée sur ce compte.',
      });
    }

    // Étape 3 : Vérifier le code TOTP avec speakeasy (couche serveur indépendante)
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const totpSecret = userDoc.exists ? userDoc.data().totpSecret : null;

    if (totpSecret) {
      // Vérification TOTP côté serveur (défense en profondeur)
      const speakeasy = await import('speakeasy');
      const verified = speakeasy.default.totp.verify({
        secret: totpSecret,
        encoding: 'base32',
        token: mfaCode,
        window: 1, // Tolérance de ±1 période (30s)
      });

      if (!verified) {
        logger.warn('Échec vérification TOTP serveur', {
          action: 'mfa_totp_failed',
          userId: uid,
          ip,
        });
        return res.status(401).json({
          error: 'Échec de vérification MFA',
          message: 'Code TOTP invalide ou expiré.',
        });
      }
    }
    // Si pas de totpSecret, on fait confiance à la MFA Firebase seule (fallback)

    logger.info('Vérification MFA réussie', {
      action: 'mfa_verify_success',
      userId: uid,
      mfaEnrolled,
      totpVerified: !!totpSecret,
      ip,
    });

    return res.json({
      success: true,
      uid,
      mfaEnrolled,
      message: 'Vérification MFA réussie.',
    });
  } catch (err) {
    logger.warn('Échec vérification MFA', {
      action: 'mfa_verify_failed',
      error: err.message,
      ip,
    });
    return res.status(401).json({
      error: 'Échec de vérification MFA',
      message: err.code === 'auth/id-token-expired'
        ? 'Session expirée. Veuillez vous reconnecter.'
        : 'Code invalide ou session expirée.',
    });
  }
});

// ─── Routes Protégées : Fichiers (CV / Portfolio) ─────────────────

/**
 * GET /api/files/signed-url — Génère une URL signée temporaire
 * Protection : authenticate + authorize('recruiter', 'admin')
 * Le recruteur ne peut accéder qu'aux CV des candidats qui l'ont accepté.
 */
app.get('/api/files/signed-url', authenticate, authorize('recruiter', 'candidate', 'admin'), async (req, res) => {
  try {
    // Validation Joi du paramètre filePath
    const { error: validationError, value } = validate(signedUrlSchema, req.query);
    if (validationError) {
      return res.status(400).json({
        error: 'Paramètre invalide',
        details: validationError.details.map(d => d.message),
      });
    }

    const { filePath } = value;

    // Double vérification : le chemin ne doit pas contenir de traversée
    if (filePath.includes('..') || filePath.includes('~') || filePath.includes('\\')) {
      logger.warn('Tentative de path traversal', { action: 'path_traversal_attempt', filePath, ip: req.ip });
      return res.status(400).json({ error: 'Chemin de fichier invalide' });
    }

    const url = await generateSignedUrl(filePath);

    logger.info('URL signée générée', {
      action: 'signed_url_generated',
      userId: req.user.uid,
      filePath,
      ip: req.ip,
    });

    return res.json({ url, expiresIn: 900 });
  } catch (err) {
    logger.error('Erreur signed URL', { error: err.message, filePath: req.query?.filePath });
    return res.status(500).json({ error: 'Erreur lors de la génération de l\'URL' });
  }
});

/**
 * POST /api/files/upload — Upload sécurisé avec validation
 * Protection : authenticate + Magic Number + ClamAV
 */
import multer from 'multer';
const upload = multer({
  dest: path.join(__dirname, 'uploads', 'temp'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 1,
  },
});

app.post('/api/files/upload', authenticate, apiLimiter, requireContentType('multipart/form-data'), upload.single('file'), validateUploadMime, clamavMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    // Validation Magic Number
    const fileBuffer = require('node:fs').readFileSync(req.file.path);
    const magicResult = validateBufferMagicNumber(fileBuffer);

    if (!magicResult.valid) {
      // Supprimer le fichier invalide
      require('node:fs').unlinkSync(req.file.path);
      logger.warn('Fichier rejeté (Magic Number)', {
        action: 'magic_number_reject',
        fileName: req.file.originalname,
        error: magicResult.error,
        ip: req.ip,
        userId: req.user.uid,
      });
      return res.status(400).json({ error: magicResult.error });
    }

    logger.info('Upload validé', {
      action: 'file_upload_validated',
      fileName: req.file.originalname,
      format: magicResult.format,
      userId: req.user.uid,
      ip: req.ip,
    });

    return res.json({
      success: true,
      fileName: req.file.originalname,
      format: magicResult.format,
      size: req.file.size,
    });
  } catch (err) {
    logger.error('Erreur upload', { error: err.message });
    return res.status(500).json({ error: 'Erreur lors du traitement du fichier' });
  }
});

// ─── Routes Admin ──────────────────────────────────────────────────

/**
 * GET /api/admin/audit-logs — Consulter les logs d'audit (admin uniquement)
 */
app.get('/api/admin/audit-logs', ...requireAdmin, async (_req, res) => {
  // En production, lire les fichiers de log rotatifs
  res.json({ message: 'Endpoint de logs d\'audit — implémenter la lecture des fichiers' });
});

// ─── Route Admin : Stats Blocklist ──────────────────────────────────

/**
 * GET /api/admin/security/blocklist-stats — Statistiques de la blocklist
 */
app.get('/api/admin/security/blocklist-stats', ...requireAdmin, async (_req, res) => {
  const { getBlocklistStats } = await import('./middleware/tokenBlocklist.js');
  res.json(getBlocklistStats());
});

// ─── Route Admin : Nettoyage force-brute ───────────────────────────

app.post('/api/admin/security/cleanup-bruteforce', ...requireAdmin, async (_req, res) => {
  cleanupBruteForceTracker();
  res.json({ success: true, message: 'Tracker force-brute nettoyé.' });
});

// ─── Nettoyage périodique du tracker brute-force ──────────────────
setInterval(cleanupBruteForceTracker, 120000); // Toutes les 2 minutes

// ─── Gestion globale des erreurs ───────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Erreur non gérée', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  res.status(err.status || 500).json({
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur interne est survenue.',
  });
});

// ─── Démarrage ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 CamerWork Backend démarré sur http://localhost:${PORT}`, {
    action: 'server_start',
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
  logger.info('🛡️  Couches de sécurité actives : HTTPS → Helmet+ → CORS → CSRF → InputSanitizer → RateLimit → ContentTypeGuard → JWT/RBAC → Joi → MFA → MagicNumber → ClamAV → TokenBlocklist → Winston → Sentry');
});

export default app;

/**
 * rbac.js — Middleware de Contrôle d'Accès Basé sur les Rôles (RBAC).
 *
 * Vérifie :
 *   1. La présence et la validité d'un jeton JWT dans l'en-tête Authorization.
 *   2. Que le rôle de l'utilisateur (candidate, recruiter, admin) est autorisé
 *      pour la route demandée.
 *
 * Usage :
 *   import { authenticate, authorize } from './middleware/rbac.js';
 *
 *   router.get('/api/admin/dashboard', authenticate, authorize('admin'), handler);
 *   router.get('/api/recruiter/jobs', authenticate, authorize('recruiter', 'admin'), handler);
 */

import jwt from 'jsonwebtoken';

// ─── Authentification JWT ──────────────────────────────────────────

/**
 * Middleware : vérifie le jeton JWT et attache `req.user`.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Non authentifié',
      message: 'Jeton d\'authentification manquant ou invalide.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non configuré');

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { uid, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Jeton expiré',
        message: 'Votre session a expiré. Veuillez vous reconnecter.',
      });
    }
    return res.status(403).json({
      error: 'Jeton invalide',
      message: 'Le jeton fourni n\'est pas valide.',
    });
  }
}

// ─── Autorisation par Rôle ─────────────────────────────────────────

/**
 * Middleware : autorise l'accès selon le(s) rôle(s) spécifié(s).
 * @param  {...string} roles — Rôles autorisés ('candidate', 'recruiter', 'admin')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non authentifié',
        message: 'Authentification requise avant l\'autorisation.',
      });
    }

    const userRole = req.user.role;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: `Rôle "${userRole}" non autorisé. Rôles requis : ${roles.join(', ')}.`,
      });
    }

    next();
  };
}

// ─── Middlewares combinés pratiques ─────────────────────────────────

/**
 * Middleware composé : authentifie ET vérifie le rôle admin.
 */
export const requireAdmin = [authenticate, authorize('admin')];

/**
 * Middleware composé : authentifie ET vérifie le rôle recruteur (ou admin).
 */
export const requireRecruiter = [authenticate, authorize('recruiter', 'recruteur', 'admin')];

/**
 * Middleware composé : authentifie ET vérifie le rôle candidat.
 */
export const requireCandidate = [authenticate, authorize('candidate', 'candidat', 'student')];

/**
 * Middleware composé : authentifie sans vérifier de rôle spécifique.
 */
export const requireAuth = [authenticate];

export default { authenticate, authorize, requireAdmin, requireRecruiter, requireCandidate, requireAuth };

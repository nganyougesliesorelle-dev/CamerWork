/**
 * authValidators.js — Schémas de validation Joi pour le backend.
 *
 * Validation côté serveur de toutes les entrées utilisateur avant
 * traitement. Joi est plus strict que Yup et offre :
 *   - Messages d'erreur en français
 *   - Détection d'injection
 *   - Nettoyage des chaînes
 *   - Limites strictes
 *
 * Usage :
 *   import { validateLogin, validateRegister, validateMfaVerify } from './validators/authValidators.js';
 *
 *   const { error, value } = validateLogin(req.body);
 *   if (error) return res.status(400).json({ error: 'Validation échouée', details: error.details });
 */

import Joi from 'joi';

// ─── Patterns de détection d'injection ─────────────────────────────
const INJECTION_PATTERN = /[<>{}()$;`&#]/;
const SCRIPT_PATTERN = /<script|javascript:|on\w+\s*=/i;

// Extension Joi personnalisée : rejette les injections
const extendedJoi = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.noInjection': '{{#label}} contient des caractères non autorisés',
    'string.noScript': '{{#label}} contient un script interdit',
  },
  rules: {
    noInjection: {
      method() {
        return this.$_addRule({ name: 'noInjection' });
      },
      validate(value, helpers) {
        if (INJECTION_PATTERN.test(value) || SCRIPT_PATTERN.test(value)) {
          return helpers.error('string.noInjection');
        }
        return value;
      },
    },
  },
}));

// ─── Schémas ────────────────────────────────────────────────────────

/**
 * Schéma de connexion (backend).
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Format d\'email invalide',
      'string.max': 'Email trop long (max 255 caractères)',
      'any.required': 'L\'email est requis',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.min': 'Mot de passe trop court (min 8 caractères)',
      'string.max': 'Mot de passe trop long (max 128 caractères)',
      'any.required': 'Le mot de passe est requis',
    }),
});

/**
 * Schéma d'inscription (backend).
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Format d\'email invalide',
      'any.required': 'L\'email est requis',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'majuscule')
    .pattern(/[0-9]/, 'chiffre')
    .pattern(/[^A-Za-z0-9]/, 'caractère spécial')
    .required()
    .messages({
      'string.min': 'Minimum 8 caractères',
      'string.pattern.name': 'Le mot de passe doit contenir au moins une {{#name}}',
      'any.required': 'Le mot de passe est requis',
    }),
  role: Joi.string()
    .valid('candidate', 'candidat', 'student', 'recruiter', 'recruteur')
    .required()
    .messages({
      'any.only': 'Rôle invalide',
      'any.required': 'Le rôle est requis',
    }),
  fullName: extendedJoi.string()
    .min(2)
    .max(100)
    .noInjection()
    .required()
    .messages({
      'string.min': 'Nom trop court',
      'string.max': 'Nom trop long (max 100 caractères)',
      'any.required': 'Le nom complet est requis',
    }),
  phone: Joi.string()
    .pattern(/^[0-9+]{9,15}$/)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'Format de téléphone invalide',
    }),
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .allow('', null)
    .optional()
    .messages({
      'string.alphanum': 'Uniquement lettres et chiffres',
    }),
});

/**
 * Schéma de vérification MFA (backend).
 * Reçoit l'idToken Firebase + le code TOTP.
 */
export const mfaVerifySchema = Joi.object({
  mfaCode: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'Le code MFA doit contenir exactement 6 chiffres',
      'any.required': 'Le code MFA est requis',
    }),
  idToken: Joi.string()
    .min(20)
    .required()
    .messages({
      'any.required': 'Le token d\'identification est requis',
    }),
});

/**
 * Schéma de génération d'URL signée.
 */
export const signedUrlSchema = Joi.object({
  filePath: Joi.string()
    .max(500)
    .pattern(/^[a-zA-Z0-9_\-\/\.]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Chemin de fichier invalide',
      'any.required': 'Le chemin du fichier est requis',
    }),
});

/**
 * Valide des données contre un schéma Joi.
 * @param {Joi.Schema} schema
 * @param {Object} data
 * @returns {{ error?: Joi.ValidationError, value?: Object }}
 */
export function validate(schema, data) {
  return schema.validate(data, {
    stripUnknown: true,
    abortEarly: false,
  });
}

export default {
  loginSchema,
  registerSchema,
  mfaVerifySchema,
  signedUrlSchema,
  validate,
};

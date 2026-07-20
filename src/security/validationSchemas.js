/**
 * validationSchemas.js — Schémas de validation et nettoyage des entrées avec Yup.
 *
 * Utilise Yup pour valider et assainir toutes les entrées de formulaires
 * avant leur traitement, neutralisant les injections XSS et NoSQL.
 *
 * Usage :
 *   import { loginSchema, registerSchema } from './validationSchemas';
 *   const valid = await loginSchema.validate({ email, password });
 */

import * as yup from 'yup';

// ─── Helpers ────────────────────────────────────────────────────────

function normalizePhoneForCmr(value) {
  if (typeof value !== 'string') return '';
  let cleaned = value.trim().replace(/[\s-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+237')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('00237')) cleaned = cleaned.slice(5);
  else if (cleaned.startsWith('237') && cleaned.length > 9) cleaned = cleaned.slice(3);
  return cleaned;
}

function validateCmrPhone(value) {
  const normalized = normalizePhoneForCmr(value);
  return /^[26]\d{8}$/.test(normalized);
}

function getAgeFromBirthDate(birthDate) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

// Regex pour détecter les tentatives d'injection
const INJECTION_PATTERNS = /[<>{}()$;`&#]/;
const SCRIPT_PATTERN = /<script|javascript:|on\w+\s*=/i;

// Nettoyage HTML basique
function sanitizeHTML(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function noInjection(value) {
  if (typeof value !== 'string') return true;
  return !INJECTION_PATTERNS.test(value) && !SCRIPT_PATTERN.test(value);
}

// ─── Schémas ────────────────────────────────────────────────────────

/**
 * Schéma de connexion.
 */
export const loginSchema = yup.object({
  email: yup
    .string()
    .required('L\'email est requis')
    .email('Format d\'email invalide')
    .max(255, 'Email trop long')
    .transform((val) => val?.trim().toLowerCase()),
  password: yup
    .string()
    .required('Le mot de passe est requis')
    .min(8, 'Minimum 8 caractères')
    .max(128, 'Mot de passe trop long'),
});

/**
 * Schéma d'inscription.
 */
export const registerSchema = yup.object({
  fullName: yup
    .string()
    .required('Le nom complet est requis')
    .min(2, 'Minimum 2 caractères')
    .max(100, 'Maximum 100 caractères')
    .test('no-injection', 'Caractères non autorisés dans le nom', noInjection)
    .transform((val) => sanitizeHTML(val?.trim())),
  email: yup
    .string()
    .required('L\'email est requis')
    .email('Format d\'email invalide')
    .max(255, 'Email trop long')
    .transform((val) => val?.trim().toLowerCase()),
  password: yup
    .string()
    .required('Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Mot de passe trop long')
    .matches(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .matches(/[0-9]/, 'Doit contenir au moins un chiffre')
    .matches(/[^A-Za-z0-9]/, 'Doit contenir au moins un caractère spécial'),
  role: yup
    .string()
    .required('Le rôle est requis')
    .oneOf(['candidate', 'recruiter', 'recruteur', 'candidat', 'student'], 'Rôle invalide'),
  phone: yup
    .string()
    .nullable()
    .transform((val) => val?.replace(/\s/g, '') || null)
    .matches(/^[0-9+]{9,15}$/, 'Format de téléphone invalide'),
  username: yup
    .string()
    .nullable()
    .transform((val) => val?.trim() || null)
    .min(3, 'Minimum 3 caractères')
    .max(30, 'Maximum 30 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Uniquement lettres, chiffres, tirets et underscores')
    .test('no-injection', 'Caractères non autorisés', noInjection),
});

/**
 * Schéma de publication d'offre (recruteur).
 */
export const jobPostSchema = yup.object({
  title: yup
    .string()
    .required('Le titre est requis')
    .min(5, 'Minimum 5 caractères')
    .max(200, 'Maximum 200 caractères')
    .test('no-injection', 'Caractères non autorisés dans le titre', noInjection)
    .transform((val) => sanitizeHTML(val?.trim())),
  company: yup
    .string()
    .required('L\'entreprise est requise')
    .min(2, 'Minimum 2 caractères')
    .max(100, 'Maximum 100 caractères')
    .test('no-injection', 'Caractères non autorisés', noInjection)
    .transform((val) => sanitizeHTML(val?.trim())),
  city: yup
    .string()
    .required('La ville est requise')
    .max(100),
  type: yup
    .string()
    .oneOf(['CDI', 'CDD', 'Stage', 'Freelance'], 'Type de contrat invalide'),
  salary: yup
    .number()
    .nullable()
    .transform((val) => (val ? Number(val) : null))
    .min(0, 'Le salaire ne peut pas être négatif')
    .max(99999999, 'Salaire trop élevé'),
  description: yup
    .string()
    .max(5000, 'Description trop longue (max 5000 caractères)')
    .test('no-injection', 'Caractères non autorisés', noInjection)
    .transform((val) => sanitizeHTML(val?.trim())),
  skills: yup
    .array()
    .of(yup.string().max(50))
    .max(30, 'Maximum 30 compétences'),
  missions: yup
    .array()
    .of(yup.string().max(500))
    .max(20, 'Maximum 20 missions'),
});

/**
 * Schéma de mise à jour de profil.
 */
export const profileUpdateSchema = yup.object({
  summary: yup
    .string()
    .nullable()
    .max(3000, 'Résumé trop long')
    .test('no-injection', 'Caractères non autorisés', noInjection)
    .transform((val) => sanitizeHTML(val?.trim() || '')),
  birthDate: yup
    .string()
    .nullable()
    .test('valid-birthdate', 'Date de naissance invalide', (value) => {
      if (!value) return true;
      const birthDate = new Date(value);
      if (Number.isNaN(birthDate.getTime())) return false;
      const today = new Date();
      if (birthDate > today) return false;
      const age = getAgeFromBirthDate(value);
      return age !== null && age >= 18 && age <= 100;
    }),
  phone: yup
    .string()
    .nullable()
    .transform((val) => val?.replace(/\s/g, '') || null)
    .matches(/^[0-9+]{9,15}$/, { message: 'Format de téléphone invalide', excludeEmptyString: true }),
  skills: yup
    .array()
    .of(yup.string().max(50).test('no-injection', '', noInjection))
    .max(40, 'Maximum 40 compétences'),
  location: yup.string().max(100).nullable(),
  username: yup
    .string()
    .nullable()
    .transform((val) => {
      if (val === undefined || val === null) return null;
      const trimmed = String(val).trim();
      return trimmed === '' ? null : trimmed;
    })
    .max(30, 'Nom d’utilisateur trop long')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Uniquement lettres, chiffres, tirets et underscores')
    .test('no-injection', '', noInjection),
});

/**
 * Schéma de message (chat).
 */
export const messageSchema = yup.object({
  text: yup
    .string()
    .required('Le message ne peut pas être vide')
    .min(1)
    .max(5000, 'Message trop long')
    .test('no-injection', 'Caractères non autorisés', (val) => {
      if (typeof val !== 'string') return true;
      return !SCRIPT_PATTERN.test(val);
    })
    .transform((val) => val?.trim()),
});

/**
 * Schéma de vérification MFA.
 */
export const mfaVerifySchema = yup.object({
  mfaCode: yup
    .string()
    .required('Le code MFA est requis')
    .matches(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres'),
});

/**
 * Schéma de signalement.
 */
export const reportSchema = yup.object({
  reason: yup
    .string()
    .required('Le motif est requis')
    .oneOf(['scam', 'impersonation', 'harassment', 'fake_job', 'inappropriate', 'spam', 'other']),
  details: yup
    .string()
    .max(1000, 'Maximum 1000 caractères')
    .test('no-injection', 'Caractères non autorisés', noInjection)
    .transform((val) => val?.trim() || ''),
});

// ─── Helper : Validation avec capture d'erreur ─────────────────────

/**
 * Valide des données contre un schéma Yup et retourne un résultat structuré.
 * @param {yup.Schema} schema
 * @param {Object} data
 * @returns {Promise<{ valid: boolean, data?: Object, errors?: string[] }>}
 */
export async function validateAndClean(schema, data) {
  try {
    const cleaned = await schema.validate(data, {
      stripUnknown: true,
      abortEarly: false,
    });
    return { valid: true, data: cleaned };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return {
        valid: false,
        errors: err.errors,
      };
    }
    return { valid: false, errors: ['Erreur de validation inattendue'] };
  }
}

export async function validateRegistrationPayload(data) {
  const errors = [];

  if (!data?.fullName || String(data.fullName).trim().length < 2) {
    errors.push('Le nom complet est requis (minimum 2 caractères).');
  }

  if (!data?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    errors.push('L’email est invalide.');
  }

  if (!data?.password || String(data.password).length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères.');
  }

  if (!data?.role || !['candidate', 'recruiter', 'recruteur', 'candidat', 'student'].includes(String(data.role))) {
    errors.push('Le rôle est invalide.');
  }

  if (data?.agreeTerms !== true) {
    errors.push('Vous devez accepter les conditions d’utilisation.');
  }

  if (data?.phone && !validateCmrPhone(data.phone)) {
    errors.push('Le numéro de téléphone doit être un numéro camerounais valide.');
  }

  if (data?.role === 'candidate' || data?.role === 'candidat' || data?.role === 'student') {
    if (data?.birthDate) {
      const birthDate = new Date(data.birthDate);
      const today = new Date();
      if (Number.isNaN(birthDate.getTime())) {
        errors.push('La date de naissance est invalide.');
      } else if (birthDate > today) {
        errors.push('La date de naissance ne peut pas être dans le futur.');
      } else {
        const age = getAgeFromBirthDate(data.birthDate);
        if (age === null) {
          errors.push('La date de naissance est invalide.');
        } else if (age < 18) {
          errors.push('Vous devez avoir au moins 18 ans pour créer un compte.');
        } else if (age > 100) {
          errors.push('La date de naissance est invalide (âge supérieur à 100 ans).');
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      ...data,
      phone: data?.phone ? normalizePhoneForCmr(data.phone) : '',
    },
  };
}

export { sanitizeHTML, noInjection, normalizePhoneForCmr, validateCmrPhone };
export default { loginSchema, registerSchema, jobPostSchema, profileUpdateSchema, messageSchema, reportSchema, validateAndClean, validateRegistrationPayload };

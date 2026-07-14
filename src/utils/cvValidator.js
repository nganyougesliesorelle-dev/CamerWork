/* global Buffer */
/**
 * cvValidator.js — Validation de contenu CV.
 *
 * Analyse un fichier PDF uploadé pour déterminer s'il s'agit d'un vrai CV.
 * Vérifie la présence de mots-clés typiques d'un CV (formation, expérience,
 * compétences, etc.) et pénalise les documents sans structure de CV.
 *
 * Usage :
 *   import { validateCVContent } from '../utils/cvValidator';
 *   const result = await validateCVContent(fileBuffer);
 *   if (!result.isValidCV) {
 *     // Afficher l'erreur : "Ce document ne semble pas être un CV valide."
 *   }
 *
 * Format accepté : PDF uniquement (le Magic Number check est fait avant).
 * Dépendance : npm install pdf-parse
 */

// Mots-clés typiques d'un CV (français + anglais)
const CV_KEYWORDS = {
  // Sections typiques d'un CV
  sections: [
    'expérience', 'experience', 'expériences', 'experiences',
    'formation', 'education', 'formations', 'études', 'studies',
    'compétences', 'competences', 'skills', 'compétences techniques',
    'langues', 'languages', 'langues parlées',
    'certifications', 'certificats', 'certificates',
    'profil', 'profile', 'à propos', 'about me', 'résumé', 'summary',
    'contact', 'coordonnées', 'references', 'références',
    'loisirs', 'hobbies', 'centres d\'intérêt', 'interests',
    'projets', 'projects', 'réalisations', 'achievements',
  ],
  // Mots typiques de l'expérience pro
  experience: [
    'stagiaire', 'intern', 'stage', 'internship',
    'développeur', 'developer', 'ingénieur', 'engineer',
    'manager', 'directeur', 'director', 'chef', 'head',
    'responsable', 'lead', 'senior', 'junior',
    'employé', 'employee', 'consultant', 'consultant',
    'analyste', 'analyst', 'technicien', 'technician',
    'commercial', 'sales', 'marketing', 'comptable', 'accountant',
  ],
  // Indicateurs de dates (présents dans les CV)
  datePatterns: [
    /\b(19|20)\d{2}\b/,                    // Année (ex: 2019, 2023)
    /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b\d{4}\s*[-–—]\s*\d{4}\b/,           // Période (ex: 2019 - 2023)
    /\b\d{4}\s*[-–—]\s*(présent|present|aujourd'hui|today|now)\b/i,
  ],
};

// Poids pour le scoring
const WEIGHTS = {
  sections: 8,       // Chaque section trouvée = +8 points
  experience: 3,     // Chaque mot d'expérience = +3 points
  datePattern: 5,    // Chaque pattern de date = +5 points
};

const PASS_THRESHOLD = 35; // Score minimum pour être considéré comme un CV
const EXCELLENT_THRESHOLD = 60;

/**
 * Extrait le texte d'un buffer PDF via pdf-parse.
 * @param {Buffer} buffer — Buffer contenant le PDF
 * @returns {Promise<string>} Texte extrait
 */
async function extractPDFText(buffer) {
  try {
    // Lazy import pour éviter l'erreur si pdf-parse n'est pas installé
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Erreur extraction PDF:', error);
    return '';
  }
}

/**
 * Analyse le texte pour déterminer si c'est un CV.
 *
 * @param {string} text — Texte extrait du document
 * @returns {{ isValidCV: boolean, score: number, maxScore: number, confidence: string, details: Object }}
 */
function analyzeCVContent(text) {
  if (!text || text.length < 100) {
    return {
      isValidCV: false,
      score: 0,
      maxScore: PASS_THRESHOLD,
      confidence: 'low',
      details: {
        reason: 'Document trop court ou vide. Un CV contient généralement plus de 100 caractères.',
        textLength: text?.length || 0,
        foundSections: [],
        foundExperience: [],
        foundDates: 0,
      },
    };
  }

  const textLower = text.toLowerCase();
  let score = 0;

  // 1. Détection des sections
  const foundSections = [];
  for (const section of CV_KEYWORDS.sections) {
    if (textLower.includes(section)) {
      foundSections.push(section);
      score += WEIGHTS.sections;
    }
  }

  // 2. Mots d'expérience professionnelle
  const foundExperience = [];
  for (const exp of CV_KEYWORDS.experience) {
    if (textLower.includes(exp)) {
      foundExperience.push(exp);
      score += WEIGHTS.experience;
    }
  }

  // 3. Patterns de dates
  let foundDates = 0;
  for (const pattern of CV_KEYWORDS.datePatterns) {
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      foundDates += matches.length;
      score += WEIGHTS.datePattern * Math.min(matches.length, 3); // Cap à 3
    }
  }

  // 4. Bonus / Malus
  // Bonus : présence de téléphone/email (indique un CV)
  const hasContact = /\b0\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/.test(text)
    || /\b[\w.-]+@[\w.-]+\.\w{2,}\b/.test(text);
  if (hasContact) score += 10;

  // Malus : ressemble à un article/reçu/facture
  const looksLikeInvoice = /\b(facture|invoice|reçu|receipt|commande|order)\b/i.test(text);
  if (looksLikeInvoice) score -= 20;

  const isValidCV = score >= PASS_THRESHOLD;

  let confidence = 'low';
  if (score >= EXCELLENT_THRESHOLD) confidence = 'high';
  else if (score >= PASS_THRESHOLD) confidence = 'medium';

  return {
    isValidCV,
    score,
    maxScore: PASS_THRESHOLD,
    confidence,
    details: {
      reason: isValidCV
        ? null
        : `Ce document ne semble pas être un CV valide (score: ${score}/${PASS_THRESHOLD}). ` +
          `Assurez-vous qu'il contient vos expériences, formations et compétences.`,
      textLength: text.length,
      foundSections,
      foundExperience,
      foundDates,
      hasContact,
      looksLikeInvoice,
    },
  };
}

/**
 * Fonction principale : valide qu'un buffer PDF contient un vrai CV.
 *
 * @param {Buffer} buffer — Buffer du fichier PDF
 * @returns {Promise<{ isValidCV: boolean, score: number, confidence: string, error?: string, details?: Object }>}
 */
export async function validateCVContent(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) {
      return { isValidCV: false, score: 0, confidence: 'low', error: 'Buffer invalide.' };
    }

    const text = await extractPDFText(buffer);

    if (!text) {
      return {
        isValidCV: false,
        score: 0,
        confidence: 'low',
        error: 'Impossible d\'extraire le texte du PDF. Le fichier est peut-être corrompu ou protégé.',
      };
    }

    const analysis = analyzeCVContent(text);

    return {
      isValidCV: analysis.isValidCV,
      score: analysis.score,
      confidence: analysis.confidence,
      details: analysis.details,
    };
  } catch (error) {
    return {
      isValidCV: false,
      score: 0,
      confidence: 'low',
      error: `Erreur lors de l'analyse du CV : ${error.message}`,
    };
  }
}

/**
 * Retourne un message utilisateur adapté au résultat de la validation.
 */
export function getCVValidationMessage(result) {
  if (result.isValidCV) {
    if (result.confidence === 'high') {
      return '✅ CV valide détecté avec une forte confiance.';
    }
    return '✅ CV valide détecté.';
  }

  if (result.error) {
    return `❌ ${result.error}`;
  }

  return `❌ ${result.details?.reason || 'Ce document ne semble pas être un CV.'}`;
}

export default { validateCVContent, getCVValidationMessage };
/**
 * Moteur de matching intelligent — CamerWork.
 *
 * Fonctions exportées :
 *   calculateMatchingScore(candidate, job) → score 0-100 (existant)
 *   getMissingSkills(candidateSkills, jobRequirements) → string[]
 *   reverseMatchCandidates(job, candidates) → { candidate, score, missingSkills }[]
 *
 * Formule de matching :
 *   skillScore = (compétences communes / compétences requises) × 70
 *   locationScore = même ville ? 30 : 0
 *   total = skillScore + locationScore (arrondi)
 */

/**
 * Calcule le pourcentage de correspondance entre un candidat et une offre.
 */
const SKILL_WEIGHT = 70;
const CITY_WEIGHT = 30;

const normalizeSkill = (rawValue) => {
  return String(rawValue || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const getSkillTokens = (value) => {
  const normalized = normalizeSkill(value);
  return new Set(normalized.split(' ').filter(Boolean));
};

const isSkillMatch = (requirement, skill) => {
  const cleanReq = normalizeSkill(requirement);
  const cleanSkill = normalizeSkill(skill);
  if (!cleanReq || !cleanSkill) return false;
  if (cleanReq === cleanSkill) return true;

  const shortSuffix = /^(js|ts|jsx|tsx)$/;
  if (cleanReq.startsWith(cleanSkill) && shortSuffix.test(cleanReq.slice(cleanSkill.length))) return true;
  if (cleanSkill.startsWith(cleanReq) && shortSuffix.test(cleanSkill.slice(cleanReq.length))) return true;

  const reqTokens = getSkillTokens(cleanReq);
  const skillTokens = getSkillTokens(cleanSkill);
  return [...reqTokens].some((token) => token.length >= 3 && skillTokens.has(token));
};

export function calculateMatchingScore(candidate, job) {
  if (!candidate || !job) return 0;

  const candidateSkills = (candidate.skills || []).map(normalizeSkill).filter(Boolean);
  const jobRequirements = (job.profile || []).map(String).filter(Boolean);

  let skillScore = 0;
  let locationScore = 0;

  if (jobRequirements.length > 0 && candidateSkills.length > 0) {
    let matchedSkillsCount = 0;
    jobRequirements.forEach((req) => {
      if (candidateSkills.some((skill) => isSkillMatch(req, skill))) {
        matchedSkillsCount++;
      }
    });

    skillScore = (matchedSkillsCount / jobRequirements.length) * SKILL_WEIGHT;
    try {
      console.debug('[matchingEngine] calc', {
        jobId: job.id || null,
        jobReqCount: jobRequirements.length,
        candidateSkillCount: candidateSkills.length,
        matchedSkillsCount,
        skillScore: Math.round(skillScore),
      });
    } catch (_) {}
  }

  if (candidate.location && job.city) {
    if (candidate.location.toLowerCase().trim() === job.city.toLowerCase().trim()) {
      locationScore = CITY_WEIGHT;
    }
  }

  return Math.round(skillScore + locationScore);
}

/**
 * Isole les compétences requises par une offre que le candidat ne possède PAS.
 * @param {string[]} candidateSkills — compétences du candidat (ex: ['React JS', 'Tailwind CSS'])
 * @param {string[]} jobRequirements — compétences exigées par l'offre (ex: ['React JS', 'Spring Boot', 'Git'])
 * @returns {string[]} — compétences manquantes (ex: ['Spring Boot', 'Git'])
 */
export function getMissingSkills(candidateSkills, jobRequirements) {
  if (!candidateSkills || !jobRequirements) return jobRequirements || [];
  const cleanCandidate = candidateSkills.map(normalizeSkill).filter(Boolean);

  return jobRequirements.filter((req) => {
    return !cleanCandidate.some((skill) => isSkillMatch(req, skill));
  });
}

/**
 * Matching inversé : pour une offre donnée, scanne une liste de candidats
 * et retourne le top N classé par score d'affinité.
 *
 * Formule utilisée (conforme à la spécification) :
 *   score = (compétences communes × 15) + (même ville × 25)
 *
 * @param {Object} job — l'offre d'emploi ({ profile, city })
 * @param {Object[]} candidates — liste de profils candidats ({ id, skills, location, ... })
 * @param {number} topN — nombre de résultats à retourner (défaut : 5)
 * @returns {Object[]} — [{ candidate, score, commonSkills, sameCity }] trié par score décroissant
 */
export function reverseMatchCandidates(job, candidates, topN = 5) {
  if (!job || !candidates || candidates.length === 0) return [];

  const jobSkills = (job.profile || []).map(normalizeSkill).filter(Boolean);

  const scored = candidates.map(candidate => {
    const candidateSkills = (candidate.skills || []).map(normalizeSkill).filter(Boolean);
    const candidateCity = (candidate.location || '').toLowerCase().trim();

    // Compétences communes
    const commonSkills = [];
    jobSkills.forEach((jSkill) => {
      if (candidateSkills.some((cSkill) => isSkillMatch(jSkill, cSkill))) {
        commonSkills.push(jSkill);
      }
    });

    // Même ville ?
    const sameCity = Boolean(job.city && candidateCity && job.city.toLowerCase().trim() === candidateCity);

    // Calcule le pourcentage exactement comme calculateMatchingScore
    const skillScore = jobSkills.length > 0 ? (commonSkills.length / jobSkills.length) * SKILL_WEIGHT : 0;
    const locationScore = sameCity ? CITY_WEIGHT : 0;
    const percentage = Math.round(skillScore + locationScore);

    return {
      candidate: { ...candidate, id: candidate.id },
      score: percentage,
      commonSkills: commonSkills.length,
      totalRequired: jobSkills.length,
      sameCity,
      missingSkills: getMissingSkills(candidate.skills, job.profile),
    };
  });

  // Tri décroissant et limite au top N
  return scored
    .filter(s => s.score > 0 || s.sameCity)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}


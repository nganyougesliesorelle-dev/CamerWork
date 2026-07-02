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
export function calculateMatchingScore(candidate, job) {
  if (!candidate || !job) return 0;

  const candidateSkills = candidate.skills || [];
  const jobRequirements = job.profile || [];

  let skillScore = 0;
  let locationScore = 0;

  if (jobRequirements.length > 0 && candidateSkills.length > 0) {
    const cleanCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());

    let matchedSkillsCount = 0;
    jobRequirements.forEach(req => {
      const cleanReq = req.toLowerCase().trim();
      if (cleanCandidateSkills.some(skill => skill.includes(cleanReq) || cleanReq.includes(skill))) {
        matchedSkillsCount++;
      }
    });

    skillScore = (matchedSkillsCount / jobRequirements.length) * 70;
  }

  if (candidate.location && job.city) {
    if (candidate.location.toLowerCase().trim() === job.city.toLowerCase().trim()) {
      locationScore = 30;
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
  const cleanCandidate = candidateSkills.map(s => s.toLowerCase().trim());

  return jobRequirements.filter(req => {
    const cleanReq = req.toLowerCase().trim();
    return !cleanCandidate.some(skill => skill.includes(cleanReq) || cleanReq.includes(skill));
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

  const jobSkills = (job.profile || []).map(s => s.toLowerCase().trim());
  const jobCity = (job.city || '').toLowerCase().trim();

  const scored = candidates.map(candidate => {
    const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase().trim());
    const candidateCity = (candidate.location || '').toLowerCase().trim();

    // Compétences communes
    const commonSkills = [];
    jobSkills.forEach(jSkill => {
      if (candidateSkills.some(cSkill => cSkill.includes(jSkill) || jSkill.includes(cSkill))) {
        commonSkills.push(jSkill);
      }
    });

    // Même ville ?
    const sameCity = jobCity && candidateCity && jobCity === candidateCity;

    // Formule : (compétences communes × 15) + (même ville × 25)
    const score = (commonSkills.length * 15) + (sameCity ? 25 : 0);

    // Normaliser en pourcentage (max théorique basé sur le nombre de compétences + bonus ville)
    const maxPossible = (jobSkills.length * 15) + 25;
    const percentage = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;

    return {
      candidate: { ...candidate, id: candidate.id },
      score: percentage,
      rawScore: score,
      commonSkills: commonSkills.length,
      totalRequired: jobSkills.length,
      sameCity,
      missingSkills: getMissingSkills(candidate.skills, job.profile),
    };
  });

  // Tri décroissant et limite au top N
  return scored
    .filter(s => s.rawScore > 0 || s.sameCity)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

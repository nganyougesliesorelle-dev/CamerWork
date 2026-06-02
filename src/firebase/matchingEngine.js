/**
 * Calcule le pourcentage de correspondance entre un candidat et une offre d'emploi.
 * @param {Object} candidate - Les données du profil candidat ({ skills, location })
 * @param {Object} job - Les données de l'offre d'emploi ({ profile, city })
 * @returns {number} Score de matching en pourcentage (0 à 100)
 */
export function calculateMatchingScore(candidate, job) {
  if (!candidate || !job) return 0;

  const candidateSkills = candidate.skills || [];
  const jobRequirements = job.profile || [];

  let skillScore = 0;
  let locationScore = 0;

  // 1. Calcul du score des compétences (Coefficient: 70%)
  if (jobRequirements.length > 0 && candidateSkills.length > 0) {
    // Nettoyage et mise en minuscule pour éviter les problèmes de casse ou d'espaces
    const cleanCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
    
    let matchedSkillsCount = 0;
    jobRequirements.forEach(req => {
      const cleanReq = req.toLowerCase().trim();
      // Vérifie si le mot-clé de l'offre est présent dans les compétences du candidat
      if (cleanCandidateSkills.some(skill => skill.includes(cleanReq) || cleanReq.includes(skill))) {
        matchedSkillsCount++;
      }
    });

    skillScore = (matchedSkillsCount / jobRequirements.length) * 70;
  }

  // 2. Calcul du score de localisation (Coefficient: 30%)
  if (candidate.location && job.city) {
    if (candidate.location.toLowerCase().trim() === job.city.toLowerCase().trim()) {
      locationScore = 30;
    }
  }

  // Score total arrondi à l'entier le plus proche
  return Math.round(skillScore + locationScore);
}
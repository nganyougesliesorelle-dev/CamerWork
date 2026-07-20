import skillData from '../../skill.json' with { type: 'json' };

const normalizeSkill = (skill) => String(skill || '').trim();

const allSkills = Array.from(
  new Set(
    (skillData || [])
      .flatMap((group) => (group.skills || []).map(normalizeSkill))
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b));

export const professionalSkillSuggestions = allSkills;

export function filterSkills(query, limit = 20) {
  const value = String(query || '').trim().toLowerCase();
  if (!value) {
    return professionalSkillSuggestions.slice(0, limit);
  }

  return professionalSkillSuggestions.filter((skill) => skill.toLowerCase().includes(value)).slice(0, limit);
}

export function addSkillToSelection(existingSkills = [], newSkill) {
  const value = String(newSkill || '').trim();
  if (!value) {
    return Array.isArray(existingSkills) ? [...existingSkills] : [];
  }

  const normalizedExisting = Array.isArray(existingSkills) ? existingSkills.filter(Boolean) : [];
  if (normalizedExisting.includes(value)) {
    return normalizedExisting;
  }

  return [...normalizedExisting, value];
}

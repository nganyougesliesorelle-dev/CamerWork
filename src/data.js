/**
 * mockJobs — Données de démonstration pour le développement local.
 *
 * Structure normalisée d'une offre :
 *   id, title, company, city, location, type, salary,
 *   description, missions, profile
 */
export const mockJobs = [
  {
    id: 1,
    title: 'Développeur Front-end',
    company: 'Cameroun Digital',
    city: 'Douala',
    location: 'Akwa',
    type: 'CDI',
    salary: '300k - 500k CFA',
    description:
      'Nous recherchons un passionné de React pour dynamiser nos interfaces.',
    missions: [
      'Développement de composants UI',
      'Optimisation des performances',
      "Collaboration avec l'équipe Design",
    ],
    profile: [
      'Maîtrise de React & Tailwind',
      "2 ans d'expérience",
      "Esprit d'équipe",
    ],
  },
  {
    id: 2,
    title: 'Responsable Marketing',
    company: 'MTN Cameroon',
    city: 'Yaoundé',
    location: 'Bastos',
    type: 'CDD',
    salary: '400k CFA',
    description:
      'Prenez la tête de nos campagnes digitales au Cameroun.',
    missions: [
      'Gestion des réseaux sociaux',
      'Analyse de données',
      'Stratégie publicitaire',
    ],
    profile: [
      'Diplôme en Marketing',
      'Bilingue (Français/Anglais)',
      'Créativité débordante',
    ],
  },
  {
    id: 3,
    title: 'Stagiaire Comptable',
    company: 'Cabinet Audit',
    city: 'Douala',
    location: 'Bonanjo',
    type: 'Stage',
    salary: '100k CFA',
    description:
      'Stage de 3 mois au sein de notre département audit et conseil.',
    missions: [
      'Saisie comptable',
      'Rapprochement bancaire',
      'Préparation des déclarations fiscales',
    ],
    profile: [
      'Étudiant en comptabilité (Bac+2 minimum)',
      'Maîtrise du Pack Office',
      'Rigueur et discrétion',
    ],
  },
  {
    id: 4,
    title: 'Stage Académique',
    company: 'MINEE',
    city: 'Yaoundé',
    location: 'Poste Centrale',
    type: 'Stage',
    salary: '50k CFA',
    description:
      'Stage académique au Ministère de l\'Eau et de l\'Énergie.',
    missions: [
      'Participation aux études de projet',
      'Suivi de chantier',
      'Rédaction de rapports techniques',
    ],
    profile: [
      'Étudiant en génie civil ou électrique',
      'Connaissances en AutoCAD',
      'Disponible 3 mois minimum',
    ],
  },
];

export default mockJobs;

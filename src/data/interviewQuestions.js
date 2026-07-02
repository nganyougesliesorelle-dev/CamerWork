/**
 * Banque de questions d'entretien technique par stack technologique.
 * Chaque question a des mots-clés attendus dans la réponse et un barème.
 *
 * Structure :
 *   id           → identifiant unique
 *   q            → texte de la question
 *   keywords     → mots-clés techniques que le candidat devrait mentionner
 *   category     → "Technique" | "Comportemental" | "Architecture" | "Pratique"
 *   maxScore     → score maximum pour cette question (sur 4, total sur 20 pour 5 questions)
 */

const REACT_QUESTIONS = [
  {
    id: 1,
    q: "Expliquez la différence entre un composant fonctionnel et un composant de classe en React. Quand utilisez-vous l'un plutôt que l'autre ?",
    keywords: ["hooks", "useState", "useEffect", "lifecycle", "état", "state", "fonctionnel", "classe", "performances", "rendu"],
    category: "Technique",
    maxScore: 4,
  },
  {
    id: 2,
    q: "Comment gérez-vous le state management dans une application React complexe ? Parlez de Context API, Redux ou Zustand.",
    keywords: ["context", "redux", "zustand", "provider", "store", "dispatch", "reducer", "action", "immer", "middleware"],
    category: "Architecture",
    maxScore: 4,
  },
  {
    id: 3,
    q: "Décrivez le fonctionnement du Virtual DOM. Pourquoi React l'utilise-t-il et quel impact sur les performances ?",
    keywords: ["virtual dom", "reconciliation", "diffing", "batch", "render", "re-render", "key", "optimisation", "memo", "fiber"],
    category: "Technique",
    maxScore: 4,
  },
  {
    id: 4,
    q: "Vous devez optimiser un composant qui se re-render trop souvent. Quelles stratégies mettez-vous en place ?",
    keywords: ["memo", "useMemo", "useCallback", "lazy", "suspense", "code splitting", "profiler", "devtools", "pure component", "shouldComponentUpdate"],
    category: "Pratique",
    maxScore: 4,
  },
  {
    id: 5,
    q: "Parlez-moi d'un projet React dont vous êtes fier. Quels défis techniques avez-vous rencontrés et comment les avez-vous résolus ?",
    keywords: ["architecture", "api", "authentification", "déploiement", "test", "jest", "tailwind", "typescript", "équipe", "deadline"],
    category: "Comportemental",
    maxScore: 4,
  },
];

const JAVA_SPRING_QUESTIONS = [
  {
    id: 1,
    q: "Expliquez le principe d'Inversion de Contrôle (IoC) et d'Injection de Dépendances dans Spring. Donnez un exemple concret.",
    keywords: ["ioc", "di", "autowired", "bean", "component", "service", "repository", "configuration", "qualifier", "primary"],
    category: "Technique",
    maxScore: 4,
  },
  {
    id: 2,
    q: "Comment implémentez-vous la sécurité dans une API REST Spring Boot ? Parlez de JWT, Spring Security et OAuth2.",
    keywords: ["jwt", "spring security", "oauth2", "filter", "authentication", "authorization", "token", "bcrypt", "role", "cors"],
    category: "Architecture",
    maxScore: 4,
  },
  {
    id: 3,
    q: "Quelle est la différence entre @Transactional, la propagation REQUIRED et REQUIRES_NEW ? Quand les utiliser ?",
    keywords: ["transactional", "propagation", "required", "requires_new", "rollback", "isolation", "jpa", "hibernate", "entitymanager", "datasource"],
    category: "Technique",
    maxScore: 4,
  },
  {
    id: 4,
    q: "Comment optimiser les performances d'une API REST qui répond lentement ? Quels outils de profiling utilisez-vous ?",
    keywords: ["cache", "redis", "index", "query", "n+1", "lazy", "eager", "pagination", "actuator", "jmeter"],
    category: "Pratique",
    maxScore: 4,
  },
  {
    id: 5,
    q: "Décrivez votre expérience avec les microservices. Comment gérez-vous la communication inter-services et la résilience ?",
    keywords: ["microservice", "kafka", "rabbitmq", "feign", "circuit breaker", "resilience4j", "gateway", "eureka", "docker", "kubernetes"],
    category: "Comportemental",
    maxScore: 4,
  },
];

const FLUTTER_QUESTIONS = [
  {
    id: 1,
    q: "Expliquez la différence entre StatelessWidget et StatefulWidget. Dans quel cas utilisez-vous setState vs un State Management externe ?",
    keywords: ["stateless", "stateful", "setState", "bloc", "provider", "riverpod", "widget", "build", "context", "tree"],
    category: "Technique",
    maxScore: 4,
  },
  {
    id: 2,
    q: "Comment fonctionne le système de rendu de Flutter ? Parlez du Skia Engine, des Widgets, Elements et RenderObjects.",
    keywords: ["skia", "widget", "element", "renderobject", "tree", "build", "paint", "layout", "composition", "layer"],
    category: "Technique",
    maxScore: 4,
  },
  {
    id: 3,
    q: "Vous devez intégrer une API REST dans une application Flutter. Décrivez votre approche complète (appels, gestion d'état, erreurs).",
    keywords: ["http", "dio", "async", "await", "future", "stream", "error", "try catch", "model", "json serialization"],
    category: "Pratique",
    maxScore: 4,
  },
  {
    id: 4,
    q: "Comment optimisez-vous les performances d'une application Flutter ? Parlez du rebuild, des const constructors et du profiling.",
    keywords: ["const", "rebuild", "performance", "devtools", "profiler", "memory", "listview builder", "repaintboundary", "isolate", "compute"],
    category: "Pratique",
    maxScore: 4,
  },
  {
    id: 5,
    q: "Quelle est votre expérience avec le déploiement d'applications Flutter sur iOS et Android ? Quels défis avez-vous rencontrés ?",
    keywords: ["deploy", "app store", "play store", "ci/cd", "codemagic", "fastlane", "signing", "provisioning", "keystore", "review"],
    category: "Comportemental",
    maxScore: 4,
  },
];

const GENERAL_QUESTIONS = [
  {
    id: 1,
    q: "Parlez-moi de vous et de votre parcours professionnel. Quelles sont vos principales forces techniques ?",
    keywords: ["expérience", "formation", "diplôme", "stage", "projet", "force", "langage", "framework", "base de données", "cloud"],
    category: "Présentation",
    maxScore: 4,
  },
  {
    id: 2,
    q: "Pourquoi avez-vous postulé à ce poste spécifique ? Qu'est-ce qui vous motive dans notre entreprise ?",
    keywords: ["motivation", "entreprise", "mission", "valeur", "intérêt", "passion", "croissance", "impact", "culture", "innovation"],
    category: "Motivation",
    maxScore: 4,
  },
  {
    id: 3,
    q: "Décrivez une situation où vous avez dû résoudre un problème technique complexe. Quelle a été votre démarche ?",
    keywords: ["problème", "analyse", "debug", "solution", "méthode", "collaboration", "outil", "test", "itération", "résultat"],
    category: "Réalisations",
    maxScore: 4,
  },
  {
    id: 4,
    q: "Comment gérez-vous les délais serrés ou les changements de priorité en cours de sprint ?",
    keywords: ["priorité", "organisation", "agile", "scrum", "communication", "sprint", "deadline", "estimation", "product owner", "équipe"],
    category: "Soft Skills",
    maxScore: 4,
  },
  {
    id: 5,
    q: "Où vous voyez-vous dans 3 à 5 ans ? Quelles compétences souhaitez-vous développer ?",
    keywords: ["évolution", "carrière", "compétence", "leadership", "apprentissage", "mentorat", "architecture", "spécialisation", "contribution", "open source"],
    category: "Vision",
    maxScore: 4,
  },
];

/** Banque complète indexée par slug technologique */
export const TECH_QUESTIONS = {
  react: REACT_QUESTIONS,
  'react-js': REACT_QUESTIONS,
  'react js': REACT_QUESTIONS,
  java: JAVA_SPRING_QUESTIONS,
  'java spring': JAVA_SPRING_QUESTIONS,
  'spring boot': JAVA_SPRING_QUESTIONS,
  'java/spring': JAVA_SPRING_QUESTIONS,
  flutter: FLUTTER_QUESTIONS,
  dart: FLUTTER_QUESTIONS,
};

/** Questions générales (fallback si la stack n'est pas reconnue) */
export const DEFAULT_QUESTIONS = GENERAL_QUESTIONS;

/**
 * Résout la banque de questions correspondant à une stack technologique.
 * @param {string} techStack — ex: "React JS", "Java Spring Boot"
 * @returns {Array} — les 5 questions correspondantes
 */
export function getQuestionsForStack(techStack) {
  if (!techStack) return DEFAULT_QUESTIONS;
  const normalized = techStack.toLowerCase().trim();
  // Cherche une correspondance partielle
  for (const [key, questions] of Object.entries(TECH_QUESTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return questions;
    }
  }
  return DEFAULT_QUESTIONS;
}

/**
 * Génère un conseil personnalisé basé sur les mots-clés manquants dans la réponse.
 * @param {string[]} missingKeywords — mots-clés non mentionnés par le candidat
 * @param {string} category — catégorie de la question
 * @returns {string} — conseil formaté
 */
export function generateAdvice(missingKeywords, category) {
  if (missingKeywords.length === 0) {
    return "✅ Réponse complète — tous les concepts clés ont été abordés.";
  }
  const top = missingKeywords.slice(0, 3);
  const suggestions = {
    Technique: `Approfondissez ces concepts : ${top.join(', ')}. Consultez la documentation officielle et faites des exercices pratiques.`,
    Architecture: `Pensez à mentionner ces patterns : ${top.join(', ')}. Les recruteurs attendent une vision globale de l'architecture.`,
    Pratique: `Ajoutez des exemples concrets impliquant : ${top.join(', ')}. Les cas pratiques valent plus que la théorie.`,
    Comportemental: `Structurez votre réponse avec la méthode STAR en incluant : ${top.join(', ')}. Soyez précis sur votre rôle.`,
    Présentation: `N'oubliez pas de mentionner : ${top.join(', ')}. Votre parcours doit montrer une progression claire.`,
    Motivation: `Reliez votre réponse à : ${top.join(', ')}. Montrez que vous avez fait des recherches sur l'entreprise.`,
    Réalisations: `Quantifiez vos résultats et mentionnez : ${top.join(', ')}. Les chiffres et l'impact sont essentiels.`,
    'Soft Skills': `Illustrez avec un exemple concret incluant : ${top.join(', ')}. Le storytelling fait la différence.`,
    Vision: `Projetez-vous en mentionnant : ${top.join(', ')}. Montrez une trajectoire d'apprentissage ambitieuse mais réaliste.`,
  };
  return suggestions[category] || `Points à travailler : ${top.join(', ')}. Préparez ces sujets pour votre prochain entretien.`;
}

/**
 * Ressources d'apprentissage par technologie (utilisé aussi par le Career Dashboard).
 */
export const LEARNING_RESOURCES = {
  react: [
    { title: 'React Documentation Officielle', url: 'https://react.dev', type: 'Documentation' },
    { title: 'React JS — Cours Complet (Grafikart)', url: 'https://grafikart.fr/formations/react', type: 'Tutoriel FR' },
    { title: 'Build 15 React Projects (freeCodeCamp)', url: 'https://www.youtube.com/watch?v=a_7Z7C_JCyo', type: 'Projet Vidéo' },
  ],
  'spring boot': [
    { title: 'Spring Boot Documentation', url: 'https://spring.io/projects/spring-boot', type: 'Documentation' },
    { title: 'Spring Boot Tutorial — Building REST API', url: 'https://www.youtube.com/watch?v=9SGDpanrc8U', type: 'Tutoriel Vidéo' },
    { title: 'Spring Security & JWT Guide', url: 'https://www.baeldung.com/spring-security', type: 'Guide Complet' },
  ],
  java: [
    { title: 'Java Documentation Oracle', url: 'https://docs.oracle.com/en/java/', type: 'Documentation' },
    { title: 'Java Programming Masterclass (Udemy)', url: 'https://www.udemy.com/course/java-the-complete-java-developer-course/', type: 'Cours' },
    { title: 'Design Patterns en Java', url: 'https://refactoring.guru/fr/design-patterns/java', type: 'Référence' },
  ],
  flutter: [
    { title: 'Flutter Documentation', url: 'https://flutter.dev/docs', type: 'Documentation' },
    { title: 'Flutter & Dart — Cours Complet (Maximilian)', url: 'https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/', type: 'Cours' },
    { title: 'Flutter State Management Guide', url: 'https://docs.flutter.dev/data-and-backend/state-mgmt', type: 'Guide' },
  ],
  tailwind: [
    { title: 'Tailwind CSS Documentation', url: 'https://tailwindcss.com/docs', type: 'Documentation' },
    { title: 'Tailwind CSS — Maîtrise Complète', url: 'https://www.youtube.com/watch?v=mr15Xzb1Ook', type: 'Tutoriel Vidéo' },
  ],
  firebase: [
    { title: 'Firebase Documentation', url: 'https://firebase.google.com/docs', type: 'Documentation' },
    { title: 'Firebase Firestore — Guide Pratique', url: 'https://www.youtube.com/watch?v=2Vf1D-rUMwE', type: 'Tutoriel' },
    { title: 'Firebase Authentication Tutorial', url: 'https://firebase.google.com/docs/auth', type: 'Documentation' },
  ],
  git: [
    { title: 'Git Documentation', url: 'https://git-scm.com/doc', type: 'Documentation' },
    { title: 'Apprendre Git et GitHub', url: 'https://grafikart.fr/formations/git', type: 'Tutoriel FR' },
  ],
  docker: [
    { title: 'Docker Documentation', url: 'https://docs.docker.com/', type: 'Documentation' },
    { title: 'Docker Mastery Course', url: 'https://www.udemy.com/course/docker-mastery/', type: 'Cours' },
  ],
  typescript: [
    { title: 'TypeScript Documentation', url: 'https://www.typescriptlang.org/docs/', type: 'Documentation' },
    { title: 'TypeScript — Guide Complet', url: 'https://grafikart.fr/formations/typescript', type: 'Tutoriel FR' },
  ],
};

/**
 * Trouve des ressources d'apprentissage pour une compétence donnée.
 * @param {string} skill — nom de la compétence (ex: "React JS", "Docker")
 * @returns {Array} — liste de ressources { title, url, type }
 */
export function getResourcesForSkill(skill) {
  const normalized = skill.toLowerCase().trim();
  for (const [key, resources] of Object.entries(LEARNING_RESOURCES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return resources;
    }
  }
  // Ressources génériques si aucune correspondance exacte
  return [
    { title: `Documentation ${skill}`, url: `https://www.google.com/search?q=${encodeURIComponent(skill + ' documentation')}`, type: 'Recherche' },
    { title: `Tutoriel ${skill}`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial')}`, type: 'Vidéo' },
  ];
}

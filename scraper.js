// scraper.js (Version Spéciale MinaJobs Cameroun - Ajustée avec Liens)
import axios from 'axios';
import * as cheerio from 'cheerio';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Configuration Firebase CamerWork
const firebaseConfig = {
  apiKey: "AIzaSyBxTb3bWqQCDlTGRG9B4XEE9ik9ZBjOkuQ",
  authDomain: "camerwork-1e3d0.firebaseapp.com",
  projectId: "camerwork-1e3d0",
  storageBucket: "camerwork-1e3d0.firebasestorage.app",
  messagingSenderId: "124342889976",
  appId: "1:124342889976:web:6198946af6b190962c3a0d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runScraper() {
  try {
    const url = 'https://cameroun.minajobs.net/';
    console.log("🤖 Initialisation du robot CamerWork...");
    console.log(`📡 Connexion à MinaJobs Cameroun...`);

    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      }
    });

    const $ = cheerio.load(data);
    let jobCount = 0;

    // Ciblage des lignes du tableau contenant les offres d'emploi
    $('table tr, .job-list tr, tr.job-item').each(async (index, element) => {
      // Extraction du premier lien de la ligne (le titre de l'offre)
      const titleElement = $(element).find('td a').first();
      const title = titleElement.text().trim();
      
      // 1. RÉCUPÉRATION ET RECONSTRUCTION DE L'URL SOURCE
      const relativeLink = titleElement.attr('href') || '';
      let sourceUrl = '';
      if (relativeLink) {
        sourceUrl = relativeLink.startsWith('http') ? relativeLink : `https://cameroun.minajobs.net${relativeLink}`;
      }
      
      let company = $(element).find('td').eq(1).text().trim() || "Entreprise Partenaire";
      let city = $(element).find('td').eq(2).text().trim() || "Douala / Yaoundé";

      // Filtre renforcé pour ne capturer que les vrais postes (longueur > 5 et pas de mots de navigation)
      if (title && title.length > 5 && !title.includes("Recrutement") && !title.includes("Inscription") && !title.includes("Connexion")) {
        jobCount++;

        const jobsRef = collection(db, "jobs");
        const q = query(jobsRef, where("title", "==", title.toUpperCase()), where("company", "==", company));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Insertion automatique dans Firestore avec le champ sourceUrl
          await addDoc(collection(db, "jobs"), {
            title: title.toUpperCase(),
            company: company,
            city: city,
            type: "CDI",
            description: `Cette offre d'emploi pour le poste de ${title} a été détectée automatiquement par le système de veille autonome de CamerWork sur les plateformes partenaires.`,
            missions: [
              "Prendre connaissance des détails du poste lors de l'entretien.",
              "Exécuter les tâches confiées par le responsable de département."
            ],
            profile: [
              "Avoir les compétences ou diplômes requis pour le poste.",
              "Être dynamique, rigoureux et capable de travailler sous pression."
            ],
            verified: true,
            createdAt: new Date(),
            isScraped: true,
            sourceUrl: sourceUrl // <-- Le lien est maintenant enregistré ici !
          });
          console.log(`✨ [Ajouté au Firestore] : ${title} (${company})`);
        } else {
          console.log(`局️ [Doublon ignoré] : ${title}`);
        }
      }
    });

    // Temps d'attente pour s'assurer que Firebase a fini d'écrire toutes les offres
    setTimeout(() => {
      console.log(`\n🎉 Fin du traitement ! Le robot a terminé sa ronde.`);
      process.exit(0);
    }, 7000);

  } catch (error) {
    console.error("❌ Erreur de scraping :", error.message);
    process.exit(1);
  }
}

runScraper();
/* global process */
/**
 * CamerWork Multi-Site Job Scraper
 * Scrape 9 plateformes d'emploi camerounaises → Firestore
 * Usage: node scraper.cjs [site]   (ex: node scraper.cjs minajobs)
 *        node scraper.cjs all       (tous les sites)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, limit } from 'firebase/firestore';

// ─── Firebase ───────────────────────────────────────────────
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

// ─── Axios instance ─────────────────────────────────────────
const http = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  timeout: 30000,
});

// ─── Utilitaires ────────────────────────────────────────────
function cleanText(str) {
  return (str || '').replace(/\s+/g, ' ').trim();
}

function detectContractType(title, description = '') {
  const txt = (title + ' ' + description).toLowerCase();
  if (txt.includes('cdi') || txt.includes('c.d.i')) return 'CDI';
  if (txt.includes('cdd') || txt.includes('c.d.d')) return 'CDD';
  if (txt.includes('stage') || txt.includes('stagiaire') || txt.includes('internship')) return 'Stage';
  if (txt.includes('freelance') || txt.includes('consultant') || txt.includes('prestataire')) return 'Freelance';
  return 'CDI'; // défaut
}

function extractSalary(text) {
  if (!text) return '';
  const match = text.match(/(\d[\d\s]*)\s*(?:FCFA|CFA|XAF|fcfa)/i);
  return match ? match[1].replace(/\s/g, '') + ' FCFA' : '';
}

async function saveJob(jobData) {
  try {
    const jobsRef = collection(db, "jobs");
    const q = query(
      jobsRef,
      where("title", "==", jobData.title.toUpperCase()),
      where("company", "==", jobData.company),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { inserted: false, reason: 'doublon', title: jobData.title };
    }

    await addDoc(collection(db, "jobs"), {
      ...jobData,
      title: jobData.title.toUpperCase(),
      verified: true,
      createdAt: new Date(),
      isScraped: true,
    });
    return { inserted: true, title: jobData.title };
  } catch (err) {
    return { inserted: false, reason: err.message, title: jobData.title };
  }
}

// ═══════════════════════════════════════════════════════════
//  SCRAPERS PAR SITE
// ═══════════════════════════════════════════════════════════

// ─── 1. MinaJobs Cameroun ──────────────────────────────────
async function scrapeMinaJobs() {
  console.log('\n📡 [1/9] MinaJobs Cameroun...');
  const url = 'https://cameroun.minajobs.net/';
  const { data } = await http.get(url);
  const $ = cheerio.load(data);
  const jobs = [];

  $('table tr, .job-list tr, tr.job-item').each((i, el) => {
    const titleEl = $(el).find('td a').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const relativeLink = titleEl.attr('href') || '';
    const sourceUrl = relativeLink.startsWith('http')
      ? relativeLink
      : `https://cameroun.minajobs.net${relativeLink}`;

    const company = cleanText($(el).find('td').eq(1).text()) || 'Entreprise Partenaire';
    const city = cleanText($(el).find('td').eq(2).text()) || 'Douala / Yaoundé';

    jobs.push({
      title, company, city,
      type: 'CDI',
      description: `Offre détectée depuis MinaJobs Cameroun pour le poste de ${title}. Consultez le lien source pour plus de détails.`,
      missions: ['Consulter la description complète sur le site partenaire.'],
      profile: ['Compétences requises disponibles sur le site source.'],
      salary: '',
      sourceUrl,
      source: 'MinaJobs',
    });
  });
  return jobs;
}

// ─── 2. EverJobs Cameroun ──────────────────────────────────
async function scrapeEverJobs() {
  console.log('📡 [2/9] EverJobs Cameroun...');
  const url = 'https://www.everjobs.cm/emploi';
  const { data } = await http.get(url);
  const $ = cheerio.load(data);
  const jobs = [];

  $('.job-item, .job-card, article, .listing-item').each((i, el) => {
    const titleEl = $(el).find('h2 a, h3 a, .job-title a, a.job-link').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://www.everjobs.cm${href}`;

    const company = cleanText($(el).find('.company, .employer, .job-company').text()) || 'Entreprise Partenaire';
    const city = cleanText($(el).find('.location, .city, .job-location').text()) || 'Cameroun';
    const typeText = cleanText($(el).find('.type, .contract-type, .job-type').text());
    const salaryText = cleanText($(el).find('.salary, .job-salary').text());

    jobs.push({
      title, company, city,
      type: detectContractType(title, typeText),
      description: `Offre EverJobs : ${title} chez ${company} à ${city}.`,
      missions: ['Consulter la description complète sur EverJobs.'],
      profile: ['Voir les compétences requises sur le site source.'],
      salary: extractSalary(salaryText),
      sourceUrl,
      source: 'EverJobs',
    });
  });
  return jobs;
}

// ─── 3. Emploi.cm ──────────────────────────────────────────
async function scrapeEmploiCm() {
  console.log('📡 [3/9] Emploi.cm...');
  const url = 'https://www.emploi.cm/offres-emploi-cameroun';
  const { data } = await http.get(url);
  const $ = cheerio.load(data);
  const jobs = [];

  $('.job-item, .offer-item, article.job, .listing-card').each((i, el) => {
    const titleEl = $(el).find('h2 a, h3 a, .title a, a.offer-title').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://www.emploi.cm${href}`;

    const company = cleanText($(el).find('.company, .employer, .recruiter').text()) || 'Entreprise';
    const city = cleanText($(el).find('.location, .city, .region').text()) || 'Cameroun';
    const typeText = cleanText($(el).find('.contract, .type, .job-type').text());
    const desc = cleanText($(el).find('.description, .summary, .excerpt').text());

    jobs.push({
      title, company, city,
      type: detectContractType(title, typeText),
      description: desc || `Offre Emploi.cm : ${title} chez ${company}.`,
      missions: ['Voir détails sur Emploi.cm.'],
      profile: ['Compétences disponibles sur le site source.'],
      salary: extractSalary(cleanText($(el).text())),
      sourceUrl,
      source: 'Emploi.cm',
    });
  });
  return jobs;
}

// ─── 4. AkwaJobs ───────────────────────────────────────────
async function scrapeAkwaJobs() {
  console.log('📡 [4/9] AkwaJobs...');
  const url = 'https://akwajobs.com/';
  const { data } = await http.get(url).catch(() => ({ data: '' }));
  if (!data) { console.log('   ⚠️ Site inaccessible, ignoré.'); return []; }
  const $ = cheerio.load(data);
  const jobs = [];

  $('.job-listing, .post, article, .job-card').each((i, el) => {
    const titleEl = $(el).find('h2 a, h3 a, .entry-title a, .job-title a').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://akwajobs.com${href}`;

    const company = cleanText($(el).find('.company, .employer').text()) || 'Douala';
    const city = 'Douala';
    const typeText = cleanText($(el).find('.type, .contract').text());

    jobs.push({
      title, company, city,
      type: detectContractType(title, typeText),
      description: `Offre AkwaJobs : ${title}.`,
      missions: ['Voir description complète sur AkwaJobs.'],
      profile: ['Compétences requises sur le site source.'],
      salary: '',
      sourceUrl,
      source: 'AkwaJobs',
    });
  });
  return jobs;
}

// ─── 5. Nkulunu ────────────────────────────────────────────
async function scrapeNkulunu() {
  console.log('📡 [5/9] Nkulunu...');
  const url = 'https://nkulunu.com/emplois';
  const { data } = await http.get(url).catch(() => ({ data: '' }));
  if (!data) { console.log('   ⚠️ Site inaccessible, ignoré.'); return []; }
  const $ = cheerio.load(data);
  const jobs = [];

  $('.job-item, .listing, .offer-card, article').each((i, el) => {
    const titleEl = $(el).find('h2 a, h3 a, .title a').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://nkulunu.com${href}`;

    const company = cleanText($(el).find('.company, .business').text()) || 'Entreprise';
    const city = cleanText($(el).find('.location, .city').text()) || 'Cameroun';
    const typeText = cleanText($(el).find('.type, .contract').text());

    jobs.push({
      title, company, city,
      type: detectContractType(title, typeText),
      description: `Offre Nkulunu : ${title} chez ${company}.`,
      missions: ['Consulter les détails sur Nkulunu.'],
      profile: ['Voir compétences sur le site source.'],
      salary: '',
      sourceUrl,
      source: 'Nkulunu',
    });
  });
  return jobs;
}

// ─── 6. CamerSpace ─────────────────────────────────────────
async function scrapeCamerSpace() {
  console.log('📡 [6/9] CamerSpace...');
  const url = 'https://camerspace.com/emplois';
  const { data } = await http.get(url).catch(() => ({ data: '' }));
  if (!data) { console.log('   ⚠️ Site inaccessible, ignoré.'); return []; }
  const $ = cheerio.load(data);
  const jobs = [];

  $('.job-listing, .offer, article, .job-card').each((i, el) => {
    const titleEl = $(el).find('h2 a, h3 a, .title a, a').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://camerspace.com${href}`;

    const company = cleanText($(el).find('.company, .business-name, .employer').text()) || 'Entreprise';
    const city = cleanText($(el).find('.location, .city').text()) || 'Cameroun';
    const typeText = cleanText($(el).find('.type, .contract').text());

    jobs.push({
      title, company, city,
      type: detectContractType(title, typeText),
      description: `Offre CamerSpace : ${title} chez ${company}.`,
      missions: ['Voir détails sur CamerSpace.'],
      profile: ['Compétences disponibles sur le site source.'],
      salary: '',
      sourceUrl,
      source: 'CamerSpace',
    });
  });
  return jobs;
}

// ─── 7. Jumia Jobs Cameroun ────────────────────────────────
async function scrapeJumiaJobs() {
  console.log('📡 [7/9] Jumia Jobs Cameroun...');
  const url = 'https://www.jumia.cm/emplois/';
  const { data } = await http.get(url).catch(() => ({ data: '' }));
  if (!data) { console.log('   ⚠️ Site inaccessible, ignoré.'); return []; }
  const $ = cheerio.load(data);
  const jobs = [];

  $('article, .card, .job-item, .listing').each((i, el) => {
    const titleEl = $(el).find('h2 a, h3 a, .title a, .name').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://www.jumia.cm${href}`;

    const company = cleanText($(el).find('.company, .seller, .brand').text()) || 'Entreprise';
    const city = cleanText($(el).find('.location, .city').text()) || 'Cameroun';
    const priceText = cleanText($(el).find('.price, .salary').text());

    jobs.push({
      title, company, city,
      type: 'CDI',
      description: `Offre Jumia Jobs : ${title}.`,
      missions: ['Voir détails sur Jumia Jobs.'],
      profile: ['Compétences sur le site source.'],
      salary: extractSalary(priceText),
      sourceUrl,
      source: 'Jumia Jobs',
    });
  });
  return jobs;
}

// ─── 8. LinkedIn Cameroun ──────────────────────────────────
async function scrapeLinkedIn() {
  console.log('📡 [8/9] LinkedIn Cameroun...');
  // LinkedIn bloque le scraping direct ; on utilise Google comme proxy
  const query = encodeURIComponent('site:cm.linkedin.com/jobs emploi Cameroun');
  const url = `https://www.google.com/search?q=${query}&num=20`;
  const { data } = await http.get(url).catch(() => ({ data: '' }));
  if (!data) { console.log('   ⚠️ LinkedIn indirect inaccessible, ignoré.'); return []; }
  const $ = cheerio.load(data);
  const jobs = [];

  $('a[href*="linkedin.com/jobs"]').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const sourceUrl = href.startsWith('http') ? href.split('&')[0] : `https://${href.split('&')[0]}`;
    const title = cleanText($(el).find('h3').text() || $(el).text());
    if (!title || title.length < 10) return;

    const snippet = cleanText($(el).closest('div').find('.VwiC3b, .snippet, span').text());
    const company = cleanText(snippet.split('·')[0] || snippet.split('–')[0] || 'LinkedIn');

    jobs.push({
      title: title.replace(/^.*?\|/, '').replace(/^.*?·/, '').trim(),
      company: company || 'Entreprise (LinkedIn)',
      city: 'Cameroun',
      type: detectContractType(title, snippet),
      description: `Offre LinkedIn Cameroun : ${title}. Consultez le lien source pour postuler.`,
      missions: ['Voir la description complète sur LinkedIn.'],
      profile: ['Compétences disponibles sur LinkedIn.'],
      salary: extractSalary(snippet),
      sourceUrl,
      source: 'LinkedIn',
    });
  });
  return jobs;
}

// ─── 9. Indeed Cameroun ────────────────────────────────────
async function scrapeIndeed() {
  console.log('📡 [9/9] Indeed Cameroun...');
  const url = 'https://cm.indeed.com/jobs?q=&l=Cameroun';
  const { data } = await http.get(url).catch(() => ({ data: '' }));
  if (!data) { console.log('   ⚠️ Indeed inaccessible, ignoré.'); return []; }
  const $ = cheerio.load(data);
  const jobs = [];

  $('.job_seen_beacon, .jobsearch-ResultsList > li, .cardOutline, .jobCard').each((i, el) => {
    const titleEl = $(el).find('h2 a, .jobTitle a, a.jobTitle, .title a').first();
    const title = cleanText(titleEl.text());
    if (!title || title.length < 5) return;

    const href = titleEl.attr('href') || $(el).find('a[data-jk]').attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://cm.indeed.com${href}`;

    const company = cleanText($(el).find('.companyName, .company, [data-testid="company-name"]').text()) || 'Entreprise';
    const city = cleanText($(el).find('.companyLocation, .location').text()) || 'Cameroun';
    const salaryText = cleanText($(el).find('.salary-snippet, .salary, .attribute_snippet').text());
    const typeText = cleanText($(el).find('.attribute_snippet, .job-snippet').text());
    const desc = cleanText($(el).find('.job-snippet, .summary, .description').text());

    jobs.push({
      title, company, city,
      type: detectContractType(title, typeText),
      description: desc || `Offre Indeed Cameroun : ${title} chez ${company} à ${city}.`,
      missions: ['Consulter la description complète sur Indeed.'],
      profile: ['Compétences disponibles sur Indeed.'],
      salary: extractSalary(salaryText),
      sourceUrl,
      source: 'Indeed',
    });
  });
  return jobs;
}

// ═══════════════════════════════════════════════════════════
//  ORCHESTRATEUR
// ═══════════════════════════════════════════════════════════

const SCRAPERS = {
  minajobs:   scrapeMinaJobs,
  everjobs:   scrapeEverJobs,
  emploicm:   scrapeEmploiCm,
  akwajobs:   scrapeAkwaJobs,
  nkulunu:    scrapeNkulunu,
  camerspace: scrapeCamerSpace,
  jumia:      scrapeJumiaJobs,
  linkedin:   scrapeLinkedIn,
  indeed:     scrapeIndeed,
};

async function runAll() {
  console.log('🤖 CamerWork Multi-Scraper — Démarrage');
  console.log('═'.repeat(55));

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [name, fn] of Object.entries(SCRAPERS)) {
    try {
      const jobs = await fn();
      console.log(`   📋 ${jobs.length} offres trouvées sur ${name}`);

      for (const job of jobs) {
        const result = await saveJob(job);
        if (result.inserted) {
          console.log(`   ✅ Ajouté : ${job.title} (${job.company})`);
          totalInserted++;
        } else if (result.reason === 'doublon') {
          totalSkipped++;
        }
      }
    } catch (err) {
      console.error(`   ❌ Erreur ${name}: ${err.message}`);
    }

    // Pause entre les sites
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n═'.repeat(55));
  console.log(`🎉 Terminé ! ${totalInserted} offres ajoutées, ${totalSkipped} doublons ignorés.`);
  process.exit(0);
}

async function runOne(siteName) {
  const fn = SCRAPERS[siteName];
  if (!fn) {
    console.error(`❌ Site inconnu: ${siteName}`);
    console.log(`Sites disponibles: ${Object.keys(SCRAPERS).join(', ')}, all`);
    process.exit(1);
  }

  console.log(`🤖 CamerWork — Scraping ${siteName}`);
  const jobs = await fn();
  console.log(`📋 ${jobs.length} offres trouvées`);

  let inserted = 0;
  for (const job of jobs) {
    const result = await saveJob(job);
    if (result.inserted) {
      console.log(`✅ ${job.title} (${job.company})`);
      inserted++;
    }
  }

  console.log(`\n🎉 ${inserted}/${jobs.length} offres ajoutées.`);
  process.exit(0);
}

// ─── Entry Point ───────────────────────────────────────────
const arg = (process.argv[2] || 'all').toLowerCase();

if (arg === 'all') {
  runAll();
} else {
  runOne(arg);
}

import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Briefcase, Building2, Clock, User, ChevronDown, PlusCircle,
  Sparkles, SlidersHorizontal, X, ArrowUpDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { calculateMatchingScore } from '../firebase/matchingEngine';
import { useTranslation } from 'react-i18next';
import { useLang } from '../composants/LangContext';
import { AnimatedPage, StaggerContainer, StaggerItem } from '../composants/AnimatedPage';
import { SkeletonCard } from '../composants/SkeletonCard';
import { EmptyState } from '../composants/EmptyState';
import { FilterChip } from '../composants/FilterChip';
import { HamburgerMenu } from '../composants/HamburgerMenu';

// â”€â”€ Constantes de filtres â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CONTRACT_TYPES = ['Tous', 'CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel'];
const WORK_MODES = ['Tous', 'PrÃ©sentiel', 'Hybride', 'Remote'];
const EXPERIENCE_LEVELS = ['Tous', 'Junior', 'IntermÃ©diaire', 'Senior', 'Lead', 'Direction'];
const SORT_OPTIONS = [
  { value: 'matching', label: 'Pertinence' },
  { value: 'recent', label: 'Plus rÃ©cent' },
  { value: 'salary_asc', label: 'Salaire â†‘' },
  { value: 'salary_desc', label: 'Salaire â†“' },
];

// â”€â”€ Composant Carte d'Offre â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JobCard = ({ job, score, userRole, onClick, darkMode }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return "Ã€ l'instant";
    try {
      const date = timestamp.toDate();
      const diff = new Date() - date;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return "Aujourd'hui";
      return `Il y a ${days} j`;
    } catch (_e) {
      return 'RÃ©cemment';
    }
  };

  const getScoreBadgeStyle = (score) => {
    if (score >= 75)
      return 'bg-gradient-to-r from-cyan-500 to-yellow-500 text-white shadow-sm shadow-cyan-200 dark:shadow-gray-900/30 animate-pulse';
    if (score >= 40)
      return 'bg-sky-50 dark:bg-gray-700 text-sky-600 dark:text-gray-300 border border-sky-200 dark:border-gray-600';
    return 'bg-sky-50 dark:bg-gray-700 text-sky-500 dark:text-gray-400';
  };

  return (
    <div
      onClick={onClick}
      className={`p-6 rounded-2xl shadow-sm border hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between ${
        darkMode
          ? 'bg-slate-800 border-slate-700 hover:border-sky-500'
          : 'bg-white border-sky-100 hover:border-sky-200'
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="bg-sky-50 dark:bg-gray-700 p-3 rounded-xl group-hover:bg-cyan-600 transition-colors">
            <Building2 className="w-6 h-6 text-cyan-600 group-hover:text-white" />
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'candidate' && score > 0 && (
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1 ${getScoreBadgeStyle(score)}`}
              >
                <Sparkles size={10} /> {score}% Match
              </span>
            )}
            <span className="bg-sky-50 dark:bg-gray-700 text-sky-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {job.type || 'CDI'}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-sky-800 dark:text-gray-100 group-hover:text-sky-600 dark:group-hover:text-gray-300 transition-colors">
          {job.title}
        </h3>
        <p className="text-sky-500 dark:text-gray-400 text-sm mb-4 font-medium">{job.company}</p>
      </div>

      <div
        className={`flex items-center gap-4 text-xs border-t pt-4 mt-4 ${
          darkMode ? 'text-slate-400 border-slate-700' : 'text-sky-400'
        }`}
      >
        <div className="flex items-center gap-1 font-semibold text-sky-500 dark:text-gray-300">
          <MapPin className="w-3 h-3 text-sky-500 dark:text-gray-400" />
          {job.city}
        </div>
        {job.workMode && job.workMode !== 'PrÃ©sentiel' && (
          <span className="bg-accent-400/10 text-accent-600 dark:text-accent-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {job.workMode}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" />
          {formatDate(job.createdAt)}
        </div>
      </div>
    </div>
  );
};

// â”€â”€ Page Principale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function JobList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useLang();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);

  // Filtres avancÃ©s
  const [showFilters, setShowFilters] = useState(false);
  const [contractType, setContractType] = useState('Tous');
  const [workMode, setWorkMode] = useState('Tous');
  const [experienceLevel, setExperienceLevel] = useState('Tous');
  const [sortBy, setSortBy] = useState('matching');

  const CAMEROON_CITIES = [
    'Toutes les villes',
    'Douala',
    'YaoundÃ©',
    'Garoua',
    'Maroua',
    'Bafoussam',
    'Bamenda',
    'NgaoundÃ©rÃ©',
    'Nkongsamba',
    'Kribi',
    'Limbe',
  ];

  const activeFilterCount = [
    contractType !== 'Tous',
    workMode !== 'Tous',
    experienceLevel !== 'Tous',
    locationQuery && locationQuery !== 'Toutes les villes',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setContractType('Tous');
    setWorkMode('Tous');
    setExperienceLevel('Tous');
    setSortBy('matching');
  };

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobsData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(job => job.status !== 'pending_moderation' && job.status !== 'draft');
        setJobs(jobsData);
        setLoading(false);
      },
      (error) => {
        console.error('Erreur Firestore:', error);
        setLoading(false);
      }
    );

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          if (userData.role === 'candidate') {
            setCandidateProfile({
              skills: userData.skills || [],
              location: userData.location || '',
            });
          }
        }
      } else {
        setUserRole(null);
        setCandidateProfile(null);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, []);

  // â”€â”€ Pipeline de filtrage + scoring + tri â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const processedJobs = jobs
    .map((job) => {
      const score =
        userRole === 'candidate' ? calculateMatchingScore(candidateProfile, job) : 0;
      return { ...job, matchingScore: score };
    })
    .filter((job) => {
      const title = job.title?.toLowerCase() || '';
      const company = job.company?.toLowerCase() || '';
      const city = job.city?.toLowerCase() || '';
      const type = job.type?.toLowerCase() || '';

      const matchesSearch =
        title.includes(searchQuery.toLowerCase()) ||
        company.includes(searchQuery.toLowerCase());
      const matchesLocation =
        !locationQuery ||
        locationQuery === 'Toutes les villes' ||
        city === locationQuery.toLowerCase();
      const matchesContract =
        contractType === 'Tous' || type === contractType.toLowerCase();
      const matchesWorkMode =
        workMode === 'Tous' ||
        (job.workMode || 'PrÃ©sentiel').toLowerCase() === workMode.toLowerCase();
      const matchesExperience =
        experienceLevel === 'Tous' ||
        (job.experienceLevel || '').toLowerCase() === experienceLevel.toLowerCase();

      return (
        matchesSearch &&
        matchesLocation &&
        matchesContract &&
        matchesWorkMode &&
        matchesExperience
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
        case 'salary_asc':
        case 'salary_desc':
          // Extraction du premier nombre dans le salaire
          const getSalary = (s) => {
            const match = s?.match(/(\d+)\s*k/);
            return match ? parseInt(match[1]) * 1000 : 0;
          };
          const aSal = getSalary(a.salary);
          const bSal = getSalary(b.salary);
          return sortBy === 'salary_asc' ? aSal - bSal : bSal - aSal;
        case 'matching':
        default:
          return b.matchingScore - a.matchingScore;
      }
    });

  // â”€â”€ Rendu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <AnimatedPage>
      <div
          className={`min-h-screen font-sans pb-28 overflow-x-hidden ${
          darkMode
            ? 'bg-slate-900 text-slate-200'
            : 'bg-sky-50 text-sky-800 dark:text-gray-100'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-sky-900 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-8 h-8 bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer">
                  <span className="font-black text-sm tracking-tighter text-white leading-none">
                    CW
                  </span>
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full shadow-sm" />
                </div>
                <span className="uppercase tracking-widest text-[10px] font-black text-sky-200">
                  {t('common.platform_tag')}
                </span>
              </div>
              <HamburgerMenu />
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight max-w-full break-words">
              {t('jobList.hero_title1')} <span className="text-cyan-400">{t('jobList.hero_title2')}</span>
            </h1>

            {/* Barre de recherche */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl dark:shadow-gray-900/30 p-2 md:p-3 mt-6 sm:mt-8 border border-white/20">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-[1.5] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('jobList.search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-sky-50 dark:bg-gray-700 border-none rounded-2xl text-sky-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium"
                  />
                </div>

                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 dark:text-gray-400 z-10" />
                  <select
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 bg-sky-50 dark:bg-gray-700 border-none rounded-2xl text-sky-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    {CAMEROON_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 dark:text-gray-400 pointer-events-none" />
                </div>

                {/* Bouton filtres avancÃ©s */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`relative flex items-center gap-2 px-5 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                    showFilters
                      ? 'bg-brand-600 text-white'
                      : 'bg-sky-50 dark:bg-gray-700 text-sky-600 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <SlidersHorizontal size={18} />
                  <span className="hidden md:inline">{t('common.filters')}</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cyan-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Panneau de filtres avancÃ©s */}
              {showFilters && (
                <div className="mt-3 pt-3 border-t border-sky-100 dark:border-gray-700 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Type de contrat */}
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400 dark:text-gray-400 mb-2">
                        {t('jobList.contract_filter')}
                      </label>
                       <select
                         value={contractType}
                        onChange={(e) => setContractType(e.target.value)}
                        className="w-full px-3 py-2.5 bg-sky-50 dark:bg-gray-700 rounded-xl text-sm text-sky-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                      >
                        {CONTRACT_TYPES.map((ct) => (
                          <option key={ct} value={ct}>
                            {ct}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mode de travail */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400 dark:text-gray-400 mb-2">
                        {t('jobList.work_mode_filter')}
                      </label>
                      <select
                        value={workMode}
                        onChange={(e) => setWorkMode(e.target.value)}
                        className="w-full px-3 py-2.5 bg-sky-50 dark:bg-gray-700 rounded-xl text-sm text-sky-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                      >
                        {WORK_MODES.map((wm) => (
                          <option key={wm} value={wm}>
                            {wm}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Niveau d'expÃ©rience */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400 dark:text-gray-400 mb-2">
                        {t('jobList.experience_filter')}
                      </label>
                      <select
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-sky-50 dark:bg-gray-700 rounded-xl text-sm text-sky-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                      >
                        {EXPERIENCE_LEVELS.map((el) => (
                          <option key={el} value={el}>
                            {el}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tri */}
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-sky-400 dark:text-gray-400 mb-2">
                        {t('jobList.sort_by')}
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2.5 bg-sky-50 dark:bg-gray-700 rounded-xl text-sm text-sky-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
                      >
                        {SORT_OPTIONS.map((opt) => {
                          const sortLabels = {
                            matching: t('jobList.sort_relevance'),
                            recent: t('jobList.sort_recent'),
                            salary_asc: t('jobList.sort_salary_asc'),
                            salary_desc: t('jobList.sort_salary_desc'),
                          };
                          return (
                            <option key={opt.value} value={opt.value}>
                              {sortLabels[opt.value] || opt.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Chips de filtres actifs + reset */}
                  {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {contractType !== 'Tous' && (
                        <FilterChip
                          label={contractType}
                          onRemove={() => setContractType('Tous')}
                          darkMode={darkMode}
                        />
                      )}
                      {workMode !== 'Tous' && (
                        <FilterChip
                          label={workMode}
                          onRemove={() => setWorkMode('Tous')}
                          darkMode={darkMode}
                        />
                      )}
                      {experienceLevel !== 'Tous' && (
                        <FilterChip
                          label={experienceLevel}
                          onRemove={() => setExperienceLevel('Tous')}
                          darkMode={darkMode}
                        />
                      )}
                      <button
                        onClick={resetFilters}
                        className="text-[10px] font-bold text-error-500 hover:text-error-600 dark:text-red-400 dark:hover:text-red-300 ml-auto"
                      >
                        RÃ©initialiser
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Liste des offres */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-sky-800 dark:text-gray-100 flex items-center gap-3">
              {t('jobList.available_offers')}
              <span className="bg-cyan-600 text-white text-xs px-3 py-1 rounded-full">
                {processedJobs.length}
              </span>
            </h2>
            {sortBy !== 'matching' && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 dark:text-gray-400">
                <ArrowUpDown size={14} />
                {(() => { const sortLabels = { matching: t('jobList.sort_relevance'), recent: t('jobList.sort_recent'), salary_asc: t('jobList.sort_salary_asc'), salary_desc: t('jobList.sort_salary_desc') }; return sortLabels[sortBy] || sortBy; })()}
              </div>
            )}
          </div>

          {loading ? (
            <SkeletonCard variant="card" count={6} />
          ) : processedJobs.length > 0 ? (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedJobs.map((job) => (
                <StaggerItem key={job.id}>
                  <JobCard
                    job={job}
                    score={job.matchingScore}
                    userRole={userRole}
                    darkMode={darkMode}
                    onClick={() => navigate(`/offres/${job.id}`)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <EmptyState
              icon={Briefcase}
              title={t('jobList.no_offers')}
              description={t('jobList.no_offers_desc')}
              darkMode={darkMode}
              action={
                <button
                  onClick={resetFilters}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all active:scale-95"
                >
                  {t('common.reset_filters')}
                </button>
              }
            />
          )}
        </div>

        {/* Navigation Basse */}
        <div
          className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t px-6 py-4 z-50 flex justify-around ${
            darkMode
              ? 'bg-slate-800/95 border-slate-700'
              : 'bg-white/90 border-sky-200'
          } shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}
        >
          <button
            onClick={() => navigate('/offres')}
            className="flex flex-col items-center gap-1 text-cyan-600 transition-transform active:scale-90"
          >
            <Briefcase size={24} />
            <span className="text-[10px] font-black uppercase">{t('jobList.nav_offers')}</span>
          </button>

          {userRole === 'recruiter' ? (
            <>
              <button
                onClick={() => navigate('/DashboardRecruiter')}
                className="flex flex-col items-center gap-1 text-sky-400 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all active:scale-90"
              >
                <Building2 size={24} />
                <span className="text-[10px] font-black uppercase">{t('jobList.nav_space')}</span>
              </button>
              <button
                onClick={() => navigate('/RecruiterPost')}
                className="flex flex-col items-center gap-1 text-sky-400 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all active:scale-90"
              >
                <PlusCircle size={24} />
                <span className="text-[10px] font-black uppercase">{t('jobList.nav_publish')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/profil')}
              className="flex flex-col items-center gap-1 text-sky-400 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all active:scale-90"
            >
              <User size={24} />
              <span className="text-[10px] font-black uppercase">{t('jobList.nav_profile')}</span>
            </button>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}

export default JobList;
/**
 * Module 2 — Suivi de Carrière & To-Do List d'Apprentissage
 * Analyse les écarts de compétences entre le profil candidat et les offres postulées.
 * Affiche des ressources d'apprentissage ciblées pour chaque lacune.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getMissingSkills } from '../firebase/matchingEngine';
import { getResourcesForSkill } from '../data/interviewQuestions';
import { Target, BookOpen, Briefcase, Clock, CheckCircle2, XCircle, ExternalLink, TrendingUp, ChevronDown, ChevronUp, Lightbulb, ArrowLeft } from 'lucide-react';

export function CandidateDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobsCache, setJobsCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/login'); return; }

    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setCandidate({ id: snap.id, ...snap.data() });
    });

    const q = query(
      collection(db, 'applications'),
      where('candidateId', '==', user.uid),
      orderBy('appliedAt', 'desc')
    );
    const unsub = onSnapshot(q, async (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(apps);
      const cache = { ...jobsCache };
      for (const app of apps) {
        if (app.jobId && !cache[app.jobId]) {
          const jobSnap = await getDoc(doc(db, 'jobs', app.jobId));
          if (jobSnap.exists()) cache[app.jobId] = { id: jobSnap.id, ...jobSnap.data() };
        }
      }
      setJobsCache(cache);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sky-500 dark:text-gray-300 font-medium text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  const candidateSkills = candidate?.skills || [];

  const allMissingMap = {};
  applications.forEach(app => {
    const job = jobsCache[app.jobId];
    if (job?.profile) {
      const missing = getMissingSkills(candidateSkills, job.profile);
      missing.forEach(skill => { allMissingMap[skill] = (allMissingMap[skill] || 0) + 1; });
    }
  });
  const uniqueMissing = Object.entries(allMissingMap)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => ({ skill, count, resources: getResourcesForSkill(skill) }));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted': case 'retenu': return 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'rejected': case 'refusé': return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'accepted' || status === 'retenu') return t('candidateDashboard.accepted_status');
    if (status === 'rejected' || status === 'refusé') return t('candidateDashboard.rejected_status');
    return t('candidateDashboard.pending_status');
  };

  const acceptedCount = applications.filter(a => a.status === 'accepted' || a.status === 'retenu').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected' || a.status === 'refusé').length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  const interviewScheduled = applications.filter(a => a.status === 'accepted' || a.status === 'retenu').length > 0;

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-900 to-cyan-900 dark:from-gray-800 dark:to-gray-900 text-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-sky-300 dark:text-gray-300 hover:text-white text-sm font-bold flex items-center gap-1.5 mb-4">
            <ArrowLeft size={16} /> {t('candidateDashboard.back')}
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('candidateDashboard.title')}</h1>
              <p className="text-sky-300 dark:text-gray-400 text-sm mt-1">
                {candidate?.displayName || candidate?.name || 'Candidat'} — {applications.length} candidature{applications.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Mini-stats */}
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                <p className="text-2xl font-black">{pendingCount}</p>
                <p className="text-[10px] text-sky-300 dark:text-gray-400 uppercase font-bold">{t('candidateDashboard.pending')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                <p className="text-2xl font-black text-teal-400">{acceptedCount}</p>
                <p className="text-[10px] text-sky-300 dark:text-gray-400 uppercase font-bold">{t('candidateDashboard.accepted')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                <p className="text-2xl font-black text-red-400">{rejectedCount}</p>
                <p className="text-[10px] text-sky-300 dark:text-gray-400 uppercase font-bold">{t('candidateDashboard.rejected')}</p>
              </div>
            </div>
          </div>

          {interviewScheduled && (
            <div className="mt-4 bg-teal-500/20 border border-teal-400/30 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
              <CheckCircle2 size={18} className="text-teal-400 shrink-0" />
              <span className="font-bold">{t('candidateDashboard.congrats_interview')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* SECTION 1 : Plan d'apprentissage */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-6">
          <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-cyan-500" /> {t('candidateDashboard.learning_plan')} ({uniqueMissing.length})
          </h2>
          {uniqueMissing.length === 0 ? (
            <div className="text-center py-8">
              <Target size={40} className="mx-auto mb-2 text-sky-300 dark:text-gray-500" />
              <p className="text-sky-500 dark:text-gray-400 text-sm">{t('candidateDashboard.learning_empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {uniqueMissing.slice(0, 5).map(({ skill, count, resources }) => (
                <details key={skill} className="group">
                  <summary className="flex items-center justify-between cursor-pointer p-3 bg-sky-50 dark:bg-gray-700 rounded-xl hover:bg-sky-100 dark:hover:bg-gray-600 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" />
                      <span className="text-sm font-bold text-sky-800 dark:text-gray-100">{skill}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-sky-400 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        Demandé {count}×
                      </span>
                      <ChevronDown size={14} className="text-sky-400 dark:text-gray-400 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="mt-2 ml-6 space-y-2">
                    {resources && resources.length > 0 ? (
                      resources.map((r, i) => (
                        <a
                          key={i}
                          href={r.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-xl p-3 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-sky-700 dark:text-gray-200">{r.title || 'Ressource'}</p>
                              <p className="text-[10px] text-sky-400 dark:text-gray-400 mt-0.5">{r.source || ''} · {r.type || ''}</p>
                            </div>
                            <ExternalLink size={12} className="text-sky-400 dark:text-gray-500 shrink-0 mt-1" />
                          </div>
                        </a>
                      ))
                    ) : (
                      <p className="text-xs text-sky-400 dark:text-gray-500 italic">
                        Recherchez des tutoriels sur {skill} sur OpenClassrooms, YouTube ou Udemy.
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2 : Candidatures */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30 p-6">
          <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-cyan-500" /> {t('candidateDashboard.my_applications')} ({applications.length})
          </h2>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase size={40} className="mx-auto mb-2 text-sky-300 dark:text-gray-500" />
              <p className="text-sky-500 dark:text-gray-400 text-sm">{t('candidateDashboard.no_applications')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => {
                const job = jobsCache[app.jobId];
                const missing = job?.profile ? getMissingSkills(candidateSkills, job.profile) : [];
                const isExpanded = expandedApp === app.id;
                return (
                  <div key={app.id} className="border border-sky-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sky-800 dark:text-gray-100 text-sm truncate">{job?.title || app.jobTitle || 'Offre'}</h3>
                        <p className="text-xs text-sky-500 dark:text-gray-400">{job?.company || app.company || ''}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getStatusBadge(app.status)}`}>
                          {getStatusLabel(app.status)}
                        </span>
                        {missing.length > 0 && (
                          <button onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                            className="text-xs font-bold text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center gap-1">
                            {t('candidateDashboard.lacunes')} ({missing.length})
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && missing.length > 0 && (
                      <div className="border-t border-sky-100 dark:border-gray-700 bg-gradient-to-r from-amber-50 dark:from-amber-900/20 to-sky-50 dark:to-gray-800 p-4 space-y-3">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                            <Lightbulb size={14} className="text-amber-500" /> {t('candidateDashboard.coaching_advice')}
                          </p>
                          <p className="text-xs text-sky-600 dark:text-gray-300 leading-relaxed">
                            {t('candidateDashboard.coaching_text')}
                            <strong className="text-sky-800 dark:text-gray-100">{missing.slice(0, 2).join(', ')}</strong>
                            {missing.length > 2 && <> et <strong className="text-sky-800 dark:text-gray-100">{missing.length - 2} autre{missing.length - 2 > 1 ? 's' : ''} compétence{missing.length - 2 > 1 ? 's' : ''}</strong></>}
                            {t('candidateDashboard.coaching_text2')}
                          </p>
                          <button
                            onClick={() => navigate('/mon-profil')}
                            className="mt-2 flex items-center gap-1 text-xs font-bold text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300"
                          >
                            <ExternalLink size={12} /> {t('candidateDashboard.optimize_profile')}
                          </button>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                          <h3 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase mb-3">
                            {t('candidateDashboard.resources_title')}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {missing.slice(0, 4).map((skill, i) => {
                              const resources = getResourcesForSkill(skill);
                              return (
                                <div key={i}
                                  className="bg-white dark:bg-gray-800 border border-amber-100 dark:border-amber-800 rounded-xl p-3"
                                >
                                  <p className="text-xs font-bold text-sky-700 dark:text-gray-200 mb-2">{skill}</p>
                                  {resources && resources.length > 0 ? (
                                    resources.slice(0, 2).map((r, j) => (
                                      <a key={j}
                                        href={r.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-sky-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 underline block truncate"
                                      >
                                        {r.title || 'Ressource'}
                                      </a>
                                    ))
                                  ) : (
                                    <p className="text-xs text-sky-400 italic">{t('candidateDashboard.search_online')}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
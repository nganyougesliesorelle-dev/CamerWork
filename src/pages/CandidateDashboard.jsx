/**
 * Module 2 — Suivi de Carrière & To-Do List d'Apprentissage
 * Analyse les écarts de compétences entre le profil candidat et les offres postulées.
 * Affiche des ressources d'apprentissage ciblées pour chaque lacune.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getMissingSkills } from '../firebase/matchingEngine';
import { getResourcesForSkill } from '../data/interviewQuestions';
import { Target, BookOpen, Briefcase, Clock, CheckCircle2, XCircle, ExternalLink, TrendingUp, ChevronDown, ChevronUp, Lightbulb, ArrowLeft } from 'lucide-react';

export function CandidateDashboard() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobsCache, setJobsCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/login'); return; }

    // Charger le profil candidat
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setCandidate({ id: snap.id, ...snap.data() });
    });

    // Écouter les candidatures en temps réel
    const q = query(
      collection(db, 'applications'),
      where('candidateId', '==', user.uid),
      orderBy('appliedAt', 'desc')
    );
    const unsub = onSnapshot(q, async (snapshot) => {
      const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(apps);
      // Charger les offres correspondantes
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
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const candidateSkills = candidate?.skills || [];

  // Compétences manquantes uniques sur toutes les candidatures
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
      case 'accepted': case 'retenu': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'rejected': case 'refusé': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-sky-50 text-sky-600 border-sky-200';
    }
  };
  const getStatusLabel = (status) => {
    switch (status) {
      case 'accepted': case 'retenu': return 'Acceptée';
      case 'rejected': case 'refusé': return 'Non retenue';
      default: return 'En attente';
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans antialiased pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sky-300 hover:text-white font-bold text-sm">
            <ArrowLeft size={18} /> Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Target size={24} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Suivi de Carrière</h1>
              <p className="text-sky-300 text-sm">{candidate?.fullName || candidate?.displayName || 'Candidat'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-6">

        {/* ─── SECTION 1 : TO-DO LIST COMPÉTENCES ─── */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-cyan-500" /> Compétences à acquérir
          </h2>
          {uniqueMissing.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="mx-auto mb-2 text-teal-400" />
              <p className="text-sky-600 font-bold text-sm">🎉 Aucune lacune détectée !</p>
              <p className="text-sky-400 text-xs mt-1">Votre profil correspond parfaitement aux offres postulées.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uniqueMissing.map(({ skill, count, resources }) => (
                <div key={skill} className="border border-sky-100 rounded-2xl p-4 hover:border-cyan-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-sky-800 text-sm">{skill}</span>
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-50 px-2 py-0.5 rounded-full">
                      Demandé {count}x
                    </span>
                  </div>
                  <div className="space-y-2">
                    {resources.slice(0, 3).map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-sky-600 hover:text-cyan-600 bg-sky-50 hover:bg-cyan-50 p-2.5 rounded-xl transition-all group">
                        <BookOpen size={14} className="shrink-0 text-sky-400 group-hover:text-cyan-500" />
                        <span className="flex-1 truncate">{r.title}</span>
                        <span className="text-[10px] font-bold text-sky-400 bg-white px-1.5 py-0.5 rounded shrink-0">{r.type}</span>
                        <ExternalLink size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── SECTION 2 : CANDIDATURES ─── */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-cyan-500" /> Mes candidatures ({applications.length})
          </h2>
          {applications.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase size={40} className="mx-auto mb-2 text-sky-300" />
              <p className="text-sky-500 text-sm">Aucune candidature pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => {
                const job = jobsCache[app.jobId];
                const missing = job?.profile ? getMissingSkills(candidateSkills, job.profile) : [];
                const isExpanded = expandedApp === app.id;
                return (
                  <div key={app.id} className="border border-sky-100 rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sky-800 text-sm truncate">{job?.title || app.jobTitle || 'Offre'}</h3>
                        <p className="text-xs text-sky-500">{job?.company || app.company || ''}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${getStatusBadge(app.status)}`}>
                          {getStatusLabel(app.status)}
                        </span>
                        {missing.length > 0 && (
                          <button onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                            className="text-xs font-bold text-cyan-500 hover:text-cyan-600 flex items-center gap-1">
                            Lacunes ({missing.length})
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && missing.length > 0 && (
                      <div className="border-t border-sky-50 bg-sky-50/50 p-4">
                        <p className="text-xs font-bold text-sky-600 mb-2 flex items-center gap-1">
                          <TrendingUp size={12} /> Compétences à travailler :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {missing.map(skill => (
                            <span key={skill} className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                              {skill}
                            </span>
                          ))}
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

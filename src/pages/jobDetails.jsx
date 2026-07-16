import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Building, CheckCircle, XCircle, DollarSign, Briefcase, UserCheck, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'; 

// Import de la fonction de service que nous avons centralisée
import { applyToJob, cancelApplication } from '../firebase/authService'; 
import { AnimatedPage } from '../composants/AnimatedPage';
import { FavoriteButton } from '../composants/FavoriteButton';
import { ReportButton } from '../security/ReportButton';

const getTypeColor = (type) => {
  const t = type?.toLowerCase();
  if (t === 'cdi') return 'bg-teal-100 text-teal-700 border-teal-200';
  if (t === 'cdd') return 'bg-sky-100 text-sky-700 border-sky-200';
  if (t === 'stage') return 'bg-sky-100 text-sky-600 border-sky-200';
  return 'bg-sky-100 text-sky-700 border-sky-200';
};

export function JobDetails() {
  const { t } = useTranslation();
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // États pour le module de coaching intelligent
  const [missingSkills, setMissingSkills] = useState([]);
  const [checkingSkills, setCheckingSkills] = useState(false);

  useEffect(() => {
    const fetchJobAndStatus = async () => {
      try {
        // 1. Récupérer l'offre
        const docRef = doc(db, "jobs", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const jobData = { id: docSnap.id, ...docSnap.data() };
          setJob(jobData);

          // 2. Vérifier si l'utilisateur a déjà postulé et son rôle
          const user = auth.currentUser;
          if (user) {
            // Récupérer le rôle via la collection users
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              setUserRole(userData.role);
              
              // --- LOGIQUE DU COACH : ANALYSE DES COMPÉTENCES ---
              if (userData.role !== 'recruiter' && jobData.profile) {
                setCheckingSkills(true);
                // On récupère les compétences de l'étudiant (tableau nettoyé en minuscules)
                const userSkills = Array.isArray(userData.skills) 
                  ? userData.skills.map(s => s.toLowerCase().trim()) 
                  : [];
                
                // Moteur de matching basique : on scanne le profil requis à la recherche de mots clés
                const detectedMissing = [];
                jobData.profile.forEach(reqText => {
                  const reqLower = reqText.toLowerCase();
                  
                  // Liste de compétences types à détecter (extensible selon tes besoins)
                  const technicalSkillsPool = ['react', 'spring boot', 'node', 'express', 'firebase', 'tailwind', 'sql', 'postgis', 'git', 'figma', 'canva', 'java', 'javascript', 'python', 'php', 'flutter'];
                  
                  technicalSkillsPool.forEach(skill => {
                    if (reqLower.includes(skill) && !userSkills.includes(skill)) {
                      if (!detectedMissing.includes(skill)) {
                        detectedMissing.push(skill);
                      }
                    }
                  });
                });
                
                setMissingSkills(detectedMissing);
                setCheckingSkills(false);
              }
            }

            // Vérifier si une candidature existe déjà
            const q = query(
              collection(db, "applications"), 
              where("jobId", "==", id), 
              where("candidateId", "==", user.uid)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) setHasApplied(true);
          }
        } else {
          toast.error(t('jobs.not_found'));
          navigate('/offres');
        }
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobAndStatus();
  }, [id, navigate]);

  const handleApply = async () => {
    if (job?.isScraped && job?.sourceUrl) {
      toast.info(t('jobs.redirecting_partner'));
      window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
      return; 
    }

    const user = auth.currentUser;
    
    if (!user) {
      toast.error(t('jobs.login_required'), { description: t('jobs.login_to_apply') });
      return;
    }

    if (userRole === 'recruiter') {
      toast.error(t('jobs.action_impossible'), { description: t('jobs.recruiter_cannot_apply') });
      return;
    }

    try {
      const result = await applyToJob(job, user);

      if (result.success) {
        setHasApplied(true);
        toast.success(t('notifications.success_application'), {
          description: `${t('common.at')} ${job?.company}`,
        });

        const userSnap = await getDoc(doc(db, "users", user.uid));
        const candidateName = userSnap.exists() ? userSnap.data().name : "Un candidat";

        if (job?.recruiterId) {
          await addDoc(collection(db, "notifications"), {
            userId: job.recruiterId,
            title: "Nouvelle candidature !",
            message: `${candidateName} a postulé pour le poste de : ${job.title}.`,
            type: "application",
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (_error) {
      toast.error(t('common.error'), { description: t('jobs.application_error') });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
      <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!job) return null;

  return (
    <AnimatedPage>
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 pb-28 overflow-x-hidden">
      {/* Header / Banner */}
      <div className="bg-sky-900 h-40 sm:h-56 w-full p-3 sm:p-6 flex items-start justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="max-w-4xl w-full flex justify-between items-center relative z-10">
            <button onClick={() => navigate(-1)} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md transition-all">
                <ArrowLeft size={20} />
            </button>
            <span className="text-white/40 font-black text-xs uppercase tracking-[0.3em]">{t('jobDetails.header_tag')}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 -mt-20 sm:-mt-24 relative z-20">
        {/* ── CARTE PRINCIPALE ── */}
        <div className="bg-white dark:bg-gray-800 rounded-[1rem] sm:rounded-[2rem] shadow-2xl shadow-sky-800/10 dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-4 sm:p-6 md:p-10 mb-6 sm:mb-8 relative">

          {/* Bouton favori en haut à droite */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
            <FavoriteButton job={job} userId={auth.currentUser?.uid} role={userRole} size="md" />
          </div>

          {/* ── 1. ENTREPRISE ── */}
          <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 pr-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-xl shrink-0 shadow-md shadow-sky-500/20">
              {(job.company || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-black text-sky-800 dark:text-gray-100 leading-tight truncate">
                {job.company}
              </p>
              <p className="text-xs text-sky-400 dark:text-gray-400 font-medium mt-0.5">
                {job.isScraped ? 'Source : MinaJobs' : t('common.verified')}
              </p>
            </div>
            <ReportButton
              targetId={job.id}
              targetType="job"
              recruiterId={job.recruiterId}
              variant="icon"
              className="ml-auto shrink-0"
            />
          </div>

          {/* ── 2. TITRE DU POSTE ── */}
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-sky-900 dark:text-gray-100 leading-snug mb-4 sm:mb-5 uppercase tracking-tight break-words max-w-full">
            {job.title}
          </h1>

          {/* ── 3. MÉTA (type, ville, salaire) ── */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <span className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase border ${getTypeColor(job.type)}`}>
              {job.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-sky-500 dark:text-gray-300 bg-sky-50 dark:bg-gray-700 px-3 py-1 rounded-full">
              <MapPin size={13} /> {job.city}
            </span>
            {job.salary && (
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1 rounded-full">
                <DollarSign size={13} /> {job.salary}
              </span>
            )}
            {job.isScraped && (
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                {t('common.partner')}
              </span>
            )}
          </div>

          {/* --- MODULE INTEGRÉ : ENCADRÉ COACH CAMERWORK --- */}
          {!checkingSkills && missingSkills.length > 0 && !hasApplied && userRole !== 'recruiter' && (
            <div className="mb-6 sm:mb-8 bg-gradient-to-br from-sky-900 to-blue-950 dark:from-gray-800 dark:to-gray-900 rounded-[1rem] sm:rounded-[1.5rem] p-4 sm:p-5 md:p-6 text-white shadow-lg dark:shadow-gray-900/30 relative overflow-hidden border border-sky-800 dark:border-gray-700">
              <div className="absolute right-2 top-2 opacity-10 text-white font-black text-8xl select-none">AI</div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5 relative z-10">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-[10px] sm:text-xs font-black uppercase tracking-wider">
                    <Sparkles size={16} /> {t('jobDetails.coach_title')}
                  </div>
                  <h3 className="text-base sm:text-lg font-black leading-tight tracking-tight uppercase">
                    {t('jobDetails.coach_subtitle')}
                  </h3>
                  <p className="text-sky-300 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                    {t('jobDetails.coach_body')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {missingSkills.map((skill, index) => (
                      <span key={index} className="px-2.5 py-1 bg-white/10 text-amber-300 rounded-lg text-[10px] sm:text-xs font-black uppercase border border-white/5">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/mon-profil')} 
                  className="bg-cyan-500 hover:bg-cyan-600 text-sky-900 text-xs font-black uppercase px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 self-start sm:self-center shadow-lg shadow-cyan-500/20 active:scale-95 transition-all w-full sm:w-auto shrink-0"
                >
                  {t('jobDetails.coach_cta')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── GRILLE DESCRIPTION / PROFIL ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 border-t border-sky-100 dark:border-gray-700 pt-5 sm:pt-8">
            {/* Left: Description & Missions */}
            <div className="space-y-6 sm:space-y-8">
                <div>
                    <h2 className="text-[10px] sm:text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                      <Briefcase size={14} className="text-cyan-500" /> {t('jobDetails.description')}
                    </h2>
                    <p className="text-sky-600 dark:text-gray-300 leading-relaxed font-medium text-sm sm:text-base whitespace-pre-line">
                      {job.description || "Consultez les missions pour plus de détails sur le poste."}
                    </p>
                </div>

                <div>
                    <h2 className="text-[10px] sm:text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                      <CheckCircle size={14} className="text-cyan-500" /> {t('jobDetails.missions')}
                    </h2>
                    <ul className="space-y-2.5 sm:space-y-3">
                        {job.missions?.map((m, i) => (
                            <li key={i} className="flex gap-3 p-3 sm:p-4 bg-sky-50 dark:bg-gray-700 rounded-xl sm:rounded-2xl text-sky-700 dark:text-gray-300 font-semibold text-xs sm:text-sm">
                              <span className="text-cyan-500 font-black shrink-0">{i+1}.</span>
                              <span>{m}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Right: Profile Required */}
            <div>
                <div className="bg-gradient-to-br from-sky-800 to-sky-950 dark:from-gray-800 dark:to-gray-900 rounded-[1rem] sm:rounded-[1.5rem] p-4 sm:p-6 text-white shadow-inner shadow-white/5">
                    <h2 className="text-[10px] sm:text-xs font-black text-sky-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={14} className="text-cyan-400" /> {t('jobDetails.profile_required')}
                    </h2>
                    <ul className="space-y-4">
                        {job.profile?.map((p, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></div>
                                <span className="text-sky-100 leading-relaxed">{p}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-2 sm:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-full sm:max-w-lg px-2 sm:px-4 z-50">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white dark:border-gray-700 shadow-2xl dark:shadow-gray-900/30 p-2.5 sm:p-3 rounded-[1rem] sm:rounded-[2rem] flex items-center gap-1.5 sm:gap-3">
          {hasApplied && !job.isScraped ? (
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 py-4 rounded-2xl font-black flex items-center justify-center gap-3 text-sm">
                <UserCheck size={20} /> {t('common.application_sent')}
              </div>
              <button
                onClick={async () => {
                  if (window.confirm("Annuler cette candidature ?")) {
                    const result = await cancelApplication(job.id, auth.currentUser.uid);
                    if (result.success) {
                      setHasApplied(false);
                      toast.success(t('notifications.success_cancelled'));
                    } else {
                      toast.error(result.error || t('common.error'));
                    }
                  }
                }}
                className="p-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs hover:bg-red-100 transition-all shrink-0"
                title="Annuler ma candidature"
              >
                <XCircle size={20} />
              </button>
            </div>
          ) : userRole === 'recruiter' ? (
            <div className="w-full bg-sky-100 dark:bg-gray-700 text-sky-400 dark:text-gray-400 py-4 rounded-2xl font-black text-center text-sm uppercase">
                {t('common.recruiter_readonly')}
            </div>
          ) : (
            <button
                onClick={handleApply}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  job.isScraped 
                    ? "bg-cyan-500 text-white shadow-cyan-200 hover:bg-cyan-600" 
                    : "bg-sky-600 text-white shadow-sky-200 hover:bg-sky-700"
                }`}
            >
                {job.isScraped ? (
                  <>
                    {t('jobDetails.apply_partner')} <ExternalLink size={18} />
                  </>
                ) : (
                  t('jobDetails.apply_button')
                )}
            </button>
          )}
        </div>
      </div>
    </div>
    </AnimatedPage>
  );
}
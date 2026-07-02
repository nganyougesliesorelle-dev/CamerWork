import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Building, CheckCircle, DollarSign, Briefcase, UserCheck, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'; 

// Import de la fonction de service que nous avons centralisée
import { applyToJob, cancelApplication } from '../firebase/authService'; 

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
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!job) return null;

  return (
    <div className="min-h-screen bg-sky-50 pb-32">
      {/* Header / Banner */}
      <div className="bg-sky-900 h-64 w-full p-8 flex items-start justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="max-w-4xl w-full flex justify-between items-center relative z-10">
            <button onClick={() => navigate(-1)} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md transition-all">
                <ArrowLeft size={20} />
            </button>
            <span className="text-white/40 font-black text-xs uppercase tracking-[0.3em]">CamerWork Details</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-20">
        {/* Main Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-sky-800/10 border border-sky-100 p-8 md:p-12 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getTypeColor(job.type)}`}>
                        {job.type}
                    </span>
                    <span className="flex items-center gap-1 text-sky-400 text-[10px] font-black uppercase">
                        <MapPin size={12} /> {job.city}
                    </span>
                    {job.isScraped && (
                      <span className="px-3 py-1 bg-sky-50 border border-sky-100 text-cyan-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Partenaire Externe
                      </span>
                    )}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-sky-900 leading-none mb-4 uppercase tracking-tighter">
                    {job.title}
                </h1>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-cyan-600">
                        <Building size={20} />
                    </div>
                    <div>
                        <p className="text-lg font-black text-sky-700 uppercase leading-none">{job.company}</p>
                        <p className="text-teal-500 text-xs font-bold">
                          {job.isScraped ? "Source : MinaJobs" : "Entreprise vérifiée"}
                        </p>
                    </div>
                </div>
            </div>

            {job.salary && (
                <div className="bg-sky-50 border border-sky-100 p-6 rounded-[2rem] text-center w-full md:w-auto">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Salaire</p>
                    <p className="text-2xl font-black text-sky-600">{job.salary}</p>
                    <p className="text-[10px] font-bold text-blue-400">Mensuel</p>
                </div>
            )}
          </div>

          {/* --- MODULE INTEGRÉ : ENCADRÉ COACH CAMERWORK --- */}
          {!checkingSkills && missingSkills.length > 0 && !hasApplied && userRole !== 'recruiter' && (
            <div className="mt-8 bg-gradient-to-br from-sky-900 to-blue-950 rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-sky-800">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 text-white font-black text-9xl select-none">
                AI
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles size={16} /> Coach CamerWork
                  </div>
                  <h3 className="text-xl font-black leading-tight tracking-tight uppercase">
                    Maximise tes chances pour ce poste
                  </h3>
                  <p className="text-sky-300 text-sm font-medium leading-relaxed max-w-xl">
                    Le recruteur recherche idéalement des profils maîtrisant ces technologies. S'ils font partie de ton parcours académique ou de tes projets, rajoute-les pour passer au-dessus de la pile :
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {missingSkills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-white/10 text-amber-300 rounded-xl text-xs font-black uppercase border border-white/5">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => navigate('/mon-profil')} 
                  className="bg-cyan-500 hover:bg-cyan-600 text-sky-900 text-sm font-black uppercase px-6 py-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-center shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  Optimiser mon profil <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
          {/* ----------------------------------------------- */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 border-t border-sky-50 pt-12">
            {/* Left: Description & Missions */}
            <div className="space-y-10">
                <div>
                    <h2 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Briefcase size={16} className="text-cyan-600" /> Description
                    </h2>
                    <p className="text-sky-600 leading-relaxed font-medium text-lg whitespace-pre-line">
                        {job.description || "Consultez les missions pour plus de détails sur le poste."}
                    </p>
                </div>

                <div>
                    <h2 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <CheckCircle size={16} className="text-cyan-600" /> Missions du poste
                    </h2>
                    <ul className="space-y-4">
                        {job.missions?.map((m, i) => (
                            <li key={i} className="flex gap-4 p-4 bg-sky-50 rounded-2xl text-sky-700 font-bold text-sm">
                                <span className="text-cyan-600">{i+1}.</span> {m}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Right: Profile Required */}
            <div>
                <div className="bg-sky-900 rounded-[2rem] p-8 text-white">
                    <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6">Profil recherché</h2>
                    <ul className="space-y-4">
                        {job.profile?.map((p, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm font-medium">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></div>
                                <span className="text-sky-300">{p}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-4 rounded-[2.5rem] flex items-center gap-4">
          {hasApplied && !job.isScraped ? (
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 bg-teal-50 text-teal-600 py-4 rounded-2xl font-black flex items-center justify-center gap-3 text-sm">
                <UserCheck size={20} /> CANDIDATURE ENVOYÉE
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
            <div className="w-full bg-sky-100 text-sky-400 py-4 rounded-2xl font-black text-center text-sm uppercase">
               Mode Recruteur (Lecture seule)
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
                    Postuler sur le site source <ExternalLink size={18} />
                  </>
                ) : (
                  "Postuler maintenant"
                )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
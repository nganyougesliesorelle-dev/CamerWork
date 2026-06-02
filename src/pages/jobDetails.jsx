import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Building, CheckCircle, DollarSign, Briefcase, UserCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'; 

// Import de la fonction de service que nous avons centralisée
import { applyToJob } from '../firebase/authService'; 

const getTypeColor = (type) => {
  const t = type?.toLowerCase();
  if (t === 'cdi') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (t === 'cdd') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (t === 'stage') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export function JobDetails() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [userRole, setUserRole] = useState(null);

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
            if (userSnap.exists()) setUserRole(userSnap.data().role);

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
          toast.error("Offre introuvable");
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
    // --- REDIRECTION POUR LES OFFRES SCRAPÉES ---
    if (job?.isScraped && job?.sourceUrl) {
      toast.info("Redirection vers le site partenaire...");
      window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
      return; // On stoppe l'exécution ici pour éviter l'envoi en interne
    }
    // --------------------------------------------

    const user = auth.currentUser;
    
    if (!user) {
      toast.error("Connexion requise", { description: "Connecte-toi pour postuler." });
      return;
    }

    if (userRole === 'recruiter') {
      toast.error("Action impossible", { description: "Un compte recruteur ne peut pas postuler." });
      return;
    }

    try {
      const result = await applyToJob(job, user);

      if (result.success) {
        setHasApplied(true);
        toast.success('Candidature envoyée !', {
          description: `Ton profil est maintenant chez ${job?.company}.`,
        });

        // --- AJOUT DE LA NOTIFICATION POUR LE RECRUTEUR ---
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
    } catch (error) {
      toast.error("Erreur", { description: "Impossible d'envoyer la candidature." });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!job) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header / Banner */}
      <div className="bg-slate-900 h-64 w-full p-8 flex items-start justify-center relative overflow-hidden">
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
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 md:p-12 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getTypeColor(job.type)}`}>
                        {job.type}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 text-[10px] font-black uppercase">
                        <MapPin size={12} /> {job.city}
                    </span>
                    {/* Badge d'indication de la source pour la transparence */}
                    {job.isScraped && (
                      <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Partenaire Externe
                      </span>
                    )}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-none mb-4 uppercase tracking-tighter">
                    {job.title}
                </h1>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-blue-600">
                        <Building size={20} />
                    </div>
                    <div>
                        <p className="text-lg font-black text-slate-700 uppercase leading-none">{job.company}</p>
                        <p className="text-emerald-500 text-xs font-bold">
                          {job.isScraped ? "Source : MinaJobs" : "Entreprise vérifiée"}
                        </p>
                    </div>
                </div>
            </div>

            {job.salary && (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] text-center w-full md:w-auto">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Salaire</p>
                    <p className="text-2xl font-black text-blue-700">{job.salary}</p>
                    <p className="text-[10px] font-bold text-blue-400">Mensuel</p>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 border-t border-slate-50 pt-12">
            {/* Left: Description & Missions */}
            <div className="space-y-10">
                <div>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Briefcase size={16} className="text-blue-600" /> Description
                    </h2>
                    <p className="text-slate-600 leading-relaxed font-medium text-lg whitespace-pre-line">
                        {job.description || "Consultez les missions pour plus de détails sur le poste."}
                    </p>
                </div>

                <div>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <CheckCircle size={16} className="text-blue-600" /> Missions du poste
                    </h2>
                    <ul className="space-y-4">
                        {job.missions?.map((m, i) => (
                            <li key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl text-slate-700 font-bold text-sm">
                                <span className="text-blue-600">{i+1}.</span> {m}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Right: Profile Required */}
            <div>
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                    <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6">Profil recherché</h2>
                    <ul className="space-y-4">
                        {job.profile?.map((p, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm font-medium">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                <span className="text-slate-300">{p}</span>
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
            <div className="w-full bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black flex items-center justify-center gap-3">
               <UserCheck size={20} /> CANDIDATURE ENVOYÉE
            </div>
          ) : userRole === 'recruiter' ? (
            <div className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-center text-sm uppercase">
               Mode Recruteur (Lecture seule)
            </div>
          ) : (
            <button
                onClick={handleApply}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  job.isScraped 
                    ? "bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600" 
                    : "bg-blue-700 text-white shadow-blue-200 hover:bg-blue-800"
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
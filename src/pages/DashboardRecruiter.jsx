import React, { useState, useEffect } from 'react';
import { Briefcase, User, CheckCircle, XCircle, ExternalLink, PlusCircle, LayoutDashboard, ArrowLeft, Clock, Trash2, Edit3, Eye, MessageSquare } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { updateApplicationStatus } from '../firebase/authService';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore'; 
import { toast } from 'sonner';

export function DashboardRecruiter() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [myJobs, setMyJobs] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }

    const qApps = query(
      collection(db, "applications"), 
      where("recruiterId", "==", user.uid)
    );

    const qJobs = query(
      collection(db, "jobs"),
      where("recruiterId", "==", user.uid)
    );

    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(appsData.sort((a, b) => b.appliedAt?.seconds - a.appliedAt?.seconds));
    });

    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyJobs(jobsData);
      setLoading(false);
    });

    return () => {
      unsubApps();
      unsubJobs();
    };
  }, [navigate]);

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Es-tu sûr de vouloir supprimer cette annonce définitivement ?")) {
      try {
        await deleteDoc(doc(db, "jobs", jobId));
        toast.success("Annonce supprimée avec succès");
      } catch (error) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const updateStatus = async (app, newStatus) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const apiStatus = newStatus === 'retenu' ? 'accepted' : 'rejected';
      
      const result = await updateApplicationStatus(
        app.id,
        app.candidateId,
        app.jobTitle,
        app.company || "Recruteur CamerWork",
        apiStatus,
        user.uid
      );

      if (result.success) {
        toast.success(`Candidat ${newStatus === 'retenu' ? 'accepté' : 'refusé'} et notifié avec succès !`);
      } else {
        toast.error(result.error || "Erreur lors du traitement");
      }
    } catch (error) {
      toast.error("Erreur de mise à jour du statut");
    }
  };

  const getStatusColor = (status) => {
    if (status === 'retenu' || status === 'accepted') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'refusé' || status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white border-b border-slate-100 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
               <LayoutDashboard size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Mon Espace</h1>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                  Recruteur <span className="w-1 h-1 bg-slate-300 rounded-full"></span> {myJobs.length} annonces actives
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/RecruiterPost')} 
            className="w-full md:w-auto bg-blue-700 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-2xl shadow-blue-200 hover:scale-105 transition-all active:scale-95"
          >
            <PlusCircle size={20} /> Publier une annonce
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Candidats</p>
                <p className="text-4xl font-black text-slate-800">{applications.length}</p>
            </div>
            <div className="bg-emerald-500 p-6 rounded-[2rem] shadow-xl shadow-emerald-200 text-white">
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-2">Profils Retenus</p>
                <p className="text-4xl font-black">{applications.filter(a => a.status === 'retenu' || a.status === 'accepted').length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Annonces Actives</p>
                <p className="text-4xl font-black text-blue-600">{myJobs.length}</p>
            </div>
        </div>

        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter">
            <Briefcase className="text-blue-600" size={20} /> Mes Annonces
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {myJobs.map((job) => (
            <div key={job.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-800 uppercase text-sm mb-1 truncate">{job.title}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mb-4">{job.city || 'Yaoundé'}</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/RecruiterPost`, { state: { editJob: job } })}
                  className="flex-1 bg-slate-50 text-slate-600 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all flex justify-center"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteJob(job.id)}
                  className="flex-1 bg-slate-50 text-slate-600 p-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all flex justify-center"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {myJobs.length === 0 && (
            <div className="col-span-full p-8 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold">
              Aucune annonce publiée pour le moment.
            </div>
          )}
        </div>

        <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter">
            <Clock className="text-blue-600" size={20} /> Candidatures Récentes
        </h2>

        {applications.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <User size={40} />
             </div>
             <p className="text-slate-400 font-black text-xl">Aucun talent n'a encore postulé.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex flex-wrap items-center justify-between gap-6 hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 rounded-2xl flex items-center justify-center font-black text-2xl border border-white shadow-inner group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all">
                    {app.candidateName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-lg leading-tight">{app.candidateName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-blue-600 text-xs font-black uppercase flex items-center gap-1">
                          <Briefcase size={12} /> {app.jobTitle}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusColor(app.status)}`}>
                            {app.status === 'pending' ? 'En attente' : app.status === 'accepted' || app.status === 'retenu' ? 'retenu' : app.status === 'rejected' || app.status === 'refusé' ? 'refusé' : app.status}
                        </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {(app.status === 'retenu' || app.status === 'accepted') && (
                    <button 
                      onClick={() => navigate(`/chat/${auth.currentUser?.uid}_${app.candidateId}_${app.id}`)}
                      className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-xs hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                    >
                      <MessageSquare size={14} /> Discuter
                    </button>
                  )}

                  <button 
                    onClick={() => navigate(`/profil/${app.candidateId}`)}
                    className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-xs hover:bg-blue-600 transition-all shadow-lg"
                  >
                    Profil complet <ExternalLink size={14} />
                  </button>
                  
                  <div className="flex gap-2">
                    <button 
                        onClick={() => updateStatus(app, 'retenu')} 
                        className={`p-4 rounded-2xl transition-all border ${app.status === 'retenu' || app.status === 'accepted' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                    >
                        <CheckCircle size={22} />
                    </button>
                    
                    <button 
                        onClick={() => updateStatus(app, 'refusé')} 
                        className={`p-4 rounded-2xl transition-all border ${app.status === 'refusé' || app.status === 'rejected' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
                    >
                        <XCircle size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
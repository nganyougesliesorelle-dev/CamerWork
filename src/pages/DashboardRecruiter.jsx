import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Users, CheckCircle, XCircle, ExternalLink, PlusCircle, 
  LayoutDashboard, ArrowLeft, Clock, Trash2, Edit3, MessageSquare, 
  LogOut, Search, Filter, Bell, Building, Sparkles, TrendingUp, 
  Calendar, Eye, User, ChevronRight, BarChart3, Activity
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { updateApplicationStatus } from '../firebase/authService';
import { calculateMatchingScore } from '../firebase/matchingEngine';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function DashboardRecruiter() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [myJobs, setMyJobs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [matchScores, setMatchScores] = useState({});
  const [searchJobQuery, setSearchJobQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', company: '', phone: '', city: 'Yaoundé' });
  // eslint-disable-next-line no-unused-vars
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/'); return; }

    getDoc(doc(db, "users", user.uid)).then((userDoc) => {
      if (userDoc.exists()) {
        setProfileForm({
          displayName: userDoc.data().displayName || '',
          company: userDoc.data().company || '',
          phone: userDoc.data().phone || '',
          city: userDoc.data().city || 'Yaoundé'
        });
      }
    });

    const qApps = query(collection(db, "applications"), where("recruiterId", "==", user.uid));
    const qJobs = query(collection(db, "jobs"), where("recruiterId", "==", user.uid));
    const qNotifs = query(collection(db, "notifications"), where("userId", "==", user.uid));

    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(appsData.sort((a, b) => b.appliedAt?.seconds - a.appliedAt?.seconds));
      const profilesCache = {};
      const jobsCache = {};
      appsData.forEach(async (app) => {
        try {
          if (!profilesCache[app.candidateId]) {
            const candSnap = await getDoc(doc(db, "users", app.candidateId));
            profilesCache[app.candidateId] = candSnap.exists() ? candSnap.data() : null;
          }
          if (!jobsCache[app.jobId] && app.jobId) {
            const jobSnap = await getDoc(doc(db, "jobs", app.jobId));
            jobsCache[app.jobId] = jobSnap.exists() ? { id: jobSnap.id, ...jobSnap.data() } : null;
          }
          const candidate = profilesCache[app.candidateId];
          const job = jobsCache[app.jobId];
          if (candidate && job) {
            const score = calculateMatchingScore(candidate, job);
            setMatchScores(prev => ({ ...prev, [app.id]: score }));
          }
        } catch (_e) { /* ignore */ }
      });
    });

    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      setMyJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => { unsubApps(); unsubJobs(); unsubNotifs(); };
  }, [navigate]);

  const handleLogout = async () => {
    if (window.confirm("Voulez-vous vous déconnecter ?")) {
      await signOut(auth); toast.success("Déconnexion réussie"); navigate('/');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "users", auth.currentUser.uid), profileForm);
    toast.success("Profil mis à jour !"); setShowProfileEdit(false);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Supprimer cette annonce définitivement ?")) {
      await deleteDoc(doc(db, "jobs", jobId));
      toast.success("Annonce supprimée");
    }
  };

  const updateStatus = async (app, newStatus) => {
    if (newStatus === 'retenu' && (app.status === 'retenu' || app.status === 'accepted')) return;
    try {
      const apiStatus = newStatus === 'retenu' ? 'accepted' : 'rejected';
      const result = await updateApplicationStatus(app.id, app.candidateId, app.jobTitle, app.company || "Recruteur CamerWork", apiStatus, auth.currentUser.uid);
      if (result.success) toast.success(`Candidat ${newStatus === 'retenu' ? 'accepté' : 'refusé'} !`);
      else toast.error(result.error || "Erreur");
    } catch (_e) { toast.error("Erreur de mise à jour"); }
  };

  const getStatusBadge = (status) => {
    if (status === 'retenu' || status === 'accepted') return 'bg-teal-50 text-teal-700 border-teal-200';
    if (status === 'refusé' || status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getStatusLabel = (status) => {
    if (status === 'accepted' || status === 'retenu') return 'Retenu';
    if (status === 'rejected' || status === 'refusé') return 'Refusé';
    return 'En attente';
  };

  const filteredJobs = myJobs.filter(job => {
    const m = job.title?.toLowerCase().includes(searchJobQuery.toLowerCase());
    const c = selectedCityFilter === 'all' || job.city === selectedCityFilter;
    return m && c;
  });

  const acceptedCount = applications.filter(a => a.status === 'accepted' || a.status === 'retenu').length;
  // eslint-disable-next-line no-unused-vars
  const rejectedCount = applications.filter(a => a.status === 'rejected' || a.status === 'refusé').length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  // Données graphique hebdomadaire
  const chartData = (() => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const counts = Array(7).fill(0);
    applications.forEach(app => {
      if (app.appliedAt?.toDate) {
        counts[(app.appliedAt.toDate().getDay() + 6) % 7]++;
      }
    });
    return counts.some(v => v > 0) ? days.map((n, i) => ({ name: n, Candidatures: counts[i] })) : days.map(n => ({ name: n, Candidatures: 0 }));
  })();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-500 font-medium text-sm">Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50 font-sans antialiased pb-20">
      
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/offres')} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">Espace Recruteur</h1>
                <p className="text-sky-300 text-xs font-medium mt-0.5">{profileForm.company || 'Votre entreprise'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              <button onClick={handleLogout} className="p-3 bg-white/10 hover:bg-red-500/30 rounded-xl transition-all text-white/70 hover:text-white">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-6">

        {/* ─── KPIs ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Briefcase, label: 'Offres actives', value: myJobs.length, color: 'text-cyan-500', bg: 'bg-cyan-50' },
            { icon: Users, label: 'Candidatures', value: applications.length, color: 'text-sky-500', bg: 'bg-sky-50' },
            { icon: CheckCircle, label: 'Retenus', value: acceptedCount, color: 'text-teal-500', bg: 'bg-teal-50' },
            { icon: TrendingUp, label: 'En attente', value: pendingCount, color: 'text-amber-500', bg: 'bg-amber-50' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5 hover:shadow-md transition-all">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <span className="text-3xl font-black text-sky-800 block">{kpi.value}</span>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">{kpi.label}</span>
            </div>
          ))}
        </div>

        {/* ─── CHART + NOTIFICATIONS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-sky-100 p-5">
            <h3 className="text-xs font-black text-sky-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-500" /> Évolution hebdomadaire des candidatures
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#7dd3fc" tickLine={false} fontSize={12} />
                  <YAxis stroke="#7dd3fc" tickLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#bae6fd', borderRadius: '12px' }} />
                  <Bar dataKey="Candidatures" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5">
            <h3 className="text-xs font-black text-sky-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} className="text-cyan-500" /> Dernières notifications
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {notifications.slice(0, 5).map((n, i) => (
                <div key={i} className={`p-2.5 rounded-xl text-xs ${n.read ? 'bg-sky-50' : 'bg-cyan-50 border border-cyan-100'}`}>
                  <p className="font-bold text-sky-800">{n.title}</p>
                  <p className="text-sky-500 truncate">{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-sky-400 text-xs text-center py-4">Aucune notification</p>}
            </div>
          </div>
        </div>

        {/* ─── MES ANNONCES ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={16} className="text-cyan-500" /> Mes Annonces ({myJobs.length})
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-44">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
                <input type="text" placeholder="Rechercher..." value={searchJobQuery} onChange={(e) => setSearchJobQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-sky-50 border border-sky-100 rounded-xl text-xs font-bold text-sky-700 outline-none focus:border-cyan-500" />
              </div>
              <select value={selectedCityFilter} onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 text-xs font-bold text-sky-600 outline-none cursor-pointer">
                <option value="all">Toutes</option>
                <option value="Yaoundé">Yaoundé</option><option value="Douala">Douala</option>
                <option value="Garoua">Garoua</option><option value="Bafoussam">Bafoussam</option>
              </select>
              <button onClick={() => navigate('/RecruiterPost')} className="p-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all shrink-0">
                <PlusCircle size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-sky-50/50 rounded-xl p-4 border border-sky-100 hover:border-cyan-300 hover:shadow-md transition-all group">
                <h3 className="font-bold text-sky-800 text-sm truncate">{job.title}</h3>
                <p className="text-xs text-sky-500 font-medium">{job.city || 'Yaoundé'} · {job.type || 'CDI'}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate('/RecruiterPost', { state: { editJob: job } })} className="flex-1 bg-white text-sky-600 p-2 rounded-lg hover:text-cyan-600 hover:bg-sky-100 transition-all flex justify-center border border-sky-100">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDeleteJob(job.id)} className="flex-1 bg-white text-sky-600 p-2 rounded-lg hover:text-red-500 hover:bg-red-50 transition-all flex justify-center border border-sky-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredJobs.length === 0 && (
              <div className="col-span-full text-center py-10 text-sky-400">
                <Briefcase size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold">Aucune annonce trouvée</p>
                <button onClick={() => navigate('/RecruiterPost')} className="text-cyan-500 font-black text-xs mt-2 hover:underline">+ Créer une annonce</button>
              </div>
            )}
          </div>
        </div>

        {/* ─── CANDIDATURES ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-5">
          <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={16} className="text-cyan-500" /> Candidatures récentes ({applications.length})
          </h2>

          {applications.length === 0 ? (
            <div className="text-center py-16">
              <User size={48} className="mx-auto mb-4 text-sky-300" />
              <p className="text-sky-400 font-bold text-lg">Aucun candidat n'a encore postulé</p>
              <p className="text-sky-300 text-xs mt-1">Partagez vos annonces pour attirer des talents.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-sky-100">
                    <th className="pb-3 text-xs font-black text-sky-400 uppercase tracking-wider">Candidat</th>
                    <th className="pb-3 text-xs font-black text-sky-400 uppercase tracking-wider hidden md:table-cell">Poste</th>
                    <th className="pb-3 text-xs font-black text-sky-400 uppercase tracking-wider hidden sm:table-cell">Match</th>
                    <th className="pb-3 text-xs font-black text-sky-400 uppercase tracking-wider">Statut</th>
                    <th className="pb-3 text-xs font-black text-sky-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => {
                    const isAccepted = app.status === 'accepted' || app.status === 'retenu';
                    const isRejected = app.status === 'rejected' || app.status === 'refusé';
                    const score = matchScores[app.id];
                    const chatId = `${auth.currentUser?.uid}_${app.candidateId}_${app.id}`;
                    return (
                      <tr key={app.id} className="border-b border-sky-50 hover:bg-sky-50/50 transition-all">
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">
                              {app.candidateName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sky-800 text-xs truncate max-w-[120px]">{app.candidateName}</p>
                              <p className="text-[10px] text-sky-400">{app.candidateEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 hidden md:table-cell">
                          <span className="text-xs font-medium text-sky-700">{app.jobTitle}</span>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          {score !== undefined && score > 0 ? (
                            <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">{score}%</span>
                          ) : <span className="text-xs text-sky-300">--</span>}
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusBadge(app.status)}`}>
                            {getStatusLabel(app.status)}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/profil/${app.candidateId}`)} className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all" title="Voir profil">
                              <Eye size={15} />
                            </button>
                            {isAccepted && (
                              <button onClick={() => navigate(`/chat/${chatId}`)} className="p-2 text-teal-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all" title="Message">
                                <MessageSquare size={15} />
                              </button>
                            )}
                            {!isAccepted && !isRejected && (
                              <>
                                <button onClick={() => updateStatus(app, 'retenu')} className="p-2 text-teal-500 hover:text-white hover:bg-teal-500 rounded-lg transition-all" title="Accepter">
                                  <CheckCircle size={15} />
                                </button>
                                <button onClick={() => updateStatus(app, 'refusé')} className="p-2 text-red-400 hover:text-white hover:bg-red-400 rounded-lg transition-all" title="Refuser">
                                  <XCircle size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

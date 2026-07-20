import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Users, CheckCircle, XCircle, ExternalLink, PlusCircle, 
  LayoutDashboard, ArrowLeft, Clock, Trash2, Edit3, MessageSquare, MessageCircle,
  LogOut, Search, Filter, Bell, Building, Sparkles, TrendingUp, 
  Calendar, Eye, User, ChevronRight, BarChart3, Activity, CheckCheck, X,
  MapPin, Target
} from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { updateApplicationStatus } from '../firebase/authService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { calculateMatchingScore, reverseMatchCandidates } from '../firebase/matchingEngine';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function DashboardRecruiter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [myJobs, setMyJobs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [matchScores, setMatchScores] = useState({});
  const [searchJobQuery, setSearchJobQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', company: '', phone: '', city: 'Yaoundé', companyLogoUrl: '' });
  // eslint-disable-next-line no-unused-vars
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  // Module 3 — Reverse Matching
  const [selectedMatchJob, setSelectedMatchJob] = useState('');
  const [topCandidates, setTopCandidates] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/'); return; }

    getDoc(doc(db, "users", user.uid)).then((userDoc) => {
      if (userDoc.exists()) {
        const d = userDoc.data();
        setProfileForm({
          displayName: d.displayName || '',
          company: d.company || '',
          phone: d.phone || '',
          city: d.city || 'Yaoundé',
          companyLogoUrl: d.companyLogoUrl || '',
          companyLogoName: d.companyLogoName || '',
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
      await signOut(auth); toast.success(t('notifications.success_logout')); navigate('/');
    }
  };

  const markNotifAsRead = async (notifId) => {
    try { await updateDoc(doc(db, "notifications", notifId), { read: true }); } catch (_e) { /* ignore */ }
  };

  const markAllNotifsAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  };

  // eslint-disable-next-line no-unused-vars
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "users", auth.currentUser.uid), profileForm);
    toast.success(t('notifications.success_profile_saved')); setShowProfileEdit(false);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm("Supprimer cette annonce définitivement ?")) {
      await deleteDoc(doc(db, "jobs", jobId));
      toast.success(t('jobs.deleted'));
    }
  };

  const handleCompanyLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir une image valide pour le logo.');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      const storageRef = ref(storage, `company-logos/${user.uid}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const logoUrl = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, 'users', user.uid), {
        companyLogoUrl: logoUrl,
        companyLogoName: file.name,
      });

      const jobsSnap = await getDocs(query(collection(db, 'jobs'), where('recruiterId', '==', user.uid)));
      const batch = writeBatch(db);
      jobsSnap.forEach((jobDoc) => {
        batch.update(doc(db, 'jobs', jobDoc.id), { companyLogoUrl: logoUrl });
      });
      await batch.commit();

      toast.success('Logo de l’entreprise mis à jour.');
    } catch (_error) {
      toast.error('Impossible d’enregistrer le logo de l’entreprise.');
    }
  };

  const updateStatus = async (app, newStatus) => {
    if (newStatus === 'retenu' && (app.status === 'retenu' || app.status === 'accepted')) return;
    try {
      const apiStatus = newStatus === 'retenu' ? 'accepted' : 'rejected';
      const result = await updateApplicationStatus(app.id, app.candidateId, app.jobTitle, app.company || "Recruteur CamerWork", apiStatus, auth.currentUser.uid);
      if (result.success) {
        toast.success(newStatus === 'retenu' ? t('notifications.candidate_accepted') : t('notifications.candidate_rejected'));
        if (result.warnings) {
          toast.error(result.warnings, { duration: 6000 });
        }
      } else {
        toast.error(result.error || t('common.error'));
      }
    } catch (_e) { toast.error(t('jobs.update_error')); }
  };

  const [selectedApp, setSelectedApp] = useState(null);

  const openAppDetails = (app) => setSelectedApp(app);
  const closeAppDetails = () => setSelectedApp(null);

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
  const unreadMessagesCount = notifications.filter(n => n.type === 'message' && !n.read).length;

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
      <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sky-500 dark:text-gray-300 font-medium text-sm">Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-20">
      
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 text-white relative">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden"></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/offres')} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <ArrowLeft size={18} />
              </button>
              {/* company logo preview */}
              {profileForm.companyLogoUrl ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 border border-white/10">
                  <img src={profileForm.companyLogoUrl} alt="Logo entreprise" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                  <Building size={20} className="text-white/60" />
                </div>
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">Espace Recruteur</h1>
                <p className="text-sky-300 dark:text-gray-400 text-xs font-medium mt-0.5">{profileForm.company || 'Votre entreprise'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/profil')} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Profil">
                <User size={18} />
              </button>
              <button onClick={() => navigate('/messages')} className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Messages">
                <MessageCircle size={18} />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              <label className="cursor-pointer p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white" title="Ajouter un logo entreprise">
                <Building size={18} />
                <input type="file" accept="image/*" onChange={handleCompanyLogoUpload} className="hidden" />
              </label>
              <button onClick={handleLogout} className="p-3 bg-white/10 hover:bg-red-500/30 rounded-xl transition-all text-white/70 hover:text-white">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Dropdown notifications */}
        {showNotifications && (
          <div className="absolute right-4 sm:right-8 top-20 md:top-24 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-sky-50 dark:border-gray-700">
              <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase">Notifications</h3>
              <button onClick={() => { markAllNotifsAsRead(); setShowNotifications(false); }} className="text-[10px] font-bold text-cyan-500 hover:underline flex items-center gap-1">
                <CheckCheck size={12} /> Tout lu
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-xs text-sky-400 dark:text-gray-400 py-8">Aucune notification</p>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => { markNotifAsRead(n.id); if (n.jobId) navigate(`/offres/${n.jobId}`); setShowNotifications(false); }}
                    className={`p-3 border-b border-sky-50 dark:border-gray-700 cursor-pointer hover:bg-sky-50 dark:hover:bg-gray-700/50 transition-all flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.read ? 'bg-sky-200 dark:bg-gray-600' : 'bg-cyan-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-sky-800 dark:text-gray-100 truncate">{n.title}</p>
                      <p className="text-[11px] text-sky-500 dark:text-gray-400 truncate">{n.message}</p>
                      <p className="text-[9px] text-sky-400 dark:text-gray-500 mt-0.5">
                        {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowNotifications(false)} className="w-full p-3 text-center text-xs font-bold text-sky-500 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-gray-700/50 border-t border-sky-50 dark:border-gray-700">
              Fermer
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-6">

        {/* ─── KPIs ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Briefcase, label: 'Offres actives', value: myJobs.length, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
            { icon: Users, label: 'Candidatures', value: applications.length, color: 'text-sky-500 dark:text-gray-300', bg: 'bg-sky-50 dark:bg-gray-700/50' },
{ icon: CheckCircle, label: 'Retenus', value: acceptedCount, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/30' },
             { icon: TrendingUp, label: 'En attente', value: pendingCount, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5 hover:shadow-md dark:hover:shadow-gray-900/30 transition-all">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <span className="text-3xl font-black text-sky-800 dark:text-gray-100 block">{kpi.value}</span>
              <span className="text-xs font-bold text-sky-400 dark:text-gray-400 uppercase tracking-wider">{kpi.label}</span>
            </div>
          ))}
        </div>

        {/* ─── CHART + NOTIFICATIONS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
            <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
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

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
            <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} className="text-cyan-500" /> Dernières notifications
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {notifications.slice(0, 5).map((n, i) => (
                <div key={i} className={`p-2.5 rounded-xl text-xs ${n.read ? 'bg-sky-50 dark:bg-gray-700/50' : 'bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-900'}`}>
                  <p className="font-bold text-sky-800 dark:text-gray-100">{n.title}</p>
                  <p className="text-sky-500 dark:text-gray-400 truncate">{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-sky-400 dark:text-gray-400 text-xs text-center py-4">Aucune notification</p>}
            </div>
          </div>
        </div>

        {/* ─── MESSAGERIE RECRUTEUR ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={16} className="text-cyan-500" /> {t('recruiterDashboard.direct_messages')}
            </h2>
            <button onClick={() => navigate('/messages')} className="inline-flex items-center gap-2 bg-sky-50 dark:bg-gray-700/50 border border-sky-100 dark:border-gray-700 text-sky-700 dark:text-gray-100 text-xs font-bold uppercase tracking-wider py-2 px-3 rounded-xl hover:bg-cyan-500 hover:text-white transition-all">
              <MessageCircle size={14} /> {t('recruiterDashboard.view_conversations')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-sky-50 dark:bg-gray-900/80 rounded-2xl p-4 border border-sky-100 dark:border-gray-700">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-500 dark:text-cyan-400">{t('recruiterDashboard.unread_messages')}</p>
              <p className="text-3xl font-black text-sky-800 dark:text-white mt-3">{unreadMessagesCount}</p>
              <p className="text-[11px] text-sky-500 dark:text-gray-400 mt-1">{t('recruiterDashboard.unread_messages_help')}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-500 dark:text-cyan-400">{t('recruiterDashboard.quick_access')}</p>
              <div className="mt-4 space-y-3">
                <button onClick={() => navigate('/messages')} className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-600 transition-all">
                  {t('recruiterDashboard.open_messaging')}
                  {unreadMessagesCount > 0 && <span className="min-w-[1.5rem] h-6 rounded-full bg-white text-cyan-600 text-[10px] font-black flex items-center justify-center">{unreadMessagesCount}</span>}
                </button>
                <p className="text-[11px] text-sky-500 dark:text-gray-400">{t('recruiterDashboard.recruiter_messages_help')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MES ANNONCES ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
              <Briefcase size={16} className="text-cyan-500" /> Mes Annonces ({myJobs.length})
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-44">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 dark:text-gray-400" />
                <input type="text" placeholder="Rechercher..." value={searchJobQuery} onChange={(e) => setSearchJobQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-sky-50 dark:bg-gray-700/50 border border-sky-100 dark:border-gray-700 rounded-xl text-xs font-bold text-sky-700 dark:text-gray-300 outline-none focus:border-cyan-500" />
              </div>
              <select value={selectedCityFilter} onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="bg-sky-50 dark:bg-gray-700/50 border border-sky-100 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-sky-600 dark:text-gray-300 outline-none cursor-pointer">
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
              <div key={job.id} className="bg-sky-50/50 dark:bg-gray-700/50 rounded-xl p-4 border border-sky-100 dark:border-gray-700 hover:border-cyan-300 hover:shadow-md dark:hover:shadow-gray-900/30 transition-all group">
                <h3 className="font-bold text-sky-800 dark:text-gray-100 text-sm truncate">{job.title}</h3>
                <p className="text-xs text-sky-500 dark:text-gray-400 font-medium">{job.city || 'Yaoundé'} · {job.type || 'CDI'}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate('/RecruiterPost', { state: { editJob: job } })} className="flex-1 bg-white dark:bg-gray-800 text-sky-600 dark:text-gray-300 p-2 rounded-lg hover:text-cyan-600 hover:bg-sky-100 dark:hover:bg-gray-700 transition-all flex justify-center border border-sky-100 dark:border-gray-700">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDeleteJob(job.id)} className="flex-1 bg-white dark:bg-gray-800 text-sky-600 dark:text-gray-300 p-2 rounded-lg hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex justify-center border border-sky-100 dark:border-gray-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredJobs.length === 0 && (
              <div className="col-span-full text-center py-10 text-sky-400 dark:text-gray-400">
                <Briefcase size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold">Aucune annonce trouvée</p>
                <button onClick={() => navigate('/RecruiterPost')} className="text-cyan-500 font-black text-xs mt-2 hover:underline">+ Créer une annonce</button>
              </div>
            )}
          </div>
        </div>

        {/* ─── CANDIDATURES ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
          <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users size={16} className="text-cyan-500" /> Candidatures récentes ({applications.length})
          </h2>

          {applications.length === 0 ? (
            <div className="text-center py-16">
              <User size={48} className="mx-auto mb-4 text-sky-300 dark:text-gray-500" />
              <p className="text-sky-400 dark:text-gray-400 font-bold text-lg">Aucun candidat n'a encore postulé</p>
              <p className="text-sky-300 dark:text-gray-500 text-xs mt-1">Partagez vos annonces pour attirer des talents.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-sky-100 dark:border-gray-700">
                    <th className="pb-3 text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-wider">Candidat</th>
                    <th className="pb-3 text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Poste</th>
                    <th className="pb-3 text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Match</th>
                    <th className="pb-3 text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                    <th className="pb-3 text-xs font-black text-sky-400 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
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
                            <button onClick={() => openAppDetails(app)} className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all" title="Voir candidature">
                              <ExternalLink size={15} />
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

      {/* Application details modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeAppDetails} />
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/40 p-6 z-10 max-w-2xl w-full mx-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-sky-800 dark:text-gray-100">Candidature — {selectedApp.candidateName}</h3>
                <p className="text-xs text-sky-400">{selectedApp.candidateEmail}</p>
              </div>
              <button onClick={closeAppDetails} className="text-sky-400 hover:text-sky-600">Fermer</button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase">Message du candidat</h4>
                <p className="text-sm text-sky-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">{selectedApp.message || '— Aucune lettre de motivation fournie —'}</p>
              </div>

              <div>
                <h4 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase">CV</h4>
                {selectedApp.cvUrl ? (
                  <div className="mt-2 flex items-center gap-3">
                    <a href={selectedApp.cvUrl} target="_blank" rel="noreferrer" className="text-cyan-600 font-bold hover:underline">Ouvrir le CV</a>
                    {selectedApp.cvName && <span className="text-xs text-sky-400">{selectedApp.cvName}</span>}
                  </div>
                ) : (
                  <p className="text-sm text-sky-400 mt-2">Aucun CV attaché</p>
                )}
              </div>

              <div className="flex justify-end">
                <button onClick={closeAppDetails} className="px-4 py-2 bg-sky-50 text-sky-700 rounded-xl">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODULE 3 : TOP TALENTS — REVERSE MATCHING ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
          <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2 mb-1">
            <Target size={18} className="text-cyan-500" /> 🎯 Top Talents — Matching Intelligent
          </h2>
          <p className="text-xs text-sky-500 mb-4">Profils les plus compatibles avec vos offres récentes</p>

          {/* Sélecteur d'offre */}
          <select
            value={selectedMatchJob}
            onChange={async (e) => {
              const jobId = e.target.value;
              setSelectedMatchJob(jobId);
              if (!jobId) { setTopCandidates([]); return; }
              setMatchingLoading(true);
              try {
                const job = myJobs.find(j => j.id === jobId);
                const q = query(collection(db, 'users'), where('role', 'in', ['candidate', 'candidat', 'student']));
                const snap = await getDocs(q);
                const candidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const ranked = reverseMatchCandidates(job, candidates, 5);
                setTopCandidates(ranked);
              } catch (_e) { /* ignore */ }
              setMatchingLoading(false);
            }}
            className="w-full sm:w-80 p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-800 font-bold outline-none focus:border-cyan-500 mb-4"
          >
            <option value="">Sélectionnez une offre...</option>
            {myJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title} — {job.company}</option>
            ))}
          </select>

          {matchingLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topCandidates.length === 0 ? (
            <p className="text-center text-sky-400 text-sm py-8">
              {selectedMatchJob ? 'Aucun candidat compatible trouvé.' : 'Sélectionnez une offre pour voir les talents compatibles.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topCandidates.map(({ candidate, score, commonSkills, totalRequired, sameCity }) => {
                const initials = (candidate.displayName || candidate.fullName || '?').charAt(0).toUpperCase();
                const skills = candidate.skills || [];
                const scoreColor = score >= 80 ? 'bg-teal-500' : score >= 50 ? 'bg-cyan-500' : 'bg-sky-400';
                return (
                  <div key={candidate.id} className="border border-sky-100 rounded-2xl p-4 hover:border-cyan-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                        {candidate.photoURL ? <img src={candidate.photoURL} alt="" className="w-full h-full object-cover rounded-xl" /> : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sky-800 text-sm truncate">{candidate.displayName || candidate.fullName || 'Anonyme'}</p>
                        {candidate.location && (
                          <p className="text-xs text-sky-500 flex items-center gap-1"><MapPin size={10} /> {candidate.location}</p>
                        )}
                      </div>
                      <span className={`${scoreColor} text-white text-xs font-black px-2.5 py-1 rounded-full shrink-0`}>
                        {score}%
                      </span>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {skills.slice(0, 4).map((s, i) => (
                          <span key={i} className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded text-[10px] font-bold">{s}</span>
                        ))}
                        {skills.length > 4 && (
                          <span className="text-[10px] text-sky-400 font-bold">+{skills.length - 4}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-sky-500 font-bold">Compétences communes : {commonSkills}/{totalRequired}</span>
                      {sameCity && <span className="text-teal-600 font-black bg-teal-50 px-1.5 py-0.5 rounded">Même ville ✓</span>}
                    </div>
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
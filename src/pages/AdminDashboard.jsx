import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp, orderBy, startAfter, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, ShieldAlert, Shield, Search, CheckCircle2, XCircle, Eye, ExternalLink,
  Building2, Mail, Hash, Clock, ArrowLeft, Users, Filter, RefreshCw, ChevronDown,
  BadgeCheck, FileSearch, AlertTriangle, UserCheck, Star, Edit3, Trash2, PlusSquare
} from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';

/*
  Firestore composite index required for the admin recruiters query:
  - collection: users
  - fields: role (ASC), createdAt (DESC)

  If you hit the runtime error "The query requires an index" follow the console link
  shown in the error to create the index, or deploy indexes from this repo with:

    firebase deploy --only firestore:indexes

  The file `firestore.indexes.json` already contains the required index entry.
*/

// Vérifie si l'email utilise un fournisseur gratuit
const isFreeEmailProvider = (email) => {
  const domain = email?.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  const freeDomains = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.fr', 'ymail.com',
    'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
    'aol.com', 'aol.fr', 'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me', 'pm.me', 'mail.com', 'email.com',
    'gmx.com', 'gmx.fr', 'gmx.de', 'web.de', 'laposte.net',
    'orange.fr', 'wanadoo.fr', 'sfr.fr', 'free.fr',
    'yandex.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru',
    'inbox.com', 'zoho.com',
  ];
  return freeDomains.includes(domain);
};

const SORT_OPTIONS = [
  { value: 'latest', label: 'Date récente' },
  { value: 'oldest', label: 'Date ancienne' },
  { value: 'company', label: 'Entreprise A-Z' },
  { value: 'priority', label: 'Priorité et en attente' },
];

const pageSize = 12;

const sortRecruiters = (list, option) => {
  if (!list?.length) return [];
  const sorted = [...list];

  switch (option) {
    case 'oldest':
      return sorted.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    case 'company':
      return sorted.sort((a, b) => (a.company || a.displayName || '').localeCompare(b.company || b.displayName || ''));
    case 'priority':
      return sorted.sort((a, b) => {
        const prioA = a.validationPriority === 'high' ? 0 : 1;
        const prioB = b.validationPriority === 'high' ? 0 : 1;
        if (prioA !== prioB) return prioA - prioB;
        if (a.isValidated !== b.isValidated) return a.isValidated ? 1 : -1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
    default:
      return sorted.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
  const [jobsCount, setJobsCount] = useState(0);
  const [reports, setReports] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [filteredRecruiters, setFilteredRecruiters] = useState([]);
  // Jobs management (admin CRUD)
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState({ title: '', company: '', description: '', location: '', isPublished: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('latest');
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      // Vérifier que l'utilisateur est admin
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = userDoc.exists() ? userDoc.data().role : '';
      if (role !== 'admin') {
        toast.error('Accès réservé aux administrateurs.');
        navigate('/');
        return;
      }

      fetchRecruiters();
      fetchJobs();
      fetchCounts();
    });

    return () => unsubscribe();
  }, []);

  const fetchRecruiters = async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      let q = query(
        collection(db, 'users'),
        where('role', 'in', ['recruiter', 'recruteur']),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      if (!reset && lastVisibleDoc) {
        q = query(q, startAfter(lastVisibleDoc));
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const newRecruiters = reset ? list : [...recruiters, ...list];
      setRecruiters(newRecruiters);
      setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.size === pageSize);
      applyFilters(newRecruiters, searchQuery, statusFilter, sortOption);
    } catch (err) {
      console.error('Erreur chargement recruteurs:', err);
      // Firestore may require a composite index for an 'in' + 'orderBy' query.
      // If that's the case, fallback to a client-side filter (less efficient but avoids breaking the UI).
      const msg = String(err?.message || err);
      if (msg.includes('requires an index') || msg.includes('index')) {
        try {
          const snap = await getDocs(collection(db, 'users'));
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const recruitersOnly = list.filter(u => ['recruiter', 'recruteur'].includes(u.role));
          // sort by createdAt desc if present
          recruitersOnly.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          setRecruiters(recruitersOnly);
          applyFilters(recruitersOnly, searchQuery, statusFilter, sortOption);
          toast.warning("Chargement via fallback local — pensez à créer l'index Firestore recommandé.");
        } catch (fallbackErr) {
          console.error('Fallback fetch failed:', fallbackErr);
          toast.error('Impossible de charger la liste des recruteurs.');
        }
      } else {
        toast.error('Impossible de charger la liste des recruteurs.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch counts for jobs and pending reports
  const fetchCounts = async () => {
    try {
      try {
        const jobsSnap = await getDocs(collection(db, 'jobs'));
        setJobsCount(jobsSnap.size || 0);
      } catch (e) {
        console.debug('jobs count fetch failed', e);
        setJobsCount(0);
      }

      try {
        const reportsQ = query(collection(db, 'reports'), where('status', '==', 'pending'));
        const reportsSnap = await getDocs(reportsQ);
        const rDocs = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReportsCount(reportsSnap.size || 0);
        setReports(rDocs.slice(0, 10));
      } catch (e) {
        console.debug('reports fetch failed', e);
        setReportsCount(0);
        setReports([]);
      }
    } catch (err) {
      console.warn('fetchCounts error', err);
    }
  };

  // Jobs CRUD
  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(200));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobs(list);
      setJobsCount(snap.size || list.length || 0);
    } catch (err) {
      console.error('fetchJobs error', err);
      toast.error('Impossible de récupérer les offres.');
    } finally {
      setJobsLoading(false);
    }
  };

  const openCreateJob = () => {
    setEditingJob(null);
    setJobForm({ title: '', company: '', description: '', location: '', isPublished: false });
    setJobModalOpen(true);
  };

  const openEditJob = (job) => {
    setEditingJob(job.id);
    setJobForm({ title: job.title || '', company: job.company || '', description: job.description || '', location: job.location || '', isPublished: !!job.isPublished });
    setJobModalOpen(true);
  };

  const saveJob = async () => {
    try {
      if (editingJob) {
        await updateDoc(doc(db, 'jobs', editingJob), {
          ...jobForm,
          updatedAt: serverTimestamp(),
        });
        toast.success('Offre mise à jour.');
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...jobForm,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Offre créée.');
      }
      setJobModalOpen(false);
      fetchJobs();
    } catch (err) {
      console.error('saveJob error', err);
      toast.error('Impossible d\'enregistrer l\'offre.');
    }
  };

  const removeJob = async (jobId) => {
    if (!confirm('Supprimer définitivement cette offre ?')) return;
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      toast.success('Offre supprimée.');
      fetchJobs();
    } catch (err) {
      console.error('removeJob error', err);
      toast.error('Impossible de supprimer l\'offre.');
    }
  };

  const togglePublish = async (job) => {
    if (!job?.id) {
      console.error('togglePublish: missing job id', job);
      toast.error('ID de l\'offre introuvable.');
      return;
    }

    try {
      await updateDoc(doc(db, 'jobs', job.id), { isPublished: !job.isPublished, updatedAt: serverTimestamp() });
      await fetchJobs();
      toast.success(`Offre ${job.isPublished ? 'dépubliée' : 'publiée'}.`);
    } catch (err) {
      console.error('togglePublish error', err);
      const message = err?.message || String(err);
      toast.error(`Impossible de mettre à jour le statut de publication: ${message}`);
    }
  };

  React.useEffect(() => {
    applyFilters(recruiters, searchQuery, statusFilter, sortOption);
  }, [recruiters, searchQuery, statusFilter, sortOption]);

  const applyFilters = (list, search, status, sort = sortOption) => {
    let filtered = list;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        (r.displayName || r.company || '').toLowerCase().includes(s) ||
        (r.email || '').toLowerCase().includes(s) ||
        (r.niu || '').toLowerCase().includes(s)
      );
    }
    if (status === 'validated') filtered = filtered.filter(r => r.isValidated);
    else if (status === 'pending') filtered = filtered.filter(r => !r.isValidated);
    setFilteredRecruiters(sortRecruiters(filtered, sort));
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    applyFilters(recruiters, value, statusFilter, sortOption);
  };

  const handleFilter = (f) => {
    setStatusFilter(f);
    applyFilters(recruiters, searchQuery, f, sortOption);
  };

  const handleSort = (option) => {
    setSortOption(option);
    applyFilters(recruiters, searchQuery, statusFilter, option);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchRecruiters(false);
  };

  const handleBulkApprove = async () => {
    const candidates = filteredRecruiters.filter(recruiter =>
      !recruiter.isValidated &&
      recruiter.validationSteps?.step1_dgi === true &&
      recruiter.validationSteps?.step2_email === true
    );

    if (candidates.length === 0) {
      toast.error('Aucun recruteur visible prêt pour approbation en masse.');
      return;
    }

    if (!window.confirm(`Approuver ${candidates.length} recruteur(s) visibles ?`)) {
      return;
    }

    setBulkUpdating(true);
    const results = await Promise.allSettled(candidates.map(async (recruiter) => {
      const ref = doc(db, 'users', recruiter.id);
      await updateDoc(ref, {
        isValidated: true,
        kycStatus: 'verified',
        'validationSteps.step3_approved': true,
        'validationSteps.step3_at': serverTimestamp(),
        validatedAt: serverTimestamp(),
        validatedBy: auth.currentUser?.uid,
        validatedCompany: recruiter.displayName || recruiter.company,
      });
      return recruiter.id;
    }));

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    const updatedIds = results.filter(res => res.status === 'fulfilled').map(res => res.value);
    setRecruiters(prev => prev.map(r => {
      if (updatedIds.includes(r.id)) {
        return {
          ...r,
          isValidated: true,
          kycStatus: 'verified',
          validationSteps: { ...(r.validationSteps || {}), step3_approved: true, step3_at: new Date() },
          validatedAt: new Date(),
        };
      }
      return r;
    }));

    setBulkUpdating(false);
    toast.success(`Approuvé ${successCount} recruteur(s). ${failedCount ? `${failedCount} erreurs.` : ''}`);
  };

  // Étape 1 : Vérification DGI (manuelle par l'admin)
  const handleStep1Dgi = async (recruiterId, approved) => {
    setUpdating(recruiterId);
    try {
      const ref = doc(db, 'users', recruiterId);
      await updateDoc(ref, {
        'validationSteps.step1_dgi': approved,
        'validationSteps.step1_at': serverTimestamp(),
      });
      // Rafraîchir
      setRecruiters(prev => prev.map(r =>
        r.id === recruiterId ? {
          ...r,
          validationSteps: { ...(r.validationSteps || {}), step1_dgi: approved, step1_at: new Date() }
        } : r
      ));
      toast.success(approved ? 'Étape 1 (DGI) validée ✓' : 'Étape 1 (DGI) refusée ✗');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setUpdating(null);
    }
  };

  // Étape 2 : Vérification email professionnel
  const handleStep2Email = async (recruiterId, email) => {
    setUpdating(recruiterId);
    const isPro = !isFreeEmailProvider(email);
    try {
      const ref = doc(db, 'users', recruiterId);
      await updateDoc(ref, {
        'validationSteps.step2_email': isPro,
        'validationSteps.step2_at': serverTimestamp(),
      });
      setRecruiters(prev => prev.map(r =>
        r.id === recruiterId ? {
          ...r,
          validationSteps: { ...(r.validationSteps || {}), step2_email: isPro, step2_at: new Date() }
        } : r
      ));
      toast.success(isPro
        ? 'Étape 2 (Email pro) validée ✓'
        : 'Étape 2 : email gratuit détecté ✗');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setUpdating(null);
    }
  };

  // Étape 3 : Approbation finale → isValidated = true + kycStatus = 'verified'
  const handleApprove = async (recruiterId, companyName) => {
    setUpdating(recruiterId);
    try {
      const ref = doc(db, 'users', recruiterId);
      await updateDoc(ref, {
        isValidated: true,
        kycStatus: 'verified',
        'validationSteps.step3_approved': true,
        'validationSteps.step3_at': serverTimestamp(),
        validatedAt: serverTimestamp(),
        validatedBy: auth.currentUser?.uid,
        validatedCompany: companyName,
      });
      setRecruiters(prev => prev.map(r =>
        r.id === recruiterId ? {
          ...r,
          isValidated: true,
          kycStatus: 'verified',
          validationSteps: { ...(r.validationSteps || {}), step3_approved: true, step3_at: new Date() },
          validatedAt: new Date(),
        } : r
      ));
      toast.success(`${companyName || 'Recruteur'} est maintenant vérifié ✓`);
    } catch (err) {
      toast.error('Erreur lors de la validation.');
    } finally {
      setUpdating(null);
    }
  };

  // Rejeter le recruteur
  const handleReject = async (recruiterId, companyName) => {
    setUpdating(recruiterId);
    try {
      const ref = doc(db, 'users', recruiterId);
      await updateDoc(ref, {
        isValidated: false,
        kycStatus: 'unverified',
        'validationSteps.step3_approved': false,
        'validationSteps.step3_at': serverTimestamp(),
      });
      setRecruiters(prev => prev.map(r =>
        r.id === recruiterId ? {
          ...r,
          isValidated: false,
          kycStatus: 'unverified',
          validationSteps: { ...(r.validationSteps || {}), step3_approved: false, step3_at: new Date() },
        } : r
      ));
      toast.error(`${companyName || 'Recruteur'} a été rejeté.`);
    } catch (err) {
      toast.error('Erreur lors du rejet.');
    } finally {
      setUpdating(null);
    }
  };

  // Reports moderation helpers
  const updateReportStatus = async (reportId, status) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status, reviewedAt: serverTimestamp(), reviewedBy: auth.currentUser?.uid });
      setReports(prev => prev.filter(r => r.id !== reportId));
      setReportsCount(c => Math.max(0, c - 1));
      toast.success('Signalement mis à jour.');
    } catch (err) {
      console.error('updateReportStatus error', err);
      toast.error('Impossible de mettre à jour le signalement.');
    }
  };

  const suspendUser = async (userId, reason = 'Suspension manuelle par admin') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isSuspended: true,
        kycStatus: 'suspended',
        suspendedAt: serverTimestamp(),
        suspensionReason: reason,
      });
      toast.success('Utilisateur suspendu.');
    } catch (err) {
      console.error('suspendUser error', err);
      toast.error('Impossible de suspendre l\'utilisateur.');
    }
  };

  // Stats
  const totalRecruiters = recruiters.length;
  const validatedCount = recruiters.filter(r => r.isValidated).length;
  const pendingCount = recruiters.filter(r => !r.isValidated).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-32">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-sky-950 via-indigo-950 to-sky-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                    <ShieldCheck size={24} className="text-cyan-400" />
                    Administration
                  </h1>
                  <p className="text-sky-300 text-xs font-medium mt-0.5">Validation des recruteurs</p>
                </div>
              </div>
              <button
                onClick={fetchRecruiters}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                title="Rafraîchir"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* JOBS MANAGEMENT */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg text-sky-800 dark:text-white">Gérer les offres</h2>
            <div className="flex items-center gap-2">
              <button onClick={openCreateJob} className="px-3 py-2 rounded-xl bg-sky-500 text-white text-sm flex items-center gap-2">
                <PlusSquare size={16} /> Ajouter offre
              </button>
              <button onClick={fetchJobs} className="px-3 py-2 rounded-xl bg-white dark:bg-transparent border border-sky-100 dark:border-gray-700 text-sm text-sky-800 dark:text-white">Rafraîchir</button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-sky-100 dark:border-gray-700">
            {jobsLoading ? (
              <div className="text-sm text-white/80">Chargement des offres...</div>
            ) : jobs.length === 0 ? (
              <div className="text-sm text-white/80">Aucune offre trouvée.</div>
            ) : (
              <div className="space-y-2">
                {jobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-sky-600 dark:bg-gray-800">
                    <div>
                      <div className="font-bold text-white">{job.title}</div>
                      <div className="text-sm text-white/85">{job.company} — {job.location || '—'}</div>
                      <div className="text-[11px] text-white/70">{job.createdAt?.toDate ? job.createdAt.toDate().toLocaleString() : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePublish(job)} className={`px-2 py-1 rounded text-xs ${job.isPublished ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>{job.isPublished ? 'Publié' : 'Brouillon'}</button>
                      <button onClick={() => openEditJob(job)} className="p-2 rounded bg-white/90 border border-white/20 text-sky-800"><Edit3 size={16} /></button>
                      <button onClick={() => removeJob(job.id)} className="p-2 rounded bg-white/90 border border-white/20 text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JOB MODAL */}
        {jobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl border shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black">{editingJob ? 'Modifier une offre' : 'Nouvelle offre'}</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setJobModalOpen(false)} className="px-3 py-1 rounded-lg text-xs">Fermer</button>
                </div>
              </div>
              <div className="space-y-3">
                <input value={jobForm.title} onChange={e => setJobForm(s => ({ ...s, title: e.target.value }))} placeholder="Titre" className="w-full px-3 py-2 rounded-xl border" />
                <input value={jobForm.company} onChange={e => setJobForm(s => ({ ...s, company: e.target.value }))} placeholder="Entreprise" className="w-full px-3 py-2 rounded-xl border" />
                <input value={jobForm.location} onChange={e => setJobForm(s => ({ ...s, location: e.target.value }))} placeholder="Localisation" className="w-full px-3 py-2 rounded-xl border" />
                <textarea value={jobForm.description} onChange={e => setJobForm(s => ({ ...s, description: e.target.value }))} placeholder="Description" className="w-full px-3 py-2 rounded-xl border h-28" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={jobForm.isPublished} onChange={e => setJobForm(s => ({ ...s, isPublished: e.target.checked }))} /> Publiée</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setJobModalOpen(false)} className="px-3 py-2 rounded-xl text-sm">Annuler</button>
                    <button onClick={saveJob} className="px-3 py-2 rounded-xl bg-sky-500 text-white">Enregistrer</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* STATS CARDS */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-20">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-sky-100 dark:border-gray-700 text-center">
              <Users size={20} className="text-sky-400 mx-auto mb-1" />
              <span className="text-2xl font-black text-sky-800 dark:text-gray-100 block">{totalRecruiters}</span>
              <span className="text-[10px] font-bold text-sky-400 uppercase">Total</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-teal-100 dark:border-teal-900/30 text-center">
              <BadgeCheck size={20} className="text-teal-500 mx-auto mb-1" />
              <span className="text-2xl font-black text-teal-600 dark:text-teal-400 block">{validatedCount}</span>
              <span className="text-[10px] font-bold text-teal-500 uppercase">Vérifiés</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/30 text-center">
              <AlertTriangle size={20} className="text-amber-500 mx-auto mb-1" />
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">{pendingCount}</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase">En attente</span>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-sky-100 dark:border-gray-700 text-center">
              <Building2 size={20} className="text-sky-400 mx-auto mb-1" />
              <span className="text-2xl font-black text-sky-800 dark:text-gray-100 block">{jobsCount}</span>
              <span className="text-[10px] font-bold text-sky-400 uppercase">Offres</span>
            </div>
          </div>
        </div>

        {/* FILTRES + RECHERCHE */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Rechercher par nom, entreprise, email, NIU..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-sky-100 dark:border-gray-700 rounded-xl outline-none text-sm text-sky-700 dark:text-gray-300 focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'pending', 'validated'].map(f => (
                  <button
                    key={f}
                    onClick={() => handleFilter(f)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      statusFilter === f
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-sky-500 border border-sky-100 dark:border-gray-700 hover:bg-sky-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Vérifiés'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-sky-500">Trier</span>
                <select
                  value={sortOption}
                  onChange={(e) => handleSort(e.target.value)}
                  className="rounded-xl border border-sky-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-sky-700 dark:text-gray-200 px-3 py-2 outline-none"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleBulkApprove}
                disabled={bulkUpdating}
                className="px-4 py-2.5 rounded-xl bg-teal-500 text-white text-xs font-bold hover:bg-teal-600 disabled:opacity-50"
              >
                {bulkUpdating ? 'Validation de masse...' : 'Valider visibles'}
              </button>
              <button
                onClick={() => { fetchCounts(); setShowReportsModal(true); }}
                className="px-3 py-2.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 disabled:opacity-50 ml-2"
                title="Gérer les signalements"
              >
                {reportsCount ? `${reportsCount} signalement(s)` : 'Signalements'}
              </button>
            </div>
          </div>
        </div>

        {/* REPORTS MODAL */}
        {showReportsModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl border shadow-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black">Signalements en attente ({reportsCount})</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowReportsModal(false)} className="px-3 py-1 rounded-lg text-xs">Fermer</button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {reports.length === 0 ? (
                  <div className="text-sm text-sky-500">Aucun signalement récent à afficher.</div>
                ) : reports.map(r => (
                  <div key={r.id} className="p-3 border rounded-xl bg-sky-50 dark:bg-gray-700 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-xs text-sky-600 mb-1"><strong>Motif:</strong> {r.reason}</div>
                      <div className="text-sm text-sky-800 dark:text-gray-100 mb-1">{r.details || '—'}</div>
                      <div className="text-[11px] text-sky-500">Cible: {r.targetType} / {r.targetId}</div>
                    </div>
                    <div className="flex flex-col gap-2 ml-3 shrink-0">
                      <button onClick={() => updateReportStatus(r.id, 'under_review')} className="px-3 py-1 text-xs rounded-lg bg-amber-100 text-amber-700">En cours</button>
                      <button onClick={() => updateReportStatus(r.id, 'resolved')} className="px-3 py-1 text-xs rounded-lg bg-teal-100 text-teal-700">Résolu</button>
                      <button onClick={async () => { await suspendUser(r.targetId); await updateReportStatus(r.id, 'resolved'); }} className="px-3 py-1 text-xs rounded-lg bg-red-100 text-red-700">Suspendre</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LISTE RECRUTEURS */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-3">
          {filteredRecruiters.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-sky-100 dark:border-gray-700">
              <Users size={48} className="text-sky-200 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sky-400 dark:text-gray-400 font-bold">Aucun recruteur trouvé</p>
            </div>
          ) : (
            filteredRecruiters.map(recruiter => {
              const steps = recruiter.validationSteps || {};
              const step1Done = steps.step1_dgi === true;
              const step2Done = steps.step2_email === true;
              const allStepsOk = step1Done && step2Done;

              return (
                <div
                  key={recruiter.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all ${
                    recruiter.isValidated
                      ? 'border-teal-200 dark:border-teal-900/30'
                      : 'border-sky-100 dark:border-gray-700'
                  }`}
                >
                  {/* LIGNE PRINCIPALE */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
                      {(recruiter.displayName || recruiter.company || '?').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-sky-800 dark:text-gray-100 truncate">
                          {recruiter.displayName || recruiter.company || 'Anonyme'}
                        </h3>
                        {recruiter.isValidated ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1">
                            <BadgeCheck size={11} /> Vérifié
                          </span>
                        ) : recruiter.validationPriority === 'high' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <Star size={11} /> Prioritaire
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock size={11} /> En attente
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-sky-500 dark:text-gray-400 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1"><Mail size={11} /> {recruiter.email}</span>
                        {recruiter.niu && <span className="flex items-center gap-1"><Hash size={11} /> NIU: {recruiter.niu}</span>}
                        {recruiter.createdAt?.toDate && (
                          <span className="flex items-center gap-1"><Clock size={11} /> {recruiter.createdAt.toDate().toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Indicateurs d'étapes */}
                      <span className={`w-2 h-2 rounded-full ${step1Done ? 'bg-teal-500' : 'bg-sky-200'}`} title="Étape 1: DGI" />
                      <span className={`w-2 h-2 rounded-full ${step2Done ? 'bg-teal-500' : 'bg-sky-200'}`} title="Étape 2: Email pro" />
                      <button
                        onClick={() => setExpandedId(expandedId === recruiter.id ? null : recruiter.id)}
                        className={`p-2 rounded-xl transition-all ${
                          expandedId === recruiter.id
                            ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600'
                            : 'hover:bg-sky-50 dark:hover:bg-gray-700 text-sky-400'
                        }`}
                      >
                        <ChevronDown size={16} className={`transition-transform ${expandedId === recruiter.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* PANNEAU DÉTAILS */}
                  {expandedId === recruiter.id && (
                    <div className="px-4 pb-4 border-t border-sky-50 dark:border-gray-700 pt-4 space-y-4">
                      {/* ÉTAPE 1 : Vérification DGI */}
                      <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-4 border border-sky-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase flex items-center gap-2">
                            <FileSearch size={14} className="text-cyan-500" />
                            Étape 1 — Vérification DGI
                          </h4>
                          {step1Done !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              step1Done ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {step1Done ? '✓ Validé' : '✗ Non validé'}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-sky-600 dark:text-gray-300 mb-3">
                          <div>
                            <span className="font-bold text-sky-400 block mb-0.5">Nom entreprise</span>
                            {recruiter.displayName || recruiter.company || 'Non renseigné'}
                          </div>
                          <div>
                            <span className="font-bold text-sky-400 block mb-0.5">NIU</span>
                            {recruiter.niu || 'Non renseigné'}
                          </div>
                        </div>
                        <p className="text-[11px] text-sky-400 dark:text-gray-400 mb-3">
                          Vérifiez l'existence de l'entreprise sur le portail de la DGI avec le NIU ou le nom.
                        </p>
                        <div className="flex gap-2">
                          <a
                            href="https://www.impots.cm"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-sky-100 dark:bg-gray-600 text-sky-600 dark:text-gray-300 hover:bg-sky-200 flex items-center gap-1"
                          >
                            <ExternalLink size={11} /> Portail DGI
                          </a>
                          <button
                            onClick={() => handleStep1Dgi(recruiter.id, true)}
                            disabled={updating === recruiter.id}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle2 size={11} /> Valider DGI
                          </button>
                          <button
                            onClick={() => handleStep1Dgi(recruiter.id, false)}
                            disabled={updating === recruiter.id}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle size={11} /> Refuser
                          </button>
                        </div>
                      </div>

                      {/* ÉTAPE 2 : Vérification email */}
                      <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-4 border border-sky-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase flex items-center gap-2">
                            <Mail size={14} className="text-cyan-500" />
                            Étape 2 — Email professionnel
                          </h4>
                          {step2Done !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              step2Done ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {step2Done ? '✓ Pro' : '✗ Gratuit'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono text-sky-700 dark:text-gray-300 mb-2">{recruiter.email}</p>
                        <p className={`text-[11px] mb-3 ${isFreeEmailProvider(recruiter.email || '') ? 'text-red-500' : 'text-teal-600'}`}>
                          {isFreeEmailProvider(recruiter.email || '')
                            ? '⚠ Email gratuit détecté (Gmail, Yahoo, etc.) — non professionnel.'
                            : '✓ Email professionnel détecté.'}
                        </p>
                        <button
                          onClick={() => handleStep2Email(recruiter.id, recruiter.email || '')}
                          disabled={updating === recruiter.id}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          <RefreshCw size={11} /> Vérifier maintenant
                        </button>
                      </div>

                      {/* ÉTAPE 3 : Approbation / Rejet */}
                      <div className={`rounded-xl p-4 border ${
                        recruiter.isValidated
                          ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-900/30'
                          : 'bg-sky-50 dark:bg-gray-700/50 border-sky-100 dark:border-gray-700'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase flex items-center gap-2">
                            <BadgeCheck size={14} className="text-cyan-500" />
                            Étape 3 — Badge de confiance
                          </h4>
                          {recruiter.isValidated && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700">
                              ✓ Approuvé
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-sky-400 dark:text-gray-400 mb-3">
                          {allStepsOk
                            ? 'Toutes les vérifications sont au vert. Vous pouvez approuver ce recruteur.'
                            : 'Les étapes 1 et 2 doivent être validées avant l\'approbation.'}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(recruiter.id, recruiter.displayName || recruiter.company)}
                            disabled={updating === recruiter.id || recruiter.isValidated || !allStepsOk}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <UserCheck size={13} /> Approuver & Badge vérifié
                          </button>
                          {recruiter.isValidated && (
                            <button
                              onClick={() => handleReject(recruiter.id, recruiter.displayName || recruiter.company)}
                              disabled={updating === recruiter.id}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <XCircle size={13} /> Révoquer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AnimatedPage>
  );
};

export default AdminDashboard;
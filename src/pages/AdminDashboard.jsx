import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, ShieldAlert, Shield, Search, CheckCircle2, XCircle, Eye, ExternalLink,
  Building2, Mail, Hash, Clock, ArrowLeft, Users, Filter, RefreshCw, ChevronDown,
  BadgeCheck, FileSearch, AlertTriangle, UserCheck, Star
} from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';

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

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recruiters, setRecruiters] = useState([]);
  const [filteredRecruiters, setFilteredRecruiters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);

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
    });

    return () => unsubscribe();
  }, []);

  const fetchRecruiters = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['recruiter', 'recruteur'])
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Trier : non validés d'abord, puis par date de création
      list.sort((a, b) => {
        if (a.isValidated !== b.isValidated) return a.isValidated ? 1 : -1;
        // Priorité haute d'abord
        const prioA = a.validationPriority === 'high' ? 0 : 1;
        const prioB = b.validationPriority === 'high' ? 0 : 1;
        if (prioA !== prioB) return prioA - prioB;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setRecruiters(list);
      applyFilters(list, searchQuery, statusFilter);
    } catch (err) {
      console.error('Erreur chargement recruteurs:', err);
      toast.error('Impossible de charger la liste des recruteurs.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (list, search, status) => {
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
    setFilteredRecruiters(filtered);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    applyFilters(recruiters, e.target.value, statusFilter);
  };

  const handleFilter = (f) => {
    setStatusFilter(f);
    applyFilters(recruiters, searchQuery, f);
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

        {/* STATS CARDS */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-20">
          <div className="grid grid-cols-3 gap-3">
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
          </div>
        </div>

        {/* FILTRES + RECHERCHE */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="flex gap-2">
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
        </div>

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
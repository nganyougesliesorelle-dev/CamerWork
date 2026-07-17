import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Briefcase, MapPin, Link as LinkIcon, Save, ArrowLeft, 
  Plus, X, Upload, FileText, Clock, CheckCircle2, XCircle, MessageSquare, 
  Camera, Calendar, TrendingUp, Users, UserPlus, MessageCircle, ChevronRight, Settings,
  Image, FolderOpen, Trash2, Edit3, Building2, Sparkles, Globe, Heart, Bell,
} from 'lucide-react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db, storage } from '../firebase/firebaseConfig';
import { doc, getDoc, getDocs, updateDoc, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth'; 
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadCV } from '../firebase/authService';
import { CvGeneratorButton } from '../composants/CvGenerator';
import { KycBadge } from '../composants/KycBadge'; 
import { calculateMatchingScore } from '../firebase/matchingEngine';
import { requestNotificationPermission } from '../firebase/notificationService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AnimatedPage } from '../composants/AnimatedPage';
import { MfaSetup } from '../security/MfaSetup';

const CAMEROON_CITIES = [
  "Yaoundé", "Douala", "Garoua", "Maroua", "Bafoussam", 
  "Bamenda", "Ngaoundéré", "Buea", "Bertoua", "Ebolowa", 
  "Kribi", "Limbe", "Dschang", "Foumban"
];

export function Profile() {
  const { t } = useTranslation();
  const { id } = useParams(); 
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);
  const portfolioInputRef = useRef(null);
  
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [applications, setApplications] = useState([]); 
  const [uploading, setUploading] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [matchScores, setMatchScores] = useState({});
  const candidateRef = useRef(null);
  const [hasScheduledInterview, setHasScheduledInterview] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [checkingInterview, setCheckingInterview] = useState(false);

  const isMyProfile = !id || id === auth.currentUser?.uid;

  // Ã‰coute des notifications non lues pour le badge
  useEffect(() => {
    if (!isMyProfile) return;
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setUnreadNotifs(snap.docs.filter(d => !d.data().read).length);
    });
  }, [isMyProfile]);

  // Calcul dynamique des stats du graphique à partir des candidatures réelles
  const computeChartData = () => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const postulations = Array(7).fill(0);
    const recruteursSet = Array(7).fill(null).map(() => new Set());
    
    applications.forEach(app => {
      if (app.appliedAt?.toDate) {
        const d = app.appliedAt.toDate();
        const dayIdx = (d.getDay() + 6) % 7; // dim=6, lun=0, ..., sam=5
        postulations[dayIdx]++;
        if (app.recruiterId) recruteursSet[dayIdx].add(app.recruiterId);
      }
    });
    
    const hasData = postulations.some(v => v > 0);
    if (!hasData) {
      // Fallback: données vides
      return days.map(name => ({ name, Postulations: 0, Recruteurs: 0 }));
    }
    
    return days.map((name, i) => ({
      name,
      Postulations: postulations[i],
      Recruteurs: recruteursSet[i].size,
    }));
  };
  
  const statsData = computeChartData();

  const suggestedProfiles = [
    { id: '1', name: 'Jean Marc', role: 'Développeur Java', avatar: null },
    { id: '2', name: 'Sorelle N.', role: 'UI/UX Designer', avatar: null },
    { id: '3', name: 'Alain Tech', role: 'Recruteur - Orange', avatar: null },
  ];

  useEffect(() => {
    const fetchProfile = async (targetId) => {
      try {
        const docRef = doc(db, "users", targetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCandidate(data);
          candidateRef.current = data;
        }
      } catch (error) {
        console.error("Erreur profil:", error);
        toast.error(t('profile.loading_error'));
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = (uid) => {
      const q = query(
        collection(db, "applications"),
        where("candidateId", "==", uid),
        orderBy("appliedAt", "desc")
      );

      let isInitialLoad = true; 

      return onSnapshot(q, (snapshot) => {
        const updatedApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!isInitialLoad) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              const appData = change.doc.data();
              if (appData.status === "accepted" || appData.status === "retenu") {
                toast.success(t('notifications.application_accepted_title', { jobTitle: appData.jobTitle }), { duration: 5000 });
              } else if (appData.status === "rejected" || appData.status === "refusé") {
                toast.error(t('notifications.application_rejected_body', { jobTitle: appData.jobTitle, company: '' }), { duration: 5000 });
              }
            }
          });
        }

        setApplications(updatedApps);
        isInitialLoad = false;
        
        const jobsCache = {};
        updatedApps.forEach(async (app) => {
          try {
            if (app.jobId && !jobsCache[app.jobId]) {
              const jobSnap = await getDoc(doc(db, "jobs", app.jobId));
              jobsCache[app.jobId] = jobSnap.exists() ? { id: jobSnap.id, ...jobSnap.data() } : null;
            }
            const job = jobsCache[app.jobId];
            if (job && candidateRef.current) {
              const score = calculateMatchingScore(candidateRef.current, job);
              setMatchScores(prev => ({ ...prev, [app.id]: score }));
            }
          } catch (_e) { /* ignore */ }
        });
      }, (err) => {
        console.error("Erreur historique applications:", err);
      });
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const targetId = id || user?.uid;
      if (!targetId) {
        setLoading(false);
        return;
      }
      fetchProfile(targetId);
      
      if (user) {
        requestNotificationPermission(user.uid);
      }

      // Vérifier si un entretien est programmé (pour le visiteur non-propriétaire)
      if (!isMyProfile && user) {
        setCheckingInterview(true);
        const appQ = query(
          collection(db, "applications"),
          where("candidateId", "==", targetId),
          where("recruiterId", "==", user.uid)
        );
        getDocs(appQ).then(snap => {
          const hasAccepted = snap.docs.some(d => {
            const s = d.data().status;
            return s === 'accepted' || s === 'retenu';
          });
          setHasScheduledInterview(hasAccepted);
          setCheckingInterview(false);
        }).catch(() => setCheckingInterview(false));
      }

      if (isMyProfile) {
        const unsubscribeHistory = fetchHistory(targetId);
        return () => {
          if (unsubscribeHistory) unsubscribeHistory();
        };
      }
    });

    return () => unsubscribe();
  }, [id, isMyProfile]);

  const handleSave = async () => {
    if (!auth.currentUser) return toast.error(t('profile.must_login'));
    
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, {
        summary: candidate.summary || "",
        phone: candidate.phone || "",
        skills: candidate.skills || [],
        location: candidate.location || "",
        cvUrl: candidate.cvUrl || "",
        gender: candidate.gender || "",
        birthDate: candidate.birthDate || "",
        username: candidate.username || "",
        portfolioUrls: candidate.portfolioUrls || [],
        expectedSalary: candidate.expectedSalary || "",
        maritalStatus: candidate.maritalStatus || "",
      });
      setIsEditing(false);
      toast.success(t('notifications.success_profile_saved'));
    } catch (_error) {
      toast.error(t('profile.save_error'));
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const result = await uploadCV(file, auth.currentUser.uid);

    if (result.success) {
      setCandidate({ ...candidate, photoURL: result.url });
      try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: result.url });
        toast.success(t('notifications.success_avatar'));
      } catch (_err) {
        toast.error(t('profile.image_error'));
      }
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPortfolio(true);
    const currentUrls = candidate.portfolioUrls || [];
    const newUrls = [...currentUrls];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} ${t('profile.not_image')}`);
          continue;
        }
        const storageRef = ref(storage, `portfolios/${auth.currentUser.uid}_${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        newUrls.push(downloadURL);
      }
      
      setCandidate({ ...candidate, portfolioUrls: newUrls });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { portfolioUrls: newUrls });
      toast.success(`${files.length} ${t('profile.portfolio_added')}`);
    } catch (_err) {
      toast.error(t('profile.portfolio_error'));
    } finally {
      setUploadingPortfolio(false);
      if (portfolioInputRef.current) portfolioInputRef.current.value = '';
    }
  };

  const handleRemovePortfolioImage = async (urlToRemove) => {
    const newUrls = (candidate.portfolioUrls || []).filter(u => u !== urlToRemove);
    setCandidate({ ...candidate, portfolioUrls: newUrls });
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { portfolioUrls: newUrls });
      toast.success(t('profile.portfolio_removed'));
    } catch (_err) {
      toast.error(t('profile.portfolio_remove_error'));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error(t('profile.pdf_only'));

    setUploading(true);
    const result = await uploadCV(file, auth.currentUser.uid);
    setUploading(false);

    if (result.success) {
      setCandidate({ ...candidate, cvUrl: result.url, cvName: file.name });
      toast.success(t('notifications.success_cv_uploaded'));
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !candidate.skills?.includes(newSkill.trim())) {
      setCandidate({
        ...candidate, 
        skills: [...(candidate.skills || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setCandidate({
      ...candidate,
      skills: candidate.skills.filter(s => s !== skillToRemove)
    });
  };

  // Ajout d'ami : crée une relation + notification
  const handleAddFriend = async (targetId, targetName) => {
    const user = auth.currentUser;
    if (!user) return toast.error(t('profile.must_login'));
    try {
      // Créer la relation dans Firestore
      await addDoc(collection(db, 'relations'), {
        requesterId: user.uid,
        targetId,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      // Notifier le destinataire
      await addDoc(collection(db, 'notifications'), {
        userId: targetId,
        title: 'Nouvelle demande de connexion',
        message: `${candidate?.displayName || candidate?.fullName || 'Quelqu\'un'} souhaite se connecter avec vous.`,
        type: 'connection_request',
        read: false,
        createdAt: serverTimestamp(),
      });
      toast.success(`Demande envoyée à ${targetName} !`);
    } catch (_e) {
      toast.error(t('notifications.message_error'));
    }
  };


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-500 dark:text-gray-300 font-medium text-sm">{t('profile.loading')}</p>
      </div>
    </div>
  );

  if (!candidate) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 dark:bg-gray-900 p-6 text-center">
      <User size={64} className="text-sky-300 dark:text-gray-500 mb-4" />
      <h2 className="text-2xl font-black text-sky-800 dark:text-gray-100 mb-2">{t('profile.not_found')}</h2>
      <button onClick={() => navigate('/offres')} className="bg-cyan-500 text-white px-8 py-3 rounded-2xl font-black mt-4 shadow-lg hover:bg-cyan-600 transition-all">
        {t('profile.back_to_offers')}
      </button>
    </div>
  );

  const isCandidateUser = candidate.role === 'candidate' || candidate.role === 'candidat' || candidate.role === 'student';
  const acceptedApps = applications.filter(app => app.status === 'accepted' || app.status === 'retenu');
  const portfolioUrls = candidate.portfolioUrls || [];
  const avgScore = (() => {
    const scores = Object.values(matchScores).filter(s => s > 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  })();

  return (
    <AnimatedPage>
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-32">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="mb-6 flex items-center gap-2 text-sky-300 dark:text-gray-400 hover:text-white transition-colors font-bold text-sm"
          >
            <ArrowLeft size={18} /> {t('common.back')}
          </button>
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            {/* Avatar dans le header */}
            <div className="relative shrink-0 group">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-sky-800 dark:bg-gray-700 rounded-2xl border-4 border-white/20 shadow-2xl dark:shadow-gray-900/30 overflow-hidden flex items-center justify-center text-sky-300 dark:text-gray-400 font-black text-3xl md:text-4xl uppercase">
                {candidate.photoURL ? (
                  <img src={candidate.photoURL} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  (candidate.displayName || candidate.fullName || "U").charAt(0)
                )}
              </div>
              {isMyProfile && (
                <>
                  <button 
                    type="button"
                    onClick={() => avatarInputRef.current.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 md:p-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-400 transition-all shadow-lg"
                  >
                    <Camera size={14} />
                  </button>
                  <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl md:text-3xl font-black tracking-tight truncate">
                  {candidate.displayName || candidate.fullName || "Utilisateur"}
                </h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {candidate.role === 'recruiter' ? t('profile.recruiter') : t('profile.candidate')}
                </span>
                {candidate.role === 'recruiter' && <KycBadge status={candidate.kycStatus || 'unverified'} isValidated={candidate.isValidated} />}
              </div>
              {isMyProfile || hasScheduledInterview ? (
                <p className="text-sky-300 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                  <Mail size={14} /> {candidate.email}
                </p>
              ) : (
                <p className="text-sky-300/60 dark:text-gray-500 text-sm font-medium flex items-center gap-2 italic">
                  <Mail size={14} /> Email masqué — Planifiez un entretien pour le débloquer
                </p>
              )}
              {candidate.username && (
                <p className="text-cyan-400 text-sm font-semibold mt-0.5">@{candidate.username}</p>
              )}
              {(isMyProfile || hasScheduledInterview) && candidate.phone && (
                <p className="text-sky-400 dark:text-gray-400 text-xs font-medium mt-1 flex items-center gap-1">
                  <Phone size={12} /> {candidate.phone}
                </p>
              )}
              {candidate.location && (
                <p className="text-sky-400 dark:text-gray-400 text-xs font-medium mt-1 flex items-center gap-1">
                  <MapPin size={12} /> {candidate.location}
                </p>
              )}
            </div>

            {/* Quick actions + CV Generator */}
            <div className="flex gap-3 shrink-0 items-center">
              {/* Messagerie */}
              {isMyProfile && (
                <button
                  onClick={() => navigate('/messages')}
                  className="p-2.5 bg-white/10 dark:bg-gray-800/30 text-white hover:bg-white/20 border border-white/10 dark:border-gray-700 rounded-xl transition-all relative"
                  title="Messages"
                >
                  <MessageCircle size={18} />
                </button>
              )}
              {/* Notifications */}
              {isMyProfile && (
                <button
                  onClick={() => navigate('/notifications')}
                  className="p-2.5 bg-white/10 dark:bg-gray-800/30 text-white hover:bg-white/20 border border-white/10 dark:border-gray-700 rounded-xl transition-all relative"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </button>
              )}

              {isCandidateUser && isMyProfile && (
                <CvGeneratorButton profile={candidate} />
              )}
            {isMyProfile && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    isEditing 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'bg-white/10 dark:bg-gray-800/30 text-white hover:bg-white/20 border border-white/10 dark:border-gray-700'
                  }`}
                >
                  {isEditing ? t('profile.cancel') : t('profile.edit')}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2.5 bg-cyan-500 text-white rounded-xl text-xs font-black hover:bg-cyan-400 transition-all flex items-center gap-1.5"
                  >
                    <Save size={14} /> {t('profile.save')}
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - 2 COLUMNS */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ===== LEFT COLUMN (1/3) ===== */}
          <div className="lg:col-span-1 space-y-5">
            
            {/* Portfolio Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen size={16} className="text-cyan-500" /> Portfolio
                </h3>
                {isMyProfile && (
                  <label className="cursor-pointer flex items-center gap-1.5 text-xs font-black text-cyan-500 hover:text-cyan-600 transition-colors bg-cyan-50 dark:bg-cyan-900/30 px-3 py-1.5 rounded-lg">
                    <Upload size={13} />
                    {uploadingPortfolio ? 'Envoi...' : 'Ajouter'}
                    <input 
                      type="file" 
                      ref={portfolioInputRef} 
                      onChange={handlePortfolioUpload} 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              {portfolioUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {portfolioUrls.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-sky-50 dark:bg-gray-700/50 border border-sky-100 dark:border-gray-700">
                      <img src={url} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isMyProfile && (
                          <button 
                            onClick={() => handleRemovePortfolioImage(url)}
                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sky-400 dark:text-gray-400">
                  <Image size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">
                    {isMyProfile ? "Ajoutez des images de vos réalisations" : "Aucun portfolio pour le moment"}
                  </p>
                </div>
              )}
            </div>

            {/* Contact & Quick Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5 space-y-3">
              <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                <User size={16} className="text-cyan-500" /> Contact
              </h3>
              
              <div className="space-y-2">
                {candidate.phone && (isMyProfile || hasScheduledInterview) ? (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={15} className="text-sky-400 dark:text-gray-400 shrink-0" />
                    <span className="text-sky-700 dark:text-gray-300 font-medium">{candidate.phone}</span>
                  </div>
                ) : candidate.phone && !isMyProfile ? (
                  <div className="flex items-center gap-3 text-sm text-sky-400 dark:text-gray-400 italic">
                    <Phone size={15} className="text-sky-300 dark:text-gray-500 shrink-0" />
                    <span>Téléphone masqué</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 text-sm">
                  <Globe size={15} className="text-sky-400 dark:text-gray-400 shrink-0" />
                  <span className="text-sky-700 dark:text-gray-300 font-medium">Cameroun</span>
                </div>
                {isCandidateUser && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={15} className="text-sky-400 dark:text-gray-400 shrink-0" />
                      {isEditing ? (
                        <input 
                          type="date" 
                          value={candidate.birthDate || ''} 
                          onChange={(e) => setCandidate({...candidate, birthDate: e.target.value})}
                          className="bg-sky-50 dark:bg-gray-700/50 border border-sky-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs text-sky-700 dark:text-gray-300 outline-none focus:border-cyan-500"
                        />
                      ) : (
                        <span className="text-sky-700 dark:text-gray-300 font-medium">{candidate.birthDate || "Non renseignée"}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <User size={15} className="text-sky-400 dark:text-gray-400 shrink-0" />
                      {isEditing ? (
                        <select 
                          value={candidate.gender || ''} 
                          onChange={(e) => setCandidate({...candidate, gender: e.target.value})}
                          className="bg-sky-50 dark:bg-gray-700/50 border border-sky-200 dark:border-gray-600 rounded-lg px-2 py-1 text-xs text-sky-700 dark:text-gray-300 outline-none focus:border-cyan-500"
                        >
                          <option value="">Sélectionner</option>
                          <option value="Masculin">Masculin</option>
                          <option value="Féminin">Féminin</option>
                        </select>
                      ) : (
                        <span className="text-sky-700 dark:text-gray-300 font-medium">{candidate.gender || "Non renseigné"}</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* CV */}
              <div className="pt-3 border-t border-sky-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={15} className="text-sky-400 dark:text-gray-400" />
                    <span className="font-medium text-sky-700 dark:text-gray-300">CV</span>
                  </div>
                  {isEditing ? (
                    <label className="cursor-pointer flex items-center gap-1 text-xs font-black text-cyan-500 hover:underline">
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                      {uploading ? "Envoi..." : "Uploader"} <Upload size={12} />
                    </label>
                  ) : candidate.cvUrl ? (
                    <a href={candidate.cvUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-cyan-500 hover:underline flex items-center gap-1">
                      Consulter <LinkIcon size={12} />
                    </a>
                  ) : (
                    <span className="text-xs text-sky-400 dark:text-gray-400 italic">Aucun CV</span>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-cyan-500" />
                <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider">Localisation</h3>
              </div>
              {isEditing ? (
                <select 
                  value={candidate.location || ''} 
                  onChange={(e) => setCandidate({...candidate, location: e.target.value})}
                  className="w-full bg-sky-50 dark:bg-gray-700/50 border border-sky-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm text-sky-700 dark:text-gray-300 outline-none focus:border-cyan-500"
                >
                  <option value="">Sélectionner une ville</option>
                  {CAMEROON_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <p className="text-sm font-medium text-sky-700 dark:text-gray-300">
                  {candidate.location || "Non renseignée"}
                </p>
              )}
            </div>

            {/* Tableau de bord recruteur */}
            {/* Tableau de bord recruteur */}
            {candidate.role === 'recruiter' && isMyProfile && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-3">
                <button 
                  onClick={() => navigate('/DashboardRecruiter')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-gray-700/50 text-sky-700 dark:text-gray-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Settings size={16} className="text-sky-400 dark:text-gray-400" />
                    <span className="text-xs font-bold">Tableau Recruteur</span>
                  </div>
                  <ChevronRight size={15} className="text-sky-400 dark:text-gray-400" />
                </button>
              </div>
            )}

            {/* Mes favoris (candidat uniquement) */}
            {candidate.role !== 'recruiter' && isMyProfile && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-3">
                <button 
                  onClick={() => navigate('/favoris')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Heart size={16} className="group-hover:fill-red-500 transition-all" />
                    <span className="text-xs font-bold">Mes favoris</span>
                  </div>
                  <ChevronRight size={15} className="text-red-400" />
                </button>
              </div>
            )}

            {/* Suggestions — visible uniquement par le propriétaire */}
            {isMyProfile && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} className="text-cyan-500" /> Réseau
                </h3>
              </div>
              <div className="space-y-2">
                {suggestedProfiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-sky-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sky-200 dark:bg-gray-600 flex items-center justify-center text-sky-600 dark:text-gray-300 text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-sky-800 dark:text-gray-100">{p.name}</h5>
                        <p className="text-[10px] text-sky-500 dark:text-gray-400">{p.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddFriend(p.id, p.name)}
                        className="p-1.5 hover:bg-sky-100 dark:hover:bg-gray-700 text-sky-400 dark:text-gray-400 rounded-lg transition-all"
                        title="Ajouter comme contact"
                      ><UserPlus size={13} /></button>
                      <button 
                        onClick={() => {
                          const currentUid = auth.currentUser?.uid;
                          if (currentUid && p.id !== currentUid) {
                            const chatId = [currentUid, p.id].sort().join('_');
                            navigate(`/chat/${chatId}`);
                          }
                        }}
                        className="p-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-all"
                      >
                        <MessageSquare size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

          </div>

          {/* ===== RIGHT COLUMN (2/3) ===== */}
          <div className="lg:col-span-2 space-y-5">

            {/* Dashboard Stats — visible uniquement par le propriétaire */}
            {isMyProfile && isCandidateUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 text-center">
                    <Briefcase size={20} className="text-cyan-500 mx-auto mb-1" />
                    <span className="text-2xl font-black text-sky-800 dark:text-gray-100 block">{applications.length}</span>
                    <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase">Postulations</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 text-center">
                    <CheckCircle2 size={20} className="text-teal-500 mx-auto mb-1" />
                    <span className="text-2xl font-black text-teal-600 dark:text-teal-400 block">{acceptedApps.length}</span>
                    <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase">Retenues</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 text-center">
                    <TrendingUp size={20} className="text-cyan-500 mx-auto mb-1" />
                    <span className="text-2xl font-black text-sky-800 dark:text-gray-100 block">{avgScore !== null ? `${avgScore}%` : '--'}</span>
                    <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase">Match moyen</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 text-center">
                    <Sparkles size={20} className="text-cyan-500 mx-auto mb-1" />
                    <span className="text-2xl font-black text-sky-800 dark:text-gray-100 block">
                      {applications.filter(a => a.status === 'pending').length}
                    </span>
                    <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase">En attente</span>
                  </div>
                </div>

                {/* Accepted Applications */}
                {acceptedApps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-teal-500" /> Candidatures retenues
                    </h3>
                    {acceptedApps.map(app => {
                      const chatId = `${app.recruiterId}_${app.candidateId}_${app.id}`;
                      const score = matchScores[app.id];
                      return (
                        <div key={app.id} className="bg-gradient-to-r from-teal-50 dark:from-teal-900/30 to-cyan-50 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-900/40 p-4 rounded-2xl flex items-center justify-between shadow-sm dark:shadow-teal-900/20 hover:shadow-md dark:hover:shadow-teal-900/30 transition-all">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                              <Building2 size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm text-sky-800 dark:text-gray-100 truncate">{app.jobTitle}</h4>
                                {score !== undefined && score > 0 && (
                                  <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-full">{score}%</span>
                                )}
                              </div>
                              <p className="text-xs text-sky-500 dark:text-gray-400 font-medium">{app.company}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => navigate(`/chat/${chatId}`)}
                            className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md"
                          >
                            <MessageCircle size={14} /> Chat
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Parcours / About */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
              <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Edit3 size={14} className="text-cyan-500" />
                {candidate.role === 'recruiter' ? "À propos de l'entreprise" : "Mon Parcours"}
              </h3>
              {isEditing ? (
                <textarea
                  value={candidate.summary || ''}
                  onChange={(e) => setCandidate({...candidate, summary: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 bg-sky-50 dark:bg-gray-700/50 border border-sky-200 dark:border-gray-600 rounded-xl text-sky-700 dark:text-gray-300 text-sm outline-none resize-none focus:border-cyan-500 placeholder:text-sky-400 dark:placeholder:text-gray-500"
                  placeholder="Décrivez votre parcours professionnel, vos ambitions..."
                />
              ) : (
                <p className="text-sky-600 dark:text-gray-300 text-sm leading-relaxed">
                  {candidate.summary || "Aucune description pour le moment."}
                </p>
              )}
            </div>

            {/* Skills */}
            {isCandidateUser && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
                <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-500" /> Compétences & Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(candidate.skills || []).map((skill, index) => (
                    <span key={index} className="flex items-center gap-1.5 bg-sky-50 dark:bg-gray-700/50 text-sky-700 dark:text-gray-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-sky-100 dark:border-gray-700">
                      {skill}
                      {isEditing && (
                        <button onClick={() => removeSkill(skill)} className="text-red-400 hover:text-red-600 ml-1">
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={newSkill} 
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        placeholder="Ajouter une compétence..."
                        className="bg-sky-50 dark:bg-gray-700/50 border border-sky-200 dark:border-gray-600 px-3 py-1.5 rounded-xl text-xs outline-none focus:border-cyan-500 text-sky-700 dark:text-gray-300 placeholder:text-sky-400 dark:placeholder:text-gray-500 w-44"
                      />
                      <button onClick={addSkill} className="p-1.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                  {(!candidate.skills || candidate.skills.length === 0) && !isEditing && (
                    <p className="text-sky-400 dark:text-gray-400 text-xs italic">Aucune compétence renseignée</p>
                  )}
                </div>
              </div>
            )}

            {/* Personal Details Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
              <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={14} className="text-cyan-500" /> Détails personnels
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase block mb-1">Téléphone</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={candidate.phone || ''} 
                      onChange={(e) => setCandidate({...candidate, phone: e.target.value})}
                      className="bg-white dark:bg-gray-800 border border-sky-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-sky-700 dark:text-gray-300 outline-none focus:border-cyan-500 placeholder:text-sky-400 dark:placeholder:text-gray-500 w-full"
                      placeholder="+237..."
                    />
                  ) : (
                    <span className="text-sm font-bold text-sky-800 dark:text-gray-100">{candidate.phone || "Non renseigné"}</span>
                  )}
                </div>
                <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase block mb-1">Email</span>
                  <span className="text-sm font-bold text-sky-800 dark:text-gray-100 truncate block">{candidate.email}</span>
                </div>
                {isMyProfile && isCandidateUser && (
                  <>
                    <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase block mb-1">Genre</span>
                      <span className="text-sm font-bold text-sky-800 dark:text-gray-100">{candidate.gender || "Non renseigné"}</span>
                    </div>
                    <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400 uppercase block mb-1">Naissance</span>
                      <span className="text-sm font-bold text-sky-800 dark:text-gray-100">{candidate.birthDate || "Non renseignée"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Charts — visible uniquement par le propriétaire */}
            {isMyProfile && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-5">
              <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-500" /> Postulations & Recruteurs
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#7dd3fc" tickLine={false} fontSize={11} />
                    <YAxis stroke="#7dd3fc" tickLine={false} fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#bae6fd', borderRadius: '12px', color: '#0c4a6e' }} wrapperClassName="dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800" />
                    <Bar dataKey="Postulations" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Recruteurs" fill="#2dd4bf" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            )}

            {/* Section sécurité : Double Authentification (MFA) */}
            {isMyProfile && (
              <MfaSetup />
            )}

          </div>
        </div>
      </div>

    </div>
    </AnimatedPage>
  );
}
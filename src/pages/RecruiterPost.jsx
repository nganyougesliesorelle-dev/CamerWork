import { useState, useEffect } from 'react';
import { Building, MapPin, FileText, Briefcase, PlusCircle, Trash2, CheckCircle2, ArrowLeft, X, Eye, Sparkles, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import skillsJson from '../../skill.json';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { dispatchJobOpportunities } from '../firebase/authService'; 
import { canRecruiterPost } from '../composants/KycBadge'; 

const CAMEROON_CITIES = [
  "Yaoundé", "Douala", "Garoua", "Maroua", "Bafoussam", 
  "Bamenda", "Ngaoundéré", "Buea", "Bertoua", "Ebolowa", 
  "Kribi", "Limbe", "Dschang", "Foumban"
];

export function RecruiterPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [isCompanyFixed, setIsCompanyFixed] = useState(false);

const STEPS = [
  { id: 1, label: t('recruiter.step1_label'), icon: Briefcase },
  { id: 2, label: t('recruiter.step2_label'), icon: FileText },
  { id: 3, label: t('recruiter.step3_label'), icon: MapPin },
];

  const editJob = location.state?.editJob;

  const [formData, setFormData] = useState({
    title: '', company: '', companyLogoUrl: '', city: 'Yaoundé', type: 'CDI',
    salary: '', salaryMin: '', salaryMax: '', period: 'Mensuel', description: '',
    // work modes replaces missions: onsite, remote, hybrid
    workModes: { onsite: false, remote: false, hybrid: false },
    profile: [''], skills: [],
  });

  const descLen = (formData.description || '').length;

  useEffect(() => {
    if (editJob) {
      setFormData({
        title: editJob.title || '', company: editJob.company || '',
        city: editJob.city || 'Yaoundé', type: editJob.type || 'CDI',
        salary: editJob.salary || '', salaryMin: editJob.salaryMin || '', salaryMax: editJob.salaryMax || '', period: editJob.period || 'Mensuel',
        description: editJob.description || '',
        workModes: editJob.workModes || { onsite: false, remote: false, hybrid: false },
        profile: editJob.profile?.length > 0 ? editJob.profile : [''],
        skills: editJob.skills || [],
      });
    }
  }, [editJob]);

  // Load recruiter company info on mount (auto-fill company and logo)
  useEffect(() => {
    const loadUser = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const udoc = await getDoc(doc(db, 'users', user.uid));
        if (udoc.exists()) {
          const u = udoc.data();
          if (u.company) {
            setFormData(prev => ({ ...prev, company: u.company, companyLogoUrl: u.companyLogoUrl || '' }));
            setIsCompanyFixed(true);
          } else if (u.displayName && !editJob) {
            // fallback: use displayName as company if present and no company set
            setFormData(prev => ({ ...prev, company: u.displayName }));
          }
        }
      } catch (err) {
        // ignore silently
      }
    };
    loadUser();
  }, [editJob]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !formData.skills.includes(s)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, s] }));
    }
    setSkillInput('');
  };

  // compute flat skills list from skill.json
  const ALL_SKILLS = skillsJson.flatMap(c => c.skills || []);
  useEffect(() => {
    const q = skillInput.trim().toLowerCase();
    if (!q) return setSkillSuggestions([]);
    const suggestions = ALL_SKILLS.filter(s => s.toLowerCase().includes(q) && !formData.skills.includes(s)).slice(0, 8);
    setSkillSuggestions(suggestions);
  }, [skillInput, formData.skills]);

  const removeSkill = (s) => setFormData(prev => ({ ...prev, skills: prev.skills.filter(sk => sk !== s) }));

  const addField = (field) => setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  const updateField = (field, index, value) => {
    const arr = [...formData[field]]; arr[index] = value;
    setFormData(prev => ({ ...prev, [field]: arr }));
  };
  const removeField = (field, index) => {
    if (formData[field].length > 1) setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleStepForward = (e) => {
    if (e) e.preventDefault();
    if (step < 3 && canNext()) setStep(step + 1);
  };

  const handlePublish = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error(t('recruiter.must_login'));

    const cleanedTitle = formData.title.trim();
    const cleanedCompany = formData.company.trim();
    const cleanedDescription = formData.description.trim();

    if (!cleanedTitle || !cleanedCompany) {
      return toast.error('Le titre et le nom de l’entreprise sont requis.');
    }
    if (!cleanedDescription || cleanedDescription.length < 150) {
      return toast.error('La description doit contenir au moins 150 caractères.');
    }
    if (cleanedDescription.length > 2000) {
      return toast.error('La description ne peut pas dépasser 2000 caractères.');
    }
    if (!formData.skills || formData.skills.length < 2) {
      return toast.error('Ajoutez au moins 2 compétences requises.');
    }

    const parsedSalary = Number((formData.salary || '').toString().replace(/\s/g, ''));
    const parsedMin = Number((formData.salaryMin || '').toString().replace(/\s/g, ''));
    const parsedMax = Number((formData.salaryMax || '').toString().replace(/\s/g, ''));
    const hasAnySalary = formData.salary || formData.salaryMin || formData.salaryMax;
    if ((formData.type !== 'Stage') && !hasAnySalary) {
      return toast.error('Le salaire est requis pour les offres non stage.');
    }
    if (hasAnySalary) {
      const hasNegative = [parsedSalary, parsedMin, parsedMax].some((value) => Number.isFinite(value) && value < 0);
      if (hasNegative) {
        return toast.error('Le salaire ne peut pas être négatif.');
      }
      if (formData.salaryMin && formData.salaryMax && parsedMin > parsedMax) {
        return toast.error('La fourchette salariale est incohérente.');
      }
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    let userData = null;
    if (userDoc.exists()) {
      userData = userDoc.data();
      if (userData.role === 'recruiter' || userData.role === 'recruteur') {
        if (!canRecruiterPost(userData.kycStatus || 'unverified', userData.createdAt, userData.isValidated)) {
          toast.error('🔒 Votre compte doit être vérifié (KYC) pour publier des offres. Veuillez contacter le support CamerWork.', { duration: 7000 });
          return;
        }
      }
    }

    // Vérifier la limite pour les recruteurs non validés
    const isRecruiterValidated = userData?.isValidated === true || userData?.kycStatus === 'verified';
    if (!editJob && userData?.role === 'recruiter' && !isRecruiterValidated) {
      const pendingQ = query(
        collection(db, 'jobs'),
        where('recruiterId', '==', user.uid),
        where('status', 'in', ['pending_moderation', 'draft'])
      );
      const pendingSnap = await getDocs(pendingQ);
      if (pendingSnap.size >= 1) {
        toast.error('⏳ Vous avez déjà une offre en attente de modération. Votre profil doit être vérifié par l\'administration pour en publier davantage.', { duration: 6000 });
        return;
      }
    }

    setLoading(true);
    try {
      const cleanWorkModes = formData.workModes || { onsite: false, remote: false, hybrid: false };
      const cleanMissions = [];
      const cleanProfile = formData.profile.filter(p => p.trim() !== '');
      const payload = {
        ...formData,
        title: cleanedTitle,
        company: cleanedCompany,
        description: cleanedDescription,
        city: formData.city || 'Yaoundé',
        type: formData.type || 'CDI',
        salary: formData.salary ? Number(formData.salary.toString().replace(/\s/g, '')) : 0,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin.toString().replace(/\s/g, '')) : 0,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax.toString().replace(/\s/g, '')) : 0,
        skills: formData.skills.filter(Boolean),
        workModes: cleanWorkModes,
        missions: cleanMissions,
        profile: cleanProfile,
        recruiterId: user.uid,
        premium: false,
        status: 'open',
        createdAt: editJob ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (editJob) {
        await updateDoc(doc(db, "jobs", editJob.id), payload);
        await dispatchJobOpportunities({ id: editJob.id, ...payload });
        toast.success(t('notifications.success_job_updated'));
      } else {
        // Recruteur non validé → offre en pending_moderation, sinon open
        const jobStatus = (!isRecruiterValidated && userData?.role === 'recruiter') ? 'pending_moderation' : 'open';
        const docRef = await addDoc(collection(db, "jobs"), { ...payload, status: jobStatus, createdAt: serverTimestamp() });
        if (jobStatus === 'open') {
          await dispatchJobOpportunities({ id: docRef.id, ...payload });
        }
        // Message identique pour ne pas révéler le statut pending_moderation au recruteur
        toast.success(t('notifications.success_job_posted'));
      }
      setTimeout(() => navigate('/DashboardRecruiter'), 1500);
    } catch (error) { console.error('job save error:', error); toast.error(`${t('notifications.error_job_save')}: ${error?.message || error}`); }
    finally { setLoading(false); }
  };

  const canNext = () => {
    if (step === 1) return formData.title.trim() && formData.company.trim();
    if (step === 2) return (formData.description && formData.description.trim().length >= 150 && formData.description.trim().length <= 2000) && formData.skills.length >= 2;
    return true;
  };

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sky-300 dark:text-gray-300 hover:text-white transition-colors font-bold text-sm">
            <ArrowLeft size={18} /> {t('recruiter.back')}
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {editJob ? t('recruiter.edit_offer') : t('recruiter.create_offer')}
          </h1>
          <p className="text-sky-300 dark:text-gray-400 text-sm mt-1">{t('recruiter.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        
        {/* Stepper */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${step === s.id ? 'bg-cyan-500 text-white shadow-md' : step > s.id ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' : 'bg-sky-50 dark:bg-gray-700 text-sky-400 dark:text-gray-400'}`}>
                  <s.icon size={16} />
                  <span className="text-xs font-black hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded ${step > s.id ? 'bg-teal-400' : 'bg-sky-200 dark:bg-gray-600'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Formulaire */}
          <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-5'} transition-all`}>
            <form onSubmit={handleStepForward} className="space-y-4">
              
              {/* Étape 1 */}
              {step === 1 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={18} className="text-cyan-500" /> Informations générales
                  </h2>
                  <div>
                    <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.title_label')}</label>
                    <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full p-4 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm" placeholder="ex: Développeur Fullstack React" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.company_label')}</label>
                    <input required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} readOnly={isCompanyFixed}
                      className={`w-full p-4 ${isCompanyFixed ? 'bg-gray-100 dark:bg-gray-700/40' : 'bg-sky-50 dark:bg-gray-700'} border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm`} placeholder="Votre entreprise" />
                  </div>
                </div>
              )}

              {/* Étape 2 */}
              {step === 2 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-cyan-500" /> Description & Compétences
                  </h2>
                  
                  <div>
                    <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.description_label')}</label>
                    {(() => {
                      const max = 2000;
                      const min = 150;
                      const over = descLen > max;
                      const ok = descLen >= min && descLen <= max;
                      const borderClass = over ? 'border-red-500 ring-red-50' : (ok ? 'border-emerald-400 ring-emerald-50' : 'border-sky-100');
                      return (
                        <>
                          <textarea rows={10} maxLength={max} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className={`w-full p-4 bg-sky-50 dark:bg-gray-700 ${borderClass} dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-medium text-sm resize-vertical overflow-auto max-h-96`} placeholder="Décrivez le poste, les responsabilités..." />
                          <div className="flex justify-between text-[11px] mt-2">
                            <span className="text-sky-500 dark:text-gray-400">Minimum 150 caractères — Maximum 2000 caractères</span>
                            <span className={`text-sky-400 dark:text-gray-500 ${over ? 'text-red-500' : (ok ? 'text-emerald-500' : '')}`}>{descLen} / {max}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Tags de compétences */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.skills_label')}</label>
                      <span className="text-[10px] text-sky-500 dark:text-gray-400 font-black">{(formData.skills || []).length} / 2</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.skills.map((skill, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-cyan-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-transparent">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} className="text-white/80 hover:text-red-200"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          className="w-full p-3 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 text-sm font-medium" placeholder="React, Node.js, Firebase..." />
                        {skillSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-sky-100 dark:border-gray-700 rounded-xl shadow-sm z-20 max-h-40 overflow-auto">
                            {skillSuggestions.map((s, i) => (
                              <button key={i} type="button" onClick={() => { setFormData(prev => ({ ...prev, skills: [...prev.skills, s] })); setSkillInput(''); setSkillSuggestions([]); }}
                                className="w-full text-left px-3 py-2 hover:bg-sky-50 dark:hover:bg-gray-700 text-sm text-white">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={addSkill} className="px-4 bg-cyan-500 text-white rounded-xl font-black text-xs hover:bg-cyan-600 transition-all">{t('recruiter.add')}</button>
                    </div>
                  </div>

                  {/* Work modes (présentiel / distance / hybride) */}
                  <div>
                    <p className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-2">Mode de travail</p>
                    <div className="flex gap-3">
                      <label className={`inline-flex items-center gap-2 text-sm px-3 py-2 border rounded-xl cursor-pointer ${formData.workModes.onsite ? 'bg-cyan-600 border-white text-white' : 'bg-transparent border-white text-white/90'}`}>
                        <input type="checkbox" className="accent-cyan-500" checked={formData.workModes.onsite} onChange={(e) => setFormData(prev => ({ ...prev, workModes: { ...prev.workModes, onsite: e.target.checked } }))} />
                        <span className="font-medium">Présentiel</span>
                      </label>
                      <label className={`inline-flex items-center gap-2 text-sm px-3 py-2 border rounded-xl cursor-pointer ${formData.workModes.remote ? 'bg-cyan-600 border-white text-white' : 'bg-transparent border-white text-white/90'}`}>
                        <input type="checkbox" className="accent-cyan-500" checked={formData.workModes.remote} onChange={(e) => setFormData(prev => ({ ...prev, workModes: { ...prev.workModes, remote: e.target.checked } }))} />
                        <span className="font-medium">Distance</span>
                      </label>
                      <label className={`inline-flex items-center gap-2 text-sm px-3 py-2 border rounded-xl cursor-pointer ${formData.workModes.hybrid ? 'bg-cyan-600 border-white text-white' : 'bg-transparent border-white text-white/90'}`}>
                        <input type="checkbox" className="accent-cyan-500" checked={formData.workModes.hybrid} onChange={(e) => setFormData(prev => ({ ...prev, workModes: { ...prev.workModes, hybrid: e.target.checked } }))} />
                        <span className="font-medium">Hybride</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 3 */}
              {step === 3 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-sky-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="text-sm font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={18} className="text-cyan-500" /> Contrat & Localisation
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.contract_label')}</label>
                      <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-4 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm cursor-pointer">
                        <option value="CDI">CDI</option><option value="CDD">CDD</option>
                        <option value="Stage">Stage</option><option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.city_label')}</label>
                      <select value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full p-4 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm cursor-pointer">
                        {CAMEROON_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">Salaire ({formData.period})</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative">
                          <input value={formData.salaryMin} onChange={(e) => setFormData({...formData, salaryMin: e.target.value})}
                            className="w-full p-4 pr-16 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm" placeholder="Min 250 000" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-sky-400 dark:text-gray-400">FCFA</span>
                        </div>
                        <div className="relative">
                          <input value={formData.salaryMax} onChange={(e) => setFormData({...formData, salaryMax: e.target.value})}
                            className="w-full p-4 pr-16 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm" placeholder="Max 400 000" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-sky-400 dark:text-gray-400">FCFA</span>
                        </div>
                        <div className="relative">
                          <input value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})}
                            className="w-full p-4 pr-16 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm" placeholder="Salaire fixe" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-sky-400 dark:text-gray-400">FCFA</span>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-sky-500 dark:text-gray-400">Vous pouvez saisir une fourchette min/max ou un salaire fixe. Les champs négatifs sont refusés.</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5 block">{t('recruiter.period_label')}</label>
                      <select value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})}
                        className="w-full p-4 bg-sky-50 dark:bg-gray-700 border border-sky-100 dark:border-gray-600 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 dark:text-gray-100 font-bold text-sm cursor-pointer">
                        <option value="Mensuel">Mensuel</option><option value="Annuel">Annuel</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep(Math.max(1, step - 1))}
                  className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${step === 1 ? 'invisible' : 'bg-sky-100 dark:bg-gray-700 text-sky-600 dark:text-gray-300 hover:bg-sky-200 dark:hover:bg-gray-600'}`}>
                  <ChevronLeft size={16} /> {t('recruiter.previous')}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPreview(!showPreview)}
                    className="px-4 py-3 bg-sky-100 dark:bg-gray-700 text-sky-600 dark:text-gray-300 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-sky-200 dark:hover:bg-gray-600 transition-all">
                    <Eye size={14} /> {showPreview ? t('recruiter.hide') : t('recruiter.preview')}
                  </button>
                  {step < 3 ? (
                    <button type="button" onClick={() => canNext() && setStep(step + 1)}
                      className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${canNext() ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-sky-100 dark:bg-gray-700 text-sky-400 dark:text-gray-500 cursor-not-allowed'}`}>
                      {t('recruiter.next')} <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={handlePublish} disabled={loading}
                      className="px-6 py-3 bg-cyan-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-cyan-600 transition-all disabled:opacity-50">
                      <Send size={14} /> {loading ? t('recruiter.publishing') : editJob ? t('recruiter.update') : t('recruiter.publish')}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>

          {/* Aperçu */}
          {showPreview && (
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/30 border border-cyan-200 dark:border-cyan-800 p-5 sticky top-4">
                <h3 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Eye size={14} /> {t('recruiter.candidate_preview')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full text-[10px] font-black uppercase">{formData.type || 'CDI'}</span>
                  </div>
                  <h4 className="font-black text-sky-800 dark:text-gray-100 text-lg">{formData.title || 'Titre du poste'}</h4>
                  <p className="text-sky-500 dark:text-gray-400 font-bold flex items-center gap-2">
                    {formData.companyLogoUrl ? (
                      <img src={formData.companyLogoUrl} alt="logo" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <Building size={14} />
                    )}
                    <span>{formData.company || 'Entreprise'}</span>
                  </p>
                  <p className="text-sky-400 dark:text-gray-400 text-xs flex items-center gap-1"><MapPin size={12} /> {formData.city || 'Ville'}</p>
                  {(formData.salaryMin || formData.salaryMax || formData.salary) && (
                    <p className="text-teal-600 dark:text-teal-400 font-bold text-xs bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-lg inline-block">
                      {formData.salaryMin && formData.salaryMax ? `${formData.salaryMin} - ${formData.salaryMax}` : formData.salary || formData.salaryMin || formData.salaryMax} FCFA / {formData.period}
                    </p>
                  )}
                  {formData.description && <p className="text-sky-600 dark:text-gray-300 text-xs leading-relaxed bg-sky-50 dark:bg-gray-700 p-3 rounded-xl">{formData.description}</p>}
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.skills.map((s, i) => <span key={i} className="bg-cyan-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold">{s}</span>)}
                    </div>
                  )}
                  {/* Work modes preview */}
                  {(formData.workModes?.onsite || formData.workModes?.remote || formData.workModes?.hybrid) && (
                    <div>
                      <p className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1">Mode de travail</p>
                      <div className="flex gap-2 text-xs">
                        {formData.workModes.onsite && <span className="px-2 py-1 bg-cyan-600 text-white rounded-lg">Présentiel</span>}
                        {formData.workModes.remote && <span className="px-2 py-1 bg-cyan-600 text-white rounded-lg">Distance</span>}
                        {formData.workModes.hybrid && <span className="px-2 py-1 bg-cyan-600 text-white rounded-lg">Hybride</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
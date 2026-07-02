import { useState, useEffect } from 'react';
import { Building, MapPin, FileText, Briefcase, PlusCircle, Trash2, CheckCircle2, ArrowLeft, X, Eye, Sparkles, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { dispatchJobOpportunities } from '../firebase/authService'; 

const CAMEROON_CITIES = [
  "Yaoundé", "Douala", "Garoua", "Maroua", "Bafoussam", 
  "Bamenda", "Ngaoundéré", "Buea", "Bertoua", "Ebolowa", 
  "Kribi", "Limbe", "Dschang", "Foumban"
];

const STEPS = [
  { id: 1, label: 'Infos générales', icon: Briefcase },
  { id: 2, label: 'Description & Compétences', icon: FileText },
  { id: 3, label: 'Contrat & Localisation', icon: MapPin },
];

export function RecruiterPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const editJob = location.state?.editJob;

  const [formData, setFormData] = useState({
    title: '', company: '', city: 'Yaoundé', type: 'CDI',
    salary: '', period: 'Mensuel', description: '',
    missions: [''], profile: [''], skills: [],
  });

  useEffect(() => {
    if (editJob) {
      setFormData({
        title: editJob.title || '', company: editJob.company || '',
        city: editJob.city || 'Yaoundé', type: editJob.type || 'CDI',
        salary: editJob.salary || '', period: editJob.period || 'Mensuel',
        description: editJob.description || '',
        missions: editJob.missions?.length > 0 ? editJob.missions : [''],
        profile: editJob.profile?.length > 0 ? editJob.profile : [''],
        skills: editJob.skills || [],
      });
    }
  }, [editJob]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !formData.skills.includes(s)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, s] }));
    }
    setSkillInput('');
  };

  const removeSkill = (s) => setFormData(prev => ({ ...prev, skills: prev.skills.filter(sk => sk !== s) }));

  const addField = (field) => setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  const updateField = (field, index, value) => {
    const arr = [...formData[field]]; arr[index] = value;
    setFormData(prev => ({ ...prev, [field]: arr }));
  };
  const removeField = (field, index) => {
    if (formData[field].length > 1) setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si pas à la dernière étape, avancer au lieu de publier
    if (step < 3) {
      if (canNext()) setStep(step + 1);
      return;
    }

    const user = auth.currentUser;
    if (!user) return toast.error("Connectez-vous.");
    if (formData.missions.filter(m => m.trim()).length === 0) return toast.error("Ajoutez au moins une mission.");

    setLoading(true);
    try {
      const cleanMissions = formData.missions.filter(m => m.trim() !== '');
      const cleanProfile = formData.profile.filter(p => p.trim() !== '');
      const payload = {
        ...formData,
        salary: formData.salary ? Number(formData.salary.toString().replace(/\s/g, '')) : 0,
        skills: formData.skills,
        missions: cleanMissions,
        profile: cleanProfile,
        recruiterId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editJob) {
        await updateDoc(doc(db, "jobs", editJob.id), payload);
        await dispatchJobOpportunities({ id: editJob.id, ...payload });
        toast.success('Offre mise à jour !');
      } else {
        const docRef = await addDoc(collection(db, "jobs"), { ...payload, status: 'open', createdAt: serverTimestamp() });
        await dispatchJobOpportunities({ id: docRef.id, ...payload });
        toast.success('Offre publiée !');
      }
      setTimeout(() => navigate('/DashboardRecruiter'), 1500);
    } catch (error) { toast.error("Erreur lors de l'enregistrement."); }
    finally { setLoading(false); }
  };

  const canNext = () => {
    if (step === 1) return formData.title.trim() && formData.company.trim();
    if (step === 2) return formData.description.trim() || formData.skills.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-sky-50 font-sans antialiased pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-sky-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative z-10">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sky-300 hover:text-white transition-colors font-bold text-sm">
            <ArrowLeft size={18} /> Retour
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            {editJob ? "Modifier l'offre" : "Créer une offre"}
          </h1>
          <p className="text-sky-300 text-sm mt-1">Trouvez les meilleurs talents du Cameroun</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        
        {/* Stepper */}
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${step === s.id ? 'bg-cyan-500 text-white shadow-md' : step > s.id ? 'bg-teal-50 text-teal-600' : 'bg-sky-50 text-sky-400'}`}>
                  <s.icon size={16} />
                  <span className="text-xs font-black hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded ${step > s.id ? 'bg-teal-400' : 'bg-sky-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulaire */}
          <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Étape 1 */}
              {step === 1 && (
                <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6 space-y-4">
                  <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={18} className="text-cyan-500" /> Informations générales
                  </h2>
                  <div>
                    <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Titre du poste *</label>
                    <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-bold text-sm" placeholder="ex: Développeur Fullstack React" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Entreprise *</label>
                    <input required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-bold text-sm" placeholder="Votre entreprise" />
                  </div>
                </div>
              )}

              {/* Étape 2 */}
              {step === 2 && (
                <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6 space-y-4">
                  <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-cyan-500" /> Description & Compétences
                  </h2>
                  
                  <div>
                    <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Description du poste</label>
                    <textarea rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-medium text-sm resize-none" placeholder="Décrivez le poste, les responsabilités..." />
                  </div>

                  {/* Tags de compétences */}
                  <div>
                    <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Compétences requises (tags)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.skills.map((skill, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-100">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} className="text-cyan-400 hover:text-red-500"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        className="flex-1 p-3 bg-sky-50 border border-sky-100 rounded-xl outline-none focus:border-cyan-500 text-sky-800 text-sm font-medium" placeholder="React, Node.js, Firebase..." />
                      <button type="button" onClick={addSkill} className="px-4 bg-cyan-500 text-white rounded-xl font-black text-xs hover:bg-cyan-600 transition-all">Ajouter</button>
                    </div>
                  </div>

                  {/* Missions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-sky-400 uppercase">Missions</label>
                      <button type="button" onClick={() => addField('missions')} className="text-cyan-500 text-[10px] font-black flex items-center gap-1"><PlusCircle size={12} /> Ajouter</button>
                    </div>
                    {formData.missions.map((m, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input value={m} onChange={(e) => updateField('missions', i, e.target.value)}
                          className="flex-1 p-3 bg-sky-50 border border-sky-100 rounded-xl outline-none focus:border-cyan-500 text-sky-800 text-sm" placeholder={`Mission ${i + 1}`} />
                        {formData.missions.length > 1 && <button type="button" onClick={() => removeField('missions', i)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Étape 3 */}
              {step === 3 && (
                <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-6 space-y-4">
                  <h2 className="text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={18} className="text-cyan-500" /> Contrat & Localisation
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Type de contrat</label>
                      <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-bold text-sm cursor-pointer">
                        <option value="CDI">CDI</option><option value="CDD">CDD</option>
                        <option value="Stage">Stage</option><option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Ville</label>
                      <select value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-bold text-sm cursor-pointer">
                        {CAMEROON_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Salaire ({formData.period})</label>
                      <div className="relative">
                        <input value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})}
                          className="w-full p-4 pr-16 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-bold text-sm" placeholder="250 000" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-sky-400">FCFA</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">Période</label>
                      <select value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})}
                        className="w-full p-4 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-500 text-sky-800 font-bold text-sm cursor-pointer">
                        <option value="Mensuel">Mensuel</option><option value="Annuel">Annuel</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep(Math.max(1, step - 1))}
                  className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${step === 1 ? 'invisible' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}>
                  <ChevronLeft size={16} /> Précédent
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPreview(!showPreview)}
                    className="px-4 py-3 bg-sky-100 text-sky-600 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-sky-200 transition-all">
                    <Eye size={14} /> {showPreview ? 'Cacher' : 'Aperçu'}
                  </button>
                  {step < 3 ? (
                    <button type="button" onClick={() => canNext() && setStep(step + 1)}
                      className={`px-5 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${canNext() ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-sky-100 text-sky-400 cursor-not-allowed'}`}>
                      Suivant <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button type="submit" disabled={loading}
                      className="px-6 py-3 bg-cyan-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-cyan-600 transition-all">
                      <Send size={14} /> {loading ? 'Publication...' : editJob ? 'Mettre à jour' : 'Publier l\'offre'}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>

          {/* Aperçu */}
          {showPreview && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-cyan-200 p-5 sticky top-4">
                <h3 className="text-xs font-black text-cyan-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Eye size={14} /> Aperçu côté candidat
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-[10px] font-black uppercase">{formData.type || 'CDI'}</span>
                  </div>
                  <h4 className="font-black text-sky-800 text-lg">{formData.title || 'Titre du poste'}</h4>
                  <p className="text-sky-500 font-bold flex items-center gap-1"><Building size={14} /> {formData.company || 'Entreprise'}</p>
                  <p className="text-sky-400 text-xs flex items-center gap-1"><MapPin size={12} /> {formData.city || 'Ville'}</p>
                  {formData.salary && <p className="text-teal-600 font-bold text-xs bg-teal-50 px-3 py-1.5 rounded-lg inline-block">{formData.salary} FCFA / {formData.period}</p>}
                  {formData.description && <p className="text-sky-600 text-xs leading-relaxed bg-sky-50 p-3 rounded-xl">{formData.description}</p>}
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.skills.map((s, i) => <span key={i} className="bg-sky-50 text-sky-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">{s}</span>)}
                    </div>
                  )}
                  {formData.missions.filter(m => m.trim()).length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-sky-400 uppercase mb-1">Missions</p>
                      {formData.missions.filter(m => m.trim()).map((m, i) => <p key={i} className="text-xs text-sky-600">• {m}</p>)}
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

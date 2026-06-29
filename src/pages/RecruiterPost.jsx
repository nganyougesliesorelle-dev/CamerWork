import { useState, useEffect } from 'react';
import { Building, MapPin, FileText, Briefcase, PlusCircle, Trash2, CheckCircle2, DollarSign, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { dispatchJobOpportunities } from '../firebase/authService'; // Ajout de la fonction de matching

// Liste standardisée identique au profil pour un matching parfait
const CAMEROON_CITIES = [
  "Yaoundé", "Douala", "Garoua", "Maroua", "Bafoussam", 
  "Bamenda", "Ngaoundéré", "Buea", "Bertoua", "Ebolowa", 
  "Kribi", "Limbe", "Dschang", "Foumban"
];

export function RecruiterPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const editJob = location.state?.editJob;

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    city: 'Yaoundé',
    type: 'CDI',
    salary: '',
    description: '',
    missions: [''],
    profile: ['']
  });

  useEffect(() => {
    if (editJob) {
      setFormData({
        title: editJob.title || '',
        company: editJob.company || '',
        city: editJob.city || 'Yaoundé',
        type: editJob.type || 'CDI',
        salary: editJob.salary || '',
        description: editJob.description || '',
        missions: editJob.missions?.length > 0 ? editJob.missions : [''],
        profile: editJob.profile?.length > 0 ? editJob.profile : ['']
      });
    }
  }, [editJob]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return toast.error("Connectez-vous pour continuer.");

    if (formData.missions[0] === '') return toast.error("Ajoutez au moins une mission.");

    setLoading(true);
    try {
      const cleanMissions = formData.missions.filter(m => m.trim() !== '');
      const cleanProfile = formData.profile.filter(p => p.trim() !== '');

      // Déduction dynamique du tableau de compétences (skills) pour le moteur de matching
      const extractedSkills = cleanProfile.map(item => item.trim());

      const payload = {
        ...formData,
        salary: formData.salary ? Number(formData.salary.toString().replace(/\s/g, '')) : 0, // conversion numérique pour le calcul de rentabilité
        skills: extractedSkills, // Ajout du tableau plat de compétences pour l'algorithme
        missions: cleanMissions,
        profile: cleanProfile,
        recruiterId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editJob) {
        const jobRef = doc(db, "jobs", editJob.id);
        await updateDoc(jobRef, payload);
        
        // Déclenchement du matching après mise à jour
        await dispatchJobOpportunities({ id: editJob.id, ...payload });
        
        toast.success('Offre mise à jour et redistribuée aux talents !');
      } else {
        const docRef = await addDoc(collection(db, "jobs"), {
          ...payload,
          status: 'open',
          createdAt: serverTimestamp(),
        });
        
        // Déclenchement du matching après création d'une nouvelle offre
        await dispatchJobOpportunities({ id: docRef.id, ...payload });
        
        toast.success('Offre publiée et envoyée aux talents correspondants !');
      }

      setTimeout(() => navigate('/DashboardRecruiter'), 1500);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const addField = (field) => setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  
  const updateField = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const removeField = (field, index) => {
    if (formData[field].length > 1) {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-slate-900 text-white py-14 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm">
            <ArrowLeft size={18} /> RETOUR
          </button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <PlusCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">
                {editJob ? "Modifier l'offre" : "Créer une offre"}
              </h1>
              <p className="text-slate-400 font-medium">
                {editJob ? "Ajustez les détails de votre annonce." : "Trouvez les meilleurs profils du pays."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Briefcase size={16} /> Informations de base
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Titre du poste</label>
                <input required type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" placeholder="ex: Développeur Fullstack React" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Entreprise</label>
                <input required type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" placeholder='Votre entreprise' value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Ville</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 cursor-pointer" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}>
                  {CAMEROON_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Type de contrat</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 cursor-pointer" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Stage">Stage</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Salaire mensuel (FCFA)</label>
                <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" className="w-full p-4 pl-10 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" placeholder="ex: 250 000" value={formData.salary} onChange={(e) => setFormData({...formData, salary: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
            <h2 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <FileText size={16} /> Contenu détaillé
            </h2>

            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Missions principales</label>
                    <button type="button" onClick={() => addField('missions')} className="text-blue-600 flex items-center gap-1 text-[10px] font-black hover:scale-105 transition-all bg-blue-50 px-3 py-1 rounded-full">
                        <PlusCircle size={14} /> AJOUTER
                    </button>
                </div>
                {formData.missions.map((m, i) => (
                <div key={i} className="flex gap-2 mb-3 animate-in fade-in slide-in-from-left-2">
                    <input className="flex-1 p-4 bg-slate-50 border-none rounded-2xl outline-none font-medium text-sm text-slate-700" value={m} onChange={(e) => updateField('missions', i, e.target.value)} placeholder="Quelle sera sa mission ?" />
                    <button type="button" onClick={() => removeField('missions', i)} className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 size={20} /></button>
                </div>
                ))}
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Profil recherché (Compétences requises)</label>
                    <button type="button" onClick={() => addField('profile')} className="text-emerald-600 flex items-center gap-1 text-[10px] font-black hover:scale-105 transition-all bg-emerald-50 px-3 py-1 rounded-full">
                        <PlusCircle size={14} /> AJOUTER
                    </button>
                </div>
                {formData.profile.map((p, i) => (
                <div key={i} className="flex gap-2 mb-3">
                    <input className="flex-1 p-4 bg-slate-50 border-none rounded-2xl outline-none font-medium text-sm text-slate-700" value={p} onChange={(e) => updateField('profile', i, e.target.value)} placeholder="ex: React, Java, Git, Figma..." />
                    <button type="button" onClick={() => removeField('profile', i)} className="text-red-400 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 size={20} /></button>
                </div>
                ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button type="submit" disabled={loading} className="flex-[2] bg-blue-700 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-200 hover:bg-blue-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              <CheckCircle2 size={24} /> {loading ? "Enregistrement..." : (editJob ? "Enregistrer les modifications" : "Publier l'annonce")}
            </button>
            <button type="button" onClick={() => navigate('/DashboardRecruiter')} className="flex-1 px-8 bg-white border border-slate-200 text-slate-500 font-black rounded-[2rem] hover:bg-slate-50 transition-colors uppercase text-sm">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
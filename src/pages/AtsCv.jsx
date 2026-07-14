import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, FileText, Download, User, Briefcase, GraduationCap, Star, Plus, X, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function AtsCv() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [cv, setCv] = useState({
    fullName: '', email: '', phone: '', location: '', title: '',
    summary: '', skills: [], experience: [{ company: '', role: '', period: '', description: '' }],
    education: [{ school: '', degree: '', year: '' }],
    languages: [], certifications: [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [certInput, setCertInput] = useState('');

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error(t('auth.connectez_vous'));
    setLoading(true);
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      setCv(prev => ({
        ...prev, fullName: d.displayName || d.fullName || '', email: d.email || '',
        phone: d.phone || '', location: d.location || '', skills: d.skills || [],
      }));
      setProfileLoaded(true);
      toast.success(t('auth.profil_charge'));
    }
    setLoading(false);
  };

  const addSkill = () => { if (skillInput.trim() && !cv.skills.includes(skillInput.trim())) { setCv({...cv, skills: [...cv.skills, skillInput.trim()]}); } setSkillInput(''); };
  const addLang = () => { if (langInput.trim() && !cv.languages.includes(langInput.trim())) { setCv({...cv, languages: [...cv.languages, langInput.trim()]}); } setLangInput(''); };
  const addCert = () => { if (certInput.trim() && !cv.certifications.includes(certInput.trim())) { setCv({...cv, certifications: [...cv.certifications, certInput.trim()]}); } setCertInput(''); };

  const addExp = () => setCv({...cv, experience: [...cv.experience, { company: '', role: '', period: '', description: '' }]});
  const updateExp = (i, f, v) => { const e = [...cv.experience]; e[i][f] = v; setCv({...cv, experience: e}); };
  const removeExp = (i) => setCv({...cv, experience: cv.experience.filter((_, idx) => idx !== i)});

  const addEdu = () => setCv({...cv, education: [...cv.education, { school: '', degree: '', year: '' }]});
  const updateEdu = (i, f, v) => { const e = [...cv.education]; e[i][f] = v; setCv({...cv, education: e}); };

  const handlePrint = () => window.print();

  const atsScore = () => {
    let score = 0;
    if (cv.fullName) score += 10;
    if (cv.email) score += 10;
    if (cv.phone) score += 10;
    if (cv.summary.length > 50) score += 15;
    if (cv.skills.length >= 3) score += 20;
    if (cv.experience.some(e => e.company)) score += 20;
    if (cv.education.some(e => e.school)) score += 10;
    if (cv.languages.length > 0) score += 5;
    return Math.min(100, score);
  };

  const score = atsScore();

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-gray-900 font-sans antialiased pb-20">
      <div className="bg-gradient-to-r from-sky-900 to-cyan-900 text-white py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-black">Générateur de CV ATS</h1>
            <p className="text-sky-300 dark:text-gray-400 text-xs">Optimisé pour les systèmes de recrutement</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black ${score >= 80 ? 'bg-teal-500' : score >= 50 ? 'bg-cyan-500' : 'bg-amber-500'}`}>Score ATS : {score}%</span>
            <button onClick={handlePrint} className="px-4 py-2 bg-white dark:bg-gray-800 text-sky-800 dark:text-gray-100 rounded-xl text-xs font-black flex items-center gap-1.5"><Printer size={14} /> Imprimer</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        {!profileLoaded && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-sky-100 dark:border-gray-700 text-center">
            <User size={48} className="mx-auto mb-3 text-sky-300 dark:text-gray-600" />
            <button onClick={loadProfile} disabled={loading} className="bg-cyan-500 text-white px-6 py-3 rounded-xl font-black text-sm">
              {loading ? 'Chargement...' : 'Charger mon profil'}
            </button>
            <p className="text-xs text-sky-400 dark:text-gray-400 mt-2">ou remplissez manuellement ci-dessous</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Formulaire */}
          <div className="space-y-4">
            {/* Infos perso */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
              <h2 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase mb-3 flex items-center gap-2"><User size={14} className="text-cyan-500" /> Informations</h2>
              <div className="grid grid-cols-2 gap-3">
                <input value={cv.fullName} onChange={e => setCv({...cv, fullName: e.target.value})} className="col-span-2 p-3 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none focus:border-cyan-500 border border-sky-100 dark:border-gray-700" placeholder="Nom complet *" />
                <input value={cv.email} onChange={e => setCv({...cv, email: e.target.value})} className="p-3 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none focus:border-cyan-500 border border-sky-100 dark:border-gray-700" placeholder="Email *" />
                <input value={cv.phone} onChange={e => setCv({...cv, phone: e.target.value})} className="p-3 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none focus:border-cyan-500 border border-sky-100 dark:border-gray-700" placeholder="Téléphone" />
                <input value={cv.location} onChange={e => setCv({...cv, location: e.target.value})} className="p-3 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none focus:border-cyan-500 border border-sky-100 dark:border-gray-700" placeholder="Ville" />
                <input value={cv.title} onChange={e => setCv({...cv, title: e.target.value})} className="p-3 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none focus:border-cyan-500 border border-sky-100 dark:border-gray-700" placeholder="Titre (ex: Dev Fullstack)" />
              </div>
            </div>

            {/* Résumé */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
              <textarea value={cv.summary} onChange={e => setCv({...cv, summary: e.target.value})} rows={3}
                className="w-full p-3 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm text-sky-800 dark:text-gray-100 outline-none focus:border-cyan-500 border border-sky-100 dark:border-gray-700 resize-none" placeholder="Résumé professionnel (conseil ATS : 50+ caractères)" />
            </div>

            {/* Skills */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
              <h2 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase mb-3 flex items-center gap-2"><Star size={14} className="text-cyan-500" /> Compétences</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {cv.skills.map((s, i) => <span key={i} className="flex items-center gap-1 bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-lg text-xs font-bold">{s} <button onClick={() => setCv({...cv, skills: cv.skills.filter(x => x !== s)})}><X size={12} /></button></span>)}
              </div>
              <div className="flex gap-2"><input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="flex-1 p-2.5 bg-sky-50 dark:bg-gray-800 rounded-xl text-sm outline-none border border-sky-100 dark:border-gray-700" placeholder="React, Firebase..." /><button onClick={addSkill} className="px-4 bg-cyan-500 text-white rounded-xl text-xs font-black">+</button></div>
            </div>

            {/* Expérience */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase flex items-center gap-2"><Briefcase size={14} className="text-cyan-500" /> Expérience</h2>
                <button onClick={addExp} className="text-cyan-500 text-xs font-black flex items-center gap-1"><Plus size={12} /> Ajouter</button>
              </div>
              {cv.experience.map((exp, i) => (
                <div key={i} className="bg-sky-50 dark:bg-gray-800/50 rounded-xl p-3 mb-2 space-y-2">
                  <div className="flex gap-2">
                    <input value={exp.company} onChange={e => updateExp(i, 'company', e.target.value)} className="flex-1 p-2 bg-white dark:bg-gray-800 rounded-lg text-xs text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700" placeholder="Entreprise" />
                    <button onClick={() => removeExp(i)} className="text-red-400 p-1"><X size={14} /></button>
                  </div>
                  <input value={exp.role} onChange={e => updateExp(i, 'role', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 rounded-lg text-xs text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700" placeholder="Poste" />
                  <input value={exp.period} onChange={e => updateExp(i, 'period', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 rounded-lg text-xs text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700" placeholder="Période (ex: 2023-2025)" />
                </div>
              ))}
            </div>

            {/* Formation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase flex items-center gap-2"><GraduationCap size={14} className="text-cyan-500" /> Formation</h2>
                <button onClick={addEdu} className="text-cyan-500 text-xs font-black flex items-center gap-1"><Plus size={12} /> Ajouter</button>
              </div>
              {cv.education.map((edu, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                  <input value={edu.school} onChange={e => updateEdu(i, 'school', e.target.value)} className="p-2 bg-sky-50 dark:bg-gray-800 rounded-lg text-xs text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700" placeholder="École" />
                  <input value={edu.degree} onChange={e => updateEdu(i, 'degree', e.target.value)} className="p-2 bg-sky-50 dark:bg-gray-800 rounded-lg text-xs text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700" placeholder="Diplôme" />
                  <input value={edu.year} onChange={e => updateEdu(i, 'year', e.target.value)} className="p-2 bg-sky-50 dark:bg-gray-800 rounded-lg text-xs text-sky-800 dark:text-gray-100 outline-none border border-sky-100 dark:border-gray-700" placeholder="Année" />
                </div>
              ))}
            </div>

            {/* Langues + Certifications */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
                <h2 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase mb-3">Langues</h2>
                <div className="flex flex-wrap gap-1.5 mb-2">{cv.languages.map((l, i) => <span key={i} className="bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold">{l} <button onClick={() => setCv({...cv, languages: cv.languages.filter(x => x !== l)})}><X size={10} /></button></span>)}</div>
                <div className="flex gap-1"><input value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLang())} className="flex-1 p-2 bg-sky-50 dark:bg-gray-800 rounded-lg text-xs outline-none border border-sky-100 dark:border-gray-700" placeholder="Français, Anglais..." /><button onClick={addLang} className="px-3 bg-cyan-500 text-white rounded-lg text-xs font-black">+</button></div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-sky-100 dark:border-gray-700">
                <h2 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase mb-3">Certifications</h2>
                <div className="flex flex-wrap gap-1.5 mb-2">{cv.certifications.map((c, i) => <span key={i} className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 px-2 py-0.5 rounded text-[10px] font-bold">{c} <button onClick={() => setCv({...cv, certifications: cv.certifications.filter(x => x !== c)})}><X size={10} /></button></span>)}</div>
                <div className="flex gap-1"><input value={certInput} onChange={e => setCertInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCert())} className="flex-1 p-2 bg-sky-50 dark:bg-gray-800 rounded-lg text-xs outline-none border border-sky-100 dark:border-gray-700" placeholder="AWS, PMP..." /><button onClick={addCert} className="px-3 bg-teal-500 text-white rounded-lg text-xs font-black">+</button></div>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-sky-100 dark:border-gray-700 p-6 sticky top-4 shadow-sm dark:shadow-gray-900/30 print:shadow-none print:border-none" id="cv-preview">
              <div className="text-center mb-4 pb-4 border-b border-sky-100 dark:border-gray-700">
                <h1 className="text-xl font-black text-sky-800 dark:text-gray-100">{cv.fullName || 'Votre Nom'}</h1>
                <p className="text-sky-500 dark:text-gray-300 text-sm font-medium">{cv.title || 'Titre professionnel'}</p>
                <div className="flex justify-center gap-3 mt-2 text-xs text-sky-400 dark:text-gray-400">
                  {cv.email && <span>{cv.email}</span>}
                  {cv.phone && <span>{cv.phone}</span>}
                  {cv.location && <span>{cv.location}</span>}
                </div>
              </div>
              {cv.summary && <div className="mb-4"><h3 className="text-xs font-black text-sky-600 dark:text-gray-300 uppercase mb-1">Résumé</h3><p className="text-sm text-sky-700 dark:text-gray-300 leading-relaxed">{cv.summary}</p></div>}
              {cv.skills.length > 0 && <div className="mb-4"><h3 className="text-xs font-black text-sky-600 dark:text-gray-300 uppercase mb-1">Compétences</h3><div className="flex flex-wrap gap-1.5">{cv.skills.map((s, i) => <span key={i} className="bg-sky-50 dark:bg-gray-700 text-sky-700 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-bold">{s}</span>)}</div></div>}
              {cv.experience.some(e => e.company) && <div className="mb-4"><h3 className="text-xs font-black text-sky-600 dark:text-gray-300 uppercase mb-1">Expérience</h3>{cv.experience.filter(e => e.company).map((e, i) => <div key={i} className="mb-2"><p className="text-sm font-bold text-sky-800 dark:text-gray-100">{e.role} — {e.company}</p><p className="text-xs text-sky-400 dark:text-gray-400">{e.period}</p></div>)}</div>}
              {cv.education.some(e => e.school) && <div className="mb-4"><h3 className="text-xs font-black text-sky-600 dark:text-gray-300 uppercase mb-1">Formation</h3>{cv.education.filter(e => e.school).map((e, i) => <div key={i} className="mb-1"><p className="text-sm font-bold text-sky-800 dark:text-gray-100">{e.degree} — {e.school}</p><p className="text-xs text-sky-400 dark:text-gray-400">{e.year}</p></div>)}</div>}
              {cv.languages.length > 0 && <p className="text-xs text-sky-500 dark:text-gray-300">Langues : {cv.languages.join(', ')}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

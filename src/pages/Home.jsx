import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerUser, loginUser, resetPassword } from '../firebase/authService'; 
import { auth } from '../firebase/firebaseConfig';
import { requestNotificationPermission } from '../firebase/notificationService'; 
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import { Mail, Info, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '../composants/boutons';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('candidate');
  
  // États de base existants
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Nouveaux états dynamiques inspirés de l'image
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('Cameroun');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Masculin');
  const [birthDate, setBirthDate] = useState('');
  const [creationDate, setCreationDate] = useState(''); // Pour le recruteur
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !loading) {
        if (!user.emailVerified) {
          setIsWaitingVerification(true);
        }
      }
    });
    return () => unsubscribe();
  }, [loading]);

  const handleForgotPass = async () => {
    if (!email) {
      toast.error(t('notifications.enter_email'));
      return;
    }
    const result = await resetPassword(email.trim());
    if (result.success) toast.success(t('notifications.email_sent'));
    else toast.error(result.error);
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      const user = auth.currentUser;
      
      if (user?.emailVerified) {
        toast.success(t('notifications.success_verified'));
        setIsWaitingVerification(false);
        if (role === 'recruiter') {
          navigate('/DashboardRecruiter');
        } else {
          navigate('/offres');
        }
      } else {
        toast.error(t('notifications.email_not_verified'));
      }
    } catch (_err) {
      toast.error(t('notifications.error_verification'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLoginMode && !agreeTerms) {
      toast.error(t('notifications.error_terms'));
      return;
    }
    if (!isLoginMode && fullName.length < 2) {
      toast.error(t('notifications.error_valid_name'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('notifications.error_password_short'));
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim();

      if (isLoginMode) {
        const result = await loginUser(cleanEmail, password);
        if (result.success) {
          if (!auth.currentUser.emailVerified) {
            toast.info(t('notifications.verify_email_first'));
            setIsWaitingVerification(true);
            setLoading(false);
            return;
          }

          toast.success(t('notifications.success_login'));
          requestNotificationPermission(auth.currentUser.uid);
          if (result.role === 'recruiter') {
            navigate('/DashboardRecruiter'); 
          } else {
            navigate('/offres');
          }
        } else {
          toast.error(result.error || t('notifications.error_login'));
        }
      } else {
        const result = await registerUser(cleanEmail, password, role, fullName);
        if (result.success) {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            toast.success(t('notifications.success_register'));
            setIsWaitingVerification(true);
          }
        } else {
          toast.error(result.error || t('notifications.error_missing_fields'));
        }
      }
    } catch (err) {
      console.error("Erreur complète :", err);
      toast.error(err.message || "Un problème technique est survenu.");
    } finally {
      setLoading(false);
    }
  };

  if (isWaitingVerification) {
    return (
      <div className="min-h-screen bg-[#082f49] flex items-center justify-center p-4 font-sans text-white">
        <div className="bg-white/[0.06] w-full max-w-md p-8 rounded-3xl shadow-2xl border border-white/10 text-center space-y-6">
          <div className="w-16 h-16 bg-cyan-500/10 text-cyan-500 rounded-2xl flex items-center justify-center mx-auto">
            <Mail size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">{t('auth.confirmer_email')}</h2>
            <p className="text-sm text-sky-300 leading-relaxed">
              {t('auth.lien_activation')} <br />
              <strong className="text-cyan-500 font-semibold">{email || auth.currentUser?.email}</strong>.
            </p>
          </div>
          <button 
            type="button" 
            disabled={loading}
            onClick={handleCheckVerification} 
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#082f49] font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95"
          >
            {loading ? t('auth.verification') : t('auth.valider_email')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-[#0a4a6e] to-cyan-950 flex items-center justify-center p-4 md:p-8 font-sans selection:bg-cyan-500/20 text-white relative overflow-hidden">
      
      {/* Effets de lumière */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-cyan-400/8 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-2xl pointer-events-none"></div>
      
      {/* Logo CW en arrière-plan (watermark) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span className="text-[20rem] md:text-[30rem] font-black tracking-tighter text-white/[0.03] leading-none"
          style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(45,212,191,0.06))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CW
        </span>
      </div>

      {/* BOUTON RETOUR ABSOLU */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-white transition-colors uppercase tracking-wider"
      >
        <ArrowLeft size={16} /> {t('auth.retour')}
      </button>

      <div className="w-full max-w-md mx-auto space-y-6 pt-8 relative z-10">
        
        {/* SÉLECTEUR DE LANGUE */}
        <div className="flex justify-center">
          <LanguageSwitcher variant="pill" />
        </div>

        {/* LOGO CW */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/30 hover:scale-110 active:scale-95 transition-transform duration-200 cursor-pointer">
            <span className="font-black text-2xl tracking-tighter text-white select-none leading-none">CW</span>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full shadow-md"></div>
          </div>
        </div>

        {/* TITRE PRINCIPAL */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-sky-100">
            {isLoginMode ? t('auth.connexion') : t('auth.creer_compte')}
          </h1>
          <p className="text-xs text-sky-400 font-medium">
            {isLoginMode ? t('auth.welcome_back') : t('auth.fill_info')}
          </p>
        </div>

        {/* SÉLECTEUR DE RÔLE (Candidat vs Recruteur) - Visible uniquement à l'inscription */}
        {!isLoginMode && (
          <div className="grid grid-cols-2 p-1 bg-[#075985] rounded-xl border border-white/5">
            <button 
              type="button" 
              onClick={() => setRole('candidate')} 
              className={`py-2.5 rounded-lg text-xs font-bold uppercase transition-all tracking-wider ${role === 'candidate' ? 'bg-cyan-500 text-[#0c4a6e] shadow-md' : 'text-sky-400 hover:text-white'}`}
            >
               {t('auth.candidat')}
             </button>
             <button 
               type="button" 
               onClick={() => setRole('recruiter')} 
               className={`py-2.5 rounded-lg text-xs font-bold uppercase transition-all tracking-wider ${role === 'recruiter' ? 'bg-cyan-500 text-[#0c4a6e] shadow-md' : 'text-sky-400 hover:text-white'}`}
             >
               {t('auth.recruteur')}
            </button>
          </div>
        )}

        {/* FORMULAIRE UNIQUE REPRIS DE L'IMAGE */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ---- MODE INSCRIPTION : CHAMPS DYNAMIQUES ---- */}
          {!isLoginMode && (
            <>
              {role === 'candidate' ? (
                /* ---- CHAMPS CANDIDAT ---- */
                <>
                  <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.nom')} />
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.prenoms')} />
                  <input required value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.pays')} />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.email')} />
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.telephone')} />

                  {/* SÉLECTEUR GENRE INSPIRED BY IMAGE */}
                  <div className="flex items-center gap-4 py-1 text-sm font-medium text-sky-300">
                    <span>{t('auth.sexe')}</span>
                    <button type="button" onClick={() => setGender('Masculin')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gender === 'Masculin' ? 'bg-cyan-500 text-[#0c4a6e]' : 'bg-[#075985] border border-white/5'}`}>{t('auth.masculin')}</button>
                    <button type="button" onClick={() => setGender('Féminin')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gender === 'Féminin' ? 'bg-cyan-500 text-[#0c4a6e]' : 'bg-[#075985] border border-white/5'}`}>{t('auth.feminin')}</button>
                  </div>

              {/* DATE DE NAISSANCE */}
                   <div className="flex items-center justify-between gap-4 py-1 text-sm font-medium text-sky-300">
                     <span>{t('auth.date_naissance')}</span>
                    <input required type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="px-4 py-2 bg-[#075985] border border-white/5 rounded-lg outline-none text-xs text-sky-200 focus:border-cyan-500" />
                  </div>
                </>
              ) : (
                /* ---- CHAMPS RECRUTEUR ---- */
                <>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.nom_entreprise')} />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.email_entreprise')} />
                  <input required value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.pays')} />
                  
                  {/* DATE DE CRÉATION */}
                  <div className="flex items-center justify-between gap-4 py-1 text-sm font-medium text-sky-300">
                    <span>{t('auth.date_creation')}</span>
                    <input required type="date" value={creationDate} onChange={(e) => setCreationDate(e.target.value)} className="px-4 py-2 bg-[#075985] border border-white/5 rounded-lg outline-none text-xs text-sky-200 focus:border-cyan-500" />
                  </div>
                </>
              )}
            </>
          )}

          {/* ---- MODE CONNEXION : CHAMPS SIMPLES ---- */}
          {isLoginMode && (
            <>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.email')} />
              <div className="space-y-1">
                <div className="flex justify-end">
                  <button type="button" onClick={handleForgotPass} className="text-[10px] font-bold text-cyan-500 hover:underline uppercase tracking-wider">{t('auth.oublie')}</button>
                </div>
              </div>
            </>
          )}

          {/* MOT DE PASSE (Partagé par les deux modes) */}
          <div className="relative">
            <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 pr-12 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder={t('auth.mot_de_passe')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 hover:text-cyan-400 transition-colors p-1" tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* TERMS AND CONDITIONS CHECKBOX AS SHOWN IN IMAGE */}
          {!isLoginMode && (
            <label className="flex items-center gap-3 cursor-pointer pt-2 select-none">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="accent-cyan-500 h-4 w-4 rounded-md" />
              <span className="text-xs text-sky-300 font-medium">
                {t('auth.accepter_termes')}
              </span>
            </label>
          )}

          {/* BOUTON PRINCIPAL JAUNE ORANGE DE L'IMAGE */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#fca311] hover:bg-[#e5940e] text-[#0c4a6e] font-bold py-4 rounded-xl shadow-lg mt-4 transition-all active:scale-[0.98] uppercase tracking-wider text-sm disabled:bg-sky-700 disabled:text-sky-400"
          >
            {loading ? t('auth.chargement') : (isLoginMode ? t('auth.login') : t('auth.commencer'))}
          </button>
        </form>

        {/* LIEN DE COMMUTATION INTERACTION INTERNE */}
        <div className="text-center pt-2">
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-cyan-500 font-bold hover:underline text-xs tracking-wide">
            {isLoginMode ? t('auth.nouveau') : t('auth.deja_compte')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Home;

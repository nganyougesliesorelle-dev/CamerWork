import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerUser, loginWithMfa, resetPassword, signInWithGoogle } from '../firebase/authService';
import { auth } from '../firebase/firebaseConfig';
import { requestNotificationPermission } from '../firebase/notificationService'; 
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import { Mail, Info, CheckCircle, ArrowLeft, Eye, EyeOff, ShieldCheck, Loader } from 'lucide-react';

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
  const [niu, setNiu] = useState(''); // NIU (Numéro d'Identifiant Unique) pour recruteur
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);

  // États MFA (double authentification)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaResolver, setMfaResolver] = useState(null);
  const [mfaEmail, setMfaEmail] = useState('');

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

  // Vérifie si l'email utilise un fournisseur gratuit (non-professionnel)
  const isFreeEmailProvider = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    const freeDomains = [
      'gmail.com', 'googlemail.com',
      'yahoo.com', 'yahoo.fr', 'ymail.com',
      'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
      'aol.com', 'aol.fr',
      'icloud.com', 'me.com', 'mac.com',
      'protonmail.com', 'proton.me', 'pm.me',
      'mail.com', 'email.com',
      'gmx.com', 'gmx.fr', 'gmx.de', 'web.de',
      'laposte.net',
      'orange.fr', 'wanadoo.fr', 'sfr.fr', 'free.fr',
      'yandex.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru',
      'inbox.com', 'zoho.com',
    ];
    return freeDomains.includes(domain);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        toast.success(t('notifications.success_login', 'Connexion réussie !'));
        requestNotificationPermission(auth.currentUser.uid);
        if (result.role === 'recruiter') {
          navigate('/DashboardRecruiter');
        } else {
          navigate('/offres');
        }
      } else {
        toast.error(result.error || 'Erreur lors de la connexion avec Google');
      }
    } catch (err) {
      console.error("Erreur complète Google :", err);
      toast.error('Un problème technique est survenu avec Google Sign-In.');
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

    // Validation téléphone camerounais
    if (!isLoginMode && role === 'candidate' && phone.trim()) {
      let clean = phone.trim().replace(/[\s-]/g, '');
      if (clean.startsWith('+237')) clean = clean.slice(4);
      else if (clean.startsWith('00237')) clean = clean.slice(5);
      else if (clean.length === 12 && clean.startsWith('237')) clean = clean.slice(3);

      if (!/^[26]\d{8}$/.test(clean)) {
        toast.error('Numéro de téléphone invalide. Format attendu : 9 chiffres, commençant par 6 (mobile) ou 2 (fixe).');
        return;
      }
    }

    // Validation email professionnel pour les recruteurs
    if (!isLoginMode && role === 'recruiter' && isFreeEmailProvider(email.trim())) {
      toast.error(t('notifications.error_recruiter_free_email'));
      return;
    }

    // Validation date de naissance
    if (!isLoginMode && role === 'candidate' && birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      
      if (birth > today) {
        toast.error('La date de naissance ne peut pas être dans le futur.');
        return;
      }

      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      
      if (age < 18) {
        toast.error('Vous devez avoir au moins 18 ans pour créer un compte.');
        return;
      }
      
      if (age > 100) {
        toast.error('La date de naissance est invalide (âge supérieur à 100 ans).');
        return;
      }
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim();

      if (isLoginMode) {
        const result = await loginWithMfa(cleanEmail, password);
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
        } else if (result.mfaRequired) {
          // MFA requis — afficher l'écran de saisie du code
          setMfaRequired(true);
          setMfaResolver(result.mfaResolver);
          setMfaEmail(cleanEmail);
          setLoading(false);
          return;
        } else {
          toast.error(result.error || t('notifications.error_login'));
        }
      } else {
        const result = await registerUser(cleanEmail, password, role, fullName, {
          username, gender, birthDate, country, phone,
          niu: role === 'recruiter' ? niu : '',
          company: role === 'recruiter' ? fullName : '',
          creationDate: role === 'recruiter' ? creationDate : '',
        });
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

  // Handler pour soumettre le code MFA
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      toast.error('Veuillez saisir le code à 6 chiffres.');
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithMfa(mfaEmail, '', mfaCode, mfaResolver);
      if (result.success) {
        toast.success(t('notifications.success_login'));
        requestNotificationPermission(auth.currentUser.uid);
        if (result.role === 'recruiter') navigate('/DashboardRecruiter');
        else navigate('/offres');
      } else {
        toast.error(result.error || 'Code incorrect. Veuillez réessayer.');
      }
    } catch {
      toast.error('Erreur de vérification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMfa = () => {
    setMfaRequired(false);
    setMfaCode('');
    setMfaResolver(null);
    setMfaEmail('');
  };

  // Écran MFA — saisie du code de double authentification
  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-900 via-[#0a4a6e] to-cyan-950 flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-cyan-400/8 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md mx-auto space-y-6 relative z-10">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative w-16 h-16 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <span className="font-black text-2xl tracking-tighter text-white select-none leading-none">CW</span>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full shadow-md" />
            </div>
          </div>

          {/* Titre */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck size={24} className="text-teal-400" />
              <h1 className="text-2xl font-bold tracking-tight text-sky-100">{t('auth.verification_deux_etapes', 'Vérification en deux étapes')}</h1>
            </div>
            <p className="text-xs text-sky-400 font-medium">
              Saisissez le code à 6 chiffres de votre application d'authentification.
            </p>
            <p className="text-[11px] text-sky-500 mt-1">
              Connecté en tant que <strong className="text-cyan-400">{mfaEmail}</strong>
            </p>
          </div>

          {/* Formulaire MFA */}
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <input
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-5 py-4 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-center text-2xl font-mono font-bold tracking-[0.5em] text-cyan-400 transition-all placeholder:text-sky-600"
              placeholder="000000"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#0c4a6e] font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-wider text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {loading ? t('auth.verification') : t('auth.valider', 'Valider')}
            </button>
          </form>

          {/* Annuler */}
          <div className="text-center">
            <button
              onClick={handleCancelMfa}
              className="text-sky-400 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 mx-auto"
            >
              <ArrowLeft size={14} /> {t('auth.retour_connexion', 'Retour à la connexion')}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  <input value={niu} onChange={(e) => setNiu(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="NIU (Numéro Identifiant Unique)" />
                  
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

        {/* SEPARATEUR ET BOUTON GOOGLE */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="px-3 text-xs text-sky-400 font-medium uppercase tracking-wider">{t('auth.ou', 'ou')}</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

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
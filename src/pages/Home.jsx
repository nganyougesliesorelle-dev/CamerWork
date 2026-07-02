import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, resetPassword } from '../firebase/authService'; 
import { auth } from '../firebase/firebaseConfig';
import { requestNotificationPermission } from '../firebase/notificationService'; 
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import { Mail, Info, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const Home = () => {
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
  const [gender, setGender] = useState('Male');
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
      toast.error("Veuillez entrer votre email d'abord.");
      return;
    }
    const result = await resetPassword(email.trim());
    if (result.success) toast.success("Email de réinitialisation envoyé !");
    else toast.error(result.error);
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      const user = auth.currentUser;
      
      if (user?.emailVerified) {
        toast.success("Compte validé avec succès ! Bienvenue.");
        setIsWaitingVerification(false);
        if (role === 'recruiter') {
          navigate('/DashboardRecruiter');
        } else {
          navigate('/offres');
        }
      } else {
        toast.error("Votre adresse e-mail n'a pas encore été validée. Vérifiez votre boîte de réception.");
      }
    } catch (_err) {
      toast.error("Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLoginMode && !agreeTerms) {
      toast.error("Veuillez accepter les termes et conditions.");
      return;
    }
    if (!isLoginMode && fullName.length < 2) {
      toast.error("Veuillez entrer un nom valide.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim();

      if (isLoginMode) {
        const result = await loginUser(cleanEmail, password);
        if (result.success) {
          if (!auth.currentUser.emailVerified) {
            toast.info("Veuillez valider votre adresse e-mail avant de vous connecter.");
            setIsWaitingVerification(true);
            setLoading(false);
            return;
          }

          toast.success("Content de vous revoir !");
          requestNotificationPermission(auth.currentUser.uid);
          if (result.role === 'recruiter') {
            navigate('/DashboardRecruiter'); 
          } else {
            navigate('/offres');
          }
        } else {
          toast.error(result.error || "Erreur de connexion");
        }
      } else {
        // Tu pourras ajouter country, phone, gender, birthDate, creationDate ici si ta fonction registerUser évolue !
        const result = await registerUser(cleanEmail, password, role, fullName);
        if (result.success) {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            toast.success("Un e-mail de confirmation vous a été envoyé !");
            setIsWaitingVerification(true);
          }
        } else {
          toast.error(result.error || "Erreur lors de l'inscription");
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
        <div className="bg-[#0c4a6e] w-full max-w-md p-8 rounded-3xl shadow-2xl border border-white/10 text-center space-y-6">
          <div className="w-16 h-16 bg-cyan-500/10 text-cyan-500 rounded-2xl flex items-center justify-center mx-auto">
            <Mail size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Confirmez votre e-mail</h2>
            <p className="text-sm text-sky-300 leading-relaxed">
              Un lien d'activation a été envoyé à l'adresse <br />
              <strong className="text-cyan-500 font-semibold">{email || auth.currentUser?.email}</strong>.
            </p>
          </div>
          <button 
            type="button" 
            disabled={loading}
            onClick={handleCheckVerification} 
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-[#082f49] font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95"
          >
            {loading ? "Vérification..." : "J'ai validé mon e-mail"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0c4a6e] via-[#0c4a6e] to-[#082f49] flex items-center justify-center p-4 md:p-8 font-sans selection:bg-cyan-500/20 text-white relative">
      
      {/* BOUTON RETOUR ABSOLU */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-white transition-colors uppercase tracking-wider"
      >
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="w-full max-w-md mx-auto space-y-6 pt-8">
        
        {/* TITRE PRINCIPAL */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-sky-100">
            {isLoginMode ? "Connexion" : "Creer un compte"}
          </h1>
          <p className="text-xs text-sky-400 font-medium">
            {isLoginMode ? "Heureux de vous revoir sur CamerWork" : "Remplissez vos informations pour commencer"}
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
              Candidat
            </button>
            <button 
              type="button" 
              onClick={() => setRole('recruiter')} 
              className={`py-2.5 rounded-lg text-xs font-bold uppercase transition-all tracking-wider ${role === 'recruiter' ? 'bg-cyan-500 text-[#0c4a6e] shadow-md' : 'text-sky-400 hover:text-white'}`}
            >
              Recruteur
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
                  <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Nom" />
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Prénoms" />
                  <input required value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Pays" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="E-mail" />
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Télephone" />

                  {/* SÉLECTEUR GENRE INSPIRED BY IMAGE */}
                  <div className="flex items-center gap-4 py-1 text-sm font-medium text-sky-300">
                    <span>Sexe</span>
                    <button type="button" onClick={() => setGender('Masculin')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gender === 'Male' ? 'bg-cyan-500 text-[#0c4a6e]' : 'bg-[#075985] border border-white/5'}`}>Masculin</button>
                    <button type="button" onClick={() => setGender('Féminin')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${gender === 'Female' ? 'bg-cyan-500 text-[#0c4a6e]' : 'bg-[#075985] border border-white/5'}`}>Féminin</button>
                  </div>

                  {/* DATE DE NAISSANCE */}
                  <div className="flex items-center justify-between gap-4 py-1 text-sm font-medium text-sky-300">
                    <span>Date De Naissance</span>
                    <input required type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="px-4 py-2 bg-[#075985] border border-white/5 rounded-lg outline-none text-xs text-sky-200 focus:border-cyan-500" />
                  </div>
                </>
              ) : (
                /* ---- CHAMPS RECRUTEUR ---- */
                <>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Nom de l'entreprise" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Email de l'entreprise" />
                  <input required value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Pays" />
                  
                  {/* DATE DE CRÉATION */}
                  <div className="flex items-center justify-between gap-4 py-1 text-sm font-medium text-sky-300">
                    <span>Date de création</span>
                    <input required type="date" value={creationDate} onChange={(e) => setCreationDate(e.target.value)} className="px-4 py-2 bg-[#075985] border border-white/5 rounded-lg outline-none text-xs text-sky-200 focus:border-cyan-500" />
                  </div>
                </>
              )}
            </>
          )}

          {/* ---- MODE CONNEXION : CHAMPS SIMPLES ---- */}
          {isLoginMode && (
            <>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="E-mail" />
              <div className="space-y-1">
                <div className="flex justify-end">
                  <button type="button" onClick={handleForgotPass} className="text-[10px] font-bold text-cyan-500 hover:underline uppercase tracking-wider">Oublié ?</button>
                </div>
              </div>
            </>
          )}

          {/* MOT DE PASSE (Partagé par les deux modes) */}
          <div className="relative">
            <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 pr-12 py-3.5 bg-[#075985] border border-white/5 rounded-xl outline-none focus:border-cyan-500 text-sm transition-all placeholder:text-sky-500 font-medium text-sky-100" placeholder="Password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 hover:text-cyan-400 transition-colors p-1" tabIndex={-1}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* TERMS AND CONDITIONS CHECKBOX AS SHOWN IN IMAGE */}
          {!isLoginMode && (
            <label className="flex items-center gap-3 cursor-pointer pt-2 select-none">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="accent-cyan-500 h-4 w-4 rounded-md" />
              <span className="text-xs text-sky-300 font-medium">
                Agree with <span className="text-cyan-500 underline">Terms & Conditions</span>
              </span>
            </label>
          )}

          {/* BOUTON PRINCIPAL JAUNE ORANGE DE L'IMAGE */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#fca311] hover:bg-[#e5940e] text-[#0c4a6e] font-bold py-4 rounded-xl shadow-lg mt-4 transition-all active:scale-[0.98] uppercase tracking-wider text-sm disabled:bg-sky-700 disabled:text-sky-400"
          >
            {loading ? "Chargement..." : (isLoginMode ? "Login" : "Commencer l'aventure")}
          </button>
        </form>

        {/* LIEN DE COMMUTATION INTERACTION INTERNE */}
        <div className="text-center pt-2">
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-cyan-500 font-bold hover:underline text-xs tracking-wide">
            {isLoginMode ? "Nouveau sur CamerWork ? Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Home;
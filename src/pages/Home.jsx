import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, resetPassword } from '../firebase/authService'; 
import { auth } from '../firebase/firebaseConfig'; 
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import { Mail, Lock, User, Building2, ArrowRight, Info, CheckCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('candidate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Nouvel état pour gérer la double authentification par e-mail
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !loading) {
        // Si l'utilisateur est connecté mais que son email n'est pas encore vérifié,
        // on le maintient sur l'écran de vérification.
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

  // Permet à l'utilisateur de vérifier manuellement s'il a cliqué sur le lien
  const handleCheckVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      const user = auth.currentUser;
      
      if (user?.emailVerified) {
        toast.success("Compte validé avec succès ! Bienvenue.");
        setIsWaitingVerification(false);
        // Lecture du rôle pour la redirection finale
        if (role === 'recruiter') {
          navigate('/DashboardRecruiter');
        } else {
          navigate('/offres');
        }
      } else {
        toast.error("Votre adresse e-mail n'a pas encore été validée. Vérifiez votre boîte de réception.");
      }
    } catch (err) {
      toast.error("Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
          // Vérification double facteur au login
          if (!auth.currentUser.emailVerified) {
            toast.info("Veuillez valider votre adresse e-mail avant de vous connecter.");
            setIsWaitingVerification(true);
            setLoading(false);
            return;
          }

          toast.success("Content de vous revoir !");
          if (result.role === 'recruiter') {
            navigate('/DashboardRecruiter'); 
          } else {
            navigate('/offres');
          }
        } else {
          toast.error(result.error || "Erreur de connexion");
        }
      } else {
        const result = await registerUser(cleanEmail, password, role, fullName);
        if (result.success) {
          // Envoi immédiat de l'email de validation
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

  // ÉCRAN INTERMÉDIAIRE : DOUBLE FACTEUR / EN ATTENTE DE CLIC SUR LE LIEN EMAIL
  if (isWaitingVerification) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
        <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Mail size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Confirmez votre e-mail</h2>
            <p className="text-sm text-slate-500 font-medium">
              Un lien d'activation sécurisé a été envoyé à l'adresse <strong className="text-slate-700">{email || auth.currentUser?.email}</strong>.
            </p>
          </div>
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 text-left flex gap-3 text-xs text-blue-800 font-medium leading-relaxed">
            <span className="text-blue-600 flex-shrink-0 mt-0.5"><Info size={14} /></span>
            <p>Cliquez sur le lien contenu dans le message, puis revenez sur cette page pour valider l'accès.</p>
          </div>
          <button 
            type="button" 
            disabled={loading}
            onClick={handleCheckVerification} 
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-colors disabled:bg-slate-300"
          >
            {loading ? "Vérification..." : "J'ai validé mon e-mail"} <CheckCircle size={18} />
          </button>
          <button 
            type="button" 
            onClick={() => {
              auth.signOut();
              setIsWaitingVerification(false);
            }} 
            className="text-xs text-slate-400 font-bold hover:text-blue-700 transition-colors uppercase tracking-widest"
          >
            Retourner à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[650px] border border-slate-100">
        
        {/* SECTION GAUCHE */}
        <div className="md:w-5/12 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 text-white flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-blue-900 font-black text-xl">CW</span>
              </div>
              <span className="text-2xl font-black tracking-tighter">CamerWork</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold leading-tight">
                {isLoginMode ? "Ravi de vous revoir !" : "L'avenir professionnel du Cameroun se trouve ici"}
              </h1>
              <p className="text-blue-100 text-lg font-medium opacity-90">
                Connectez-vous pour accéder aux meilleures opportunités.
              </p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 mt-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-yellow-400 text-blue-900 p-1 rounded-lg"><Info size={14} /></span>
              <span className="font-bold text-sm text-yellow-400 uppercase tracking-widest">Info</span>
            </div>
            <p className="text-sm text-blue-50">Venez découvrir l'univers de l'emploi sur CamerWork.</p>
          </div>
        </div>

        {/* SECTION DROITE */}
        <div className="md:w-7/12 p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">
              {isLoginMode ? "Connexion" : "Créer un compte"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLoginMode && (
              <>
                <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-6">
                  <button type="button" onClick={() => setRole('candidate')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center ${role === 'candidate' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                    <User size={16} className="mr-2"/> Candidat
                  </button>
                  <button type="button" onClick={() => setRole('recruiter')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center ${role === 'recruiter' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                    <Building2 size={16} className="mr-2"/> Recruteur
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nom / Entreprise</label>
                  <div className="relative mt-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none" placeholder="Votre nom" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none" placeholder="exemple@mail.com" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mot de passe</label>
                {isLoginMode && <button type="button" onClick={handleForgotPass} className="text-[10px] font-black text-blue-600 uppercase">Oublié ?</button>}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-5 rounded-2xl shadow-xl mt-4 flex items-center justify-center gap-3 disabled:bg-slate-300 transition-colors">
              {loading ? "Chargement..." : (isLoginMode ? "Connexion" : "Démarrer")}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-blue-700 font-black hover:underline text-sm">
              {isLoginMode ? "Nouveau sur CamerWork ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
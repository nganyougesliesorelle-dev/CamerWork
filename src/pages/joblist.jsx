import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Building2, Clock, User, ChevronDown, PlusCircle, LogOut, Sparkles } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig'; 
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; 
import { toast } from 'sonner';
import { calculateMatchingScore } from "../firebase/matchingEngine";
// Composant Carte d'Offre avec Badge de Correspondance Intelligent
const JobCard = ({ job, score, userRole, onClick }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return "À l'instant";
    try {
        const date = timestamp.toDate();
        const diff = new Date() - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return "Aujourd'hui";
        return `Il y a ${days} j`;
    } catch (_e) {
        return "Récemment";
    }
  };

  // Couleurs dynamiques selon le pourcentage de compatibilité
  const getScoreBadgeStyle = (score) => {
    if (score >= 75) return "bg-gradient-to-r from-cyan-500 to-yellow-500 text-white shadow-sm shadow-cyan-200 animate-pulse";
    if (score >= 40) return "bg-sky-50 text-sky-600 border border-sky-200";
    return "bg-sky-50 text-sky-500";
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-sm border border-sky-100 hover:shadow-xl hover:border-sky-200 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="bg-sky-50 p-3 rounded-xl group-hover:bg-cyan-600 transition-colors">
            <Building2 className="w-6 h-6 text-cyan-600 group-hover:text-white" />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Affichage du badge de score uniquement pour les candidats connectés */}
            {userRole === 'candidate' && score > 0 && (
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center gap-1 ${getScoreBadgeStyle(score)}`}>
                <Sparkles size={10} /> {score}% Match
              </span>
            )}
            <span className="bg-sky-50 text-sky-600 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {job.type || 'CDI'}
            </span>
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-sky-800 group-hover:text-sky-600 transition-colors">{job.title}</h3>
        <p className="text-sky-500 text-sm mb-4 font-medium">{job.company}</p>
      </div>
      
      <div className="flex items-center gap-4 text-sky-400 text-xs border-t pt-4 mt-4">
        <div className="flex items-center gap-1 font-semibold text-sky-500">
          <MapPin className="w-3 h-3 text-sky-500" />
          {job.city}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(job.createdAt)}
        </div>
      </div>
    </div>
  );
};

export function JobList() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null); // Stocke les compétences/ville du candidat

  const CAMEROON_CITIES = [
    "Toutes les villes", "Douala", "Yaoundé", "Garoua", "Maroua", 
    "Bafoussam", "Bamenda", "Ngaoundéré", "Nkongsamba", "Kribi", "Limbe"
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Déconnexion réussie");
      navigate('/');
    } catch (_error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  useEffect(() => {
    // 1. Récupérer les offres
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
        console.error("Erreur Firestore:", error);
        setLoading(false);
    });

    // 2. Vérifier le rôle de l'utilisateur + récupérer son profil
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          
          // Si c'est un candidat, on sauvegarde ses infos de matching (skills, location)
          if (userData.role === 'candidate') {
            setCandidateProfile({
              skills: userData.skills || [],
              location: userData.location || ''
            });
          }
        }
      } else {
        setUserRole(null);
        setCandidateProfile(null);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, []);

  // Filtrage et Tri Intelligent par Score de Matching
  const processedJobs = jobs
    .map(job => {
      // Calcul du score individuel pour chaque offre
      const score = userRole === 'candidate' ? calculateMatchingScore(candidateProfile, job) : 0;
      return { ...job, matchingScore: score };
    })
    .filter(job => {
      const title = job.title?.toLowerCase() || "";
      const company = job.company?.toLowerCase() || "";
      const city = job.city?.toLowerCase() || "";
      const matchesSearch = title.includes(searchQuery.toLowerCase()) || company.includes(searchQuery.toLowerCase());
      const matchesLocation = !locationQuery || locationQuery === "Toutes les villes" || city === locationQuery.toLowerCase();
      return matchesSearch && matchesLocation;
    })
    // Tri : Les meilleurs scores de matching passent au premier plan
    .sort((a, b) => b.matchingScore - a.matchingScore);

  return (
    <div className="min-h-screen bg-sky-50 font-sans pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-sky-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3 mb-4">
               <Briefcase className="w-6 h-6 text-cyan-400" />
               <span className="uppercase tracking-widest text-[10px] font-black text-sky-200">Plateforme CamerWork</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <LogOut size={18} />
            </button>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Trouvez votre prochain <span className="text-cyan-400">emploi</span>
          </h1>
          
          <div className="bg-white rounded-3xl shadow-2xl p-2 md:p-3 mt-8 border border-white/20">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-[1.5] relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
                <input
                  type="text"
                  placeholder="Poste, compétences ou entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-sky-50 border-none rounded-2xl text-sky-900 outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium"
                />
              </div>

              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 z-10" />
                <select
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-sky-50 border-none rounded-2xl text-sky-900 outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium appearance-none cursor-pointer relative"
                >
                  {CAMEROON_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <h2 className="text-2xl font-black text-sky-800 mb-8 flex items-center gap-3">
          Offres disponibles 
          <span className="bg-cyan-600 text-white text-xs px-3 py-1 rounded-full">{processedJobs.length}</span>
        </h2>
        
        {loading ? (
          <div className="flex flex-col items-center py-20">
             <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-sky-400 font-bold">Chargement...</p>
          </div>
        ) : processedJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                score={job.matchingScore}
                userRole={userRole}
                onClick={() => navigate(`/offres/${job.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-dashed border-sky-300">
            <p className="text-sky-500 font-bold">Aucune offre trouvée.</p>
            <button onClick={() => {setSearchQuery(''); setLocationQuery('');}} className="mt-4 text-cyan-600 font-black hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Navigation Basse (Fixée) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-sky-200 px-6 py-4 z-50 flex justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => navigate('/offres')} className="flex flex-col items-center gap-1 text-cyan-600 transition-transform active:scale-90">
          <Briefcase size={24} />
          <span className="text-[10px] font-black uppercase">Offres</span>
        </button>

        {userRole === 'recruiter' ? (
          <>
            <button onClick={() => navigate('/DashboardRecruiter')} className="flex flex-col items-center gap-1 text-sky-400 hover:text-cyan-600 transition-all active:scale-90">
              <Building2 size={24} />
              <span className="text-[10px] font-black uppercase">Espace</span>
            </button>
            <button onClick={() => navigate('/RecruiterPost')} className="flex flex-col items-center gap-1 text-sky-400 hover:text-cyan-600 transition-all active:scale-90">
              <PlusCircle size={24} />
              <span className="text-[10px] font-black uppercase">Publier</span>
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/profil')} className="flex flex-col items-center gap-1 text-sky-400 hover:text-cyan-600 transition-all active:scale-90">
            <User size={24} />
            <span className="text-[10px] font-black uppercase">Mon Profil</span>
          </button>
        )}
      </div>
    </div>
  );
}
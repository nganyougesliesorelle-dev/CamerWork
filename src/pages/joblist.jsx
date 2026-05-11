import React, { useState, useEffect } from 'react';
import { Search, MapPin, Briefcase, Building2, Clock, User, ChevronDown, PlusCircle, LogOut } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig'; 
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Pour la déconnexion
import { toast } from 'sonner';

// Composant Carte d'Offre (Inchangé, juste formaté)
const JobCard = ({ job, onClick }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return "À l'instant";
    try {
        const date = timestamp.toDate();
        const diff = new Date() - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return "Aujourd'hui";
        return `Il y a ${days} j`;
    } catch (e) {
        return "Récemment";
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-600 transition-colors">
          <Building2 className="w-6 h-6 text-blue-600 group-hover:text-white" />
        </div>
        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
          {job.type || 'CDI'}
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{job.title}</h3>
      <p className="text-slate-500 text-sm mb-4 font-medium">{job.company}</p>
      
      <div className="flex items-center gap-4 text-slate-400 text-xs border-t pt-4">
        <div className="flex items-center gap-1 font-semibold text-slate-500">
          <MapPin className="w-3 h-3 text-blue-500" />
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

  const CAMEROON_CITIES = [
    "Toutes les villes", "Douala", "Yaoundé", "Garoua", "Maroua", 
    "Bafoussam", "Bamenda", "Ngaoundéré", "Nkongsamba", "Kribi", "Limbe"
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Déconnexion réussie");
      navigate('/');
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  useEffect(() => {
    // 1. Récupérer les offres avec nettoyage
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

    // 2. Vérifier le rôle de l'utilisateur
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUserRole(null);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAuth();
    };
  }, []);

  const filteredJobs = jobs.filter(job => {
    const title = job.title?.toLowerCase() || "";
    const company = job.company?.toLowerCase() || "";
    const city = job.city?.toLowerCase() || "";
    const matchesSearch = title.includes(searchQuery.toLowerCase()) || company.includes(searchQuery.toLowerCase());
    const matchesLocation = !locationQuery || locationQuery === "Toutes les villes" || city === locationQuery.toLowerCase();
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* Header avec bouton Logout en haut à droite */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3 mb-4">
               <Briefcase className="w-6 h-6 text-yellow-400" />
               <span className="uppercase tracking-widest text-[10px] font-black text-blue-200">Plateforme CamerWork</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <LogOut size={18} />
            </button>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            Trouvez votre prochain <span className="text-yellow-400">emploi</span>
          </h1>
          
          <div className="bg-white rounded-3xl shadow-2xl p-2 md:p-3 mt-8 border border-white/20">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-[1.5] relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Poste, compétences ou entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <select
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none cursor-pointer relative"
                >
                  {CAMEROON_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
          Offres disponibles 
          <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">{filteredJobs.length}</span>
        </h2>
        
        {loading ? (
          <div className="flex flex-col items-center py-20">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-slate-400 font-bold">Chargement...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onClick={() => navigate(`/offres/${job.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl text-center shadow-sm border border-dashed border-slate-300">
            <p className="text-slate-500 font-bold">Aucune offre trouvée.</p>
            <button onClick={() => {setSearchQuery(''); setLocationQuery('');}} className="mt-4 text-blue-600 font-black hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Navigation Basse (Fixée) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-6 py-4 z-50 flex justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => navigate('/offres')} className="flex flex-col items-center gap-1 text-blue-600 transition-transform active:scale-90">
          <Briefcase size={24} />
          <span className="text-[10px] font-black uppercase">Offres</span>
        </button>

        {userRole === 'recruiter' ? (
          <>
            <button onClick={() => navigate('/dashboard-recruteur')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-all active:scale-90">
              <Building2 size={24} />
              <span className="text-[10px] font-black uppercase">Espace</span>
            </button>
            <button onClick={() => navigate('/RecruiterPost')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-all active:scale-90">
              <PlusCircle size={24} />
              <span className="text-[10px] font-black uppercase">Publier</span>
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/profil')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition-all active:scale-90">
            <User size={24} />
            <span className="text-[10px] font-black uppercase">Mon Profil</span>
          </button>
        )}
      </div>
    </div>
  );
}
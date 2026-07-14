/**
 * FavoritesPage.jsx — Liste des offres sauvegardées (favoris, style Indeed).
 *
 * Affiche toutes les offres mises en favoris par l'utilisateur,
 * avec possibilité de les retirer ou de postuler directement.
 *
 * Usage : route /favoris dans App.jsx
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Heart, MapPin, Calendar, Building, Trash2, Briefcase, ArrowRight, Bookmark } from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';
import { auth } from '../firebase/firebaseConfig';
import { getFavorites, removeFavorite } from '../firebase/favoritesService';

export function FavoritesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadFavorites();
  }, [userId]);

  const loadFavorites = async () => {
    setLoading(true);
    const favs = await getFavorites(userId);
    setFavorites(favs);
    setLoading(false);
  };

  const handleRemove = async (fav) => {
    setRemoving(fav.id);
    await removeFavorite(userId, fav.jobId);
    setFavorites(prev => prev.filter(f => f.id !== fav.id));
    toast.success('Offre retirée des favoris.');
    setRemoving(null);
  };

  const getTypeColor = (type) => {
    const t = type?.toLowerCase();
    if (t === 'cdi') return 'bg-teal-100 text-teal-700 border-teal-200';
    if (t === 'cdd') return 'bg-sky-100 text-sky-700 border-sky-200';
    if (t === 'stage') return 'bg-sky-100 text-sky-600 border-sky-200';
    return 'bg-sky-100 text-sky-700 border-sky-200';
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-sky-50 dark:bg-gray-900 pb-24">
        {/* Header */}
        <div className="bg-sky-900 pt-12 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white text-xs font-bold mb-4 flex items-center gap-1">
              ← Retour
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center">
                <Heart size={28} className="text-red-400 fill-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white uppercase">
                  Mes favoris
                </h1>
                <p className="text-sm text-sky-300 font-medium">
                  {favorites.length} offre{favorites.length !== 1 ? 's' : ''} sauvegardée{favorites.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-10">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-sky-100 dark:border-gray-700 p-12 text-center space-y-4">
              <div className="w-20 h-20 bg-sky-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                <Bookmark size={36} className="text-sky-300" />
              </div>
              <h2 className="text-lg font-black text-sky-800 dark:text-gray-100">Aucun favori</h2>
              <p className="text-sm text-sky-500 dark:text-gray-400 max-w-md mx-auto">
                Parcourez les offres d'emploi et cliquez sur le cœur ❤️ pour les sauvegarder ici.
              </p>
              <button
                onClick={() => navigate('/offres')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl text-sm font-black hover:bg-cyan-600 transition-all"
              >
                Voir les offres <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map(fav => (
                <div
                  key={fav.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-sky-100 dark:border-gray-700 p-5 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/offres/${fav.jobId}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getTypeColor(fav.type)}`}>
                          {fav.type}
                        </span>
                        {fav.salary && (
                          <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                            {fav.salary}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-sky-800 dark:text-gray-100 group-hover:text-cyan-600 transition-colors">
                        {fav.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-sky-500 dark:text-gray-400">
                          <Building size={12} /> {fav.company}
                        </span>
                        {fav.city && (
                          <span className="flex items-center gap-1 text-xs text-sky-400">
                            <MapPin size={12} /> {fav.city}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemove(fav)}
                      disabled={removing === fav.id}
                      className="p-2 text-sky-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                      title="Retirer des favoris"
                    >
                      <Trash2 size={16} className={removing === fav.id ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}

export default FavoritesPage;
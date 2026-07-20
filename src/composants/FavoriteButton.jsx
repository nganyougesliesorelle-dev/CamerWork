/**
 * FavoriteButton.jsx — Bouton cœur pour sauvegarder/retirer des favoris (style Indeed).
 *
 * Usage :
 *   <FavoriteButton job={job} userId={currentUser.uid} role={userRole} />
 *
 * Fonctionnalités :
 *   - Animation de pulsation au toggle
 *   - Couleur rouge quand favori, gris quand non
 *   - Tooltip contextuel
 *   - Compteur de favoris (optionnel)
 *   - Masqué automatiquement pour les recruteurs
 */

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorite, isFavorite } from '../firebase/favoritesService';

export function FavoriteButton({ job, userId, role, size = 'md', showTooltip = true, onToggle }) {
  // Les recruteurs n'ont pas besoin des favoris — on masque le bouton
  if (role === 'recruiter' || role === 'recruteur') return null;

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Vérifier l'état initial du favori
  useEffect(() => {
    if (!userId || !job?.id) return;
    isFavorite(userId, job.id).then(setSaved);
  }, [userId, job?.id]);

  const handleToggle = async (e) => {
    e.stopPropagation(); // Ne pas propager au clic de la carte
    if (loading || !userId) return;
    if (!userId) {
      toast.error('Veuillez vous connecter pour sauvegarder des offres.');
      return;
    }

    setLoading(true);
    setAnimating(true);

    try {
      const result = await toggleFavorite(userId, job);
      console.debug('[FavoriteButton] toggle result:', result);
      if (result.error) {
        toast.error(`Erreur lors de l'enregistrement: ${result.error}`);
      } else {
        setSaved(result.saved);
        if (result.saved) {
          toast.success('Offre sauvegardée dans vos favoris !', { icon: '❤️' });
        }
        onToggle?.(result.saved);
      }
    } catch (err) {
      console.error('[FavoriteButton] unexpected error:', err);
      toast.error('Erreur inattendue lors de l’action.');
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 400);
    }
  };

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = { sm: 16, md: 20, lg: 24 };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={saved ? 'Retirer des favoris' : 'Sauvegarder cette offre'}
      className={`${sizes[size]} rounded-xl transition-all active:scale-90 group relative ${
        saved
          ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
          : 'text-sky-300 hover:text-red-400 hover:bg-red-50'
      } ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-all ${animating ? 'scale-125' : ''} ${
          saved ? 'fill-red-500' : 'fill-none group-hover:fill-red-200'
        }`}
      />

      {/* Tooltip */}
      {showTooltip && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-sky-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10">
          {saved ? 'Retirer' : 'Sauvegarder'}
        </span>
      )}
    </button>
  );
}

export default FavoriteButton;
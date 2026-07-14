/**
 * ShareButton.jsx — Bouton de partage réutilisable.
 *
 * Copie l'URL courante dans le presse-papier et affiche une notification toast.
 *
 * Usage :
 *   <ShareButton size="sm" />
 *   <ShareButton size="md" variant="icon-only" />
 */

import { useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export function ShareButton({ size = 'sm', variant = 'default', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Lien copié dans le presse-papier !', {
        description: 'Partagez cette offre avec vos contacts.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = { sm: 14, md: 18, lg: 22 };

  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleShare}
        title="Partager cette offre"
        className={`${sizes[size]} rounded-xl transition-all active:scale-90 text-sky-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-gray-700 ${className}`}
      >
        {copied ? <Check size={iconSizes[size]} className="text-teal-500" /> : <Share2 size={iconSizes[size]} />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
        copied
          ? 'bg-teal-50 text-teal-600 border border-teal-200'
          : 'bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
      } ${className}`}
    >
      {copied ? <Check size={16} /> : <Link2 size={16} />}
      {copied ? 'Copié !' : 'Partager'}
    </button>
  );
}

export default ShareButton;

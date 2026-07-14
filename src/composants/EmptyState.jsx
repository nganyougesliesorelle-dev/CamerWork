import { PackageOpen } from 'lucide-react';

/**
 * EmptyState — Illustration + message pour les listes vides.
 *
 * Props :
 *   - icon        : icône Lucide (défaut : PackageOpen)
 *   - title       : titre principal
 *   - description : texte explicatif
 *   - action      : ReactNode (bouton, lien CTA)
 *   - darkMode    : active le thème sombre
 *
 * Usage :
 *   <EmptyState
 *     icon={Briefcase}
 *     title="Aucune offre sauvegardée"
 *     description="Ajoutez des offres en favoris pour les retrouver ici."
 *     action={<button onClick={...}>Explorer les offres</button>}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  darkMode = false,
}) {
  const IconComponent = Icon || PackageOpen;

  return (
    <div
      className={`flex flex-col items-center justify-center py-20 px-4 text-center ${
        darkMode ? 'text-slate-400' : 'text-sky-400'
      }`}
    >
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
          darkMode ? 'bg-slate-800' : 'bg-sky-50'
        }`}
      >
        <IconComponent
          className={`w-10 h-10 ${
            darkMode ? 'text-slate-500' : 'text-sky-300'
          }`}
        />
      </div>

      {title && (
        <h3
          className={`text-lg font-black mb-2 ${
            darkMode ? 'text-slate-300' : 'text-sky-700'
          }`}
        >
          {title}
        </h3>
      )}

      {description && (
        <p className="text-sm max-w-md mb-6 leading-relaxed">{description}</p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;

import { X } from 'lucide-react';

/**
 * FilterChip — Pastille de filtre actif avec bouton de suppression.
 *
 * Usage :
 *   <FilterChip label="CDI" onRemove={() => removeFilter('type', 'CDI')} />
 *   <FilterChip label="Douala" onRemove={() => removeFilter('city')} />
 *
 * Props :
 *   - label     : texte affiché dans la pastille
 *   - onRemove  : callback appelé au clic sur le X
 *   - icon      : icône Lucide optionnelle à gauche du label
 *   - darkMode  : active le thème sombre
 */
export function FilterChip({ label, onRemove, icon: Icon, darkMode = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all group ${
        darkMode
          ? 'bg-sky-900/40 text-sky-300 border-sky-700 hover:bg-red-900/40 hover:text-red-300 hover:border-red-700'
          : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
        aria-label={`Retirer le filtre ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default FilterChip;

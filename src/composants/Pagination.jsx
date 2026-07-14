import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination — Barre de navigation paginée réutilisable.
 *
 * Usage :
 *   <Pagination
 *     currentPage={1}
 *     totalPages={5}
 *     onPageChange={(page) => setPage(page)}
 *     darkMode={false}
 *   />
 *
 * Props :
 *   - currentPage : page active (1-based)
 *   - totalPages  : nombre total de pages
 *   - onPageChange: callback(page) au clic sur un numéro ou flèche
 *   - darkMode    : active le thème sombre
 *
 * Comportement :
 *   - Affiche jusqu'à 7 boutons : première page, ..., milieu, ..., dernière page
 *   - Flèches gauche/droite désactivées aux extrémités
 *   - Les ellipses "..." sont non cliquables
 */

function buildPageNumbers(current, total) {
  if (total <= 7) {
    // Moins de 7 pages : toutes affichées
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];

  // Toujours la page 1
  pages.push(1);

  if (current > 3) {
    pages.push('...');
  }

  // Pages autour de la page courante
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  // Toujours la dernière page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

export function Pagination({ currentPage, totalPages, onPageChange, darkMode = false }) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  const baseBtn =
    'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all';

  const activeClass = darkMode
    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
    : 'bg-cyan-500 text-white shadow-lg shadow-cyan-200';

  const inactiveClass = darkMode
    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    : 'text-sky-600 hover:bg-sky-100 hover:text-sky-800';

  const disabledClass = darkMode
    ? 'text-slate-600 cursor-not-allowed'
    : 'text-sky-300 cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      {/* Flèche gauche */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${baseBtn} ${currentPage <= 1 ? disabledClass : inactiveClass}`}
        aria-label="Page précédente"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Numéros de page */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className={`w-10 h-10 flex items-center justify-center text-sm font-bold ${
              darkMode ? 'text-slate-500' : 'text-sky-400'
            }`}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`${baseBtn} ${page === currentPage ? activeClass : inactiveClass}`}
          >
            {page}
          </button>
        )
      )}

      {/* Flèche droite */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${baseBtn} ${currentPage >= totalPages ? disabledClass : inactiveClass}`}
        aria-label="Page suivante"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default Pagination;

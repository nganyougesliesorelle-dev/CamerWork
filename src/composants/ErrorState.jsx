import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorState — Affichage d'erreur avec bouton de retry.
 *
 * Props :
 *   - title    : titre de l'erreur
 *   - message  : description
 *   - onRetry  : callback pour réessayer
 *   - darkMode : active le thème sombre
 *
 * Usage :
 *   <ErrorState
 *     title="Impossible de charger les offres"
 *     message="Vérifiez votre connexion internet."
 *     onRetry={() => refetch()}
 *   />
 */
export function ErrorState({
  title = 'Erreur de chargement',
  message = 'Impossible de charger les données. Vérifiez votre connexion et réessayez.',
  onRetry,
  darkMode = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-20 px-4 text-center ${
        darkMode ? 'text-slate-400' : 'text-sky-400'
      }`}
    >
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
          darkMode ? 'bg-red-900/30' : 'bg-red-50'
        }`}
      >
        <AlertTriangle
          className={`w-10 h-10 ${
            darkMode ? 'text-red-400' : 'text-error-500'
          }`}
        />
      </div>

      <h3
        className={`text-lg font-black mb-2 ${
          darkMode ? 'text-slate-300' : 'text-sky-700'
        }`}
      >
        {title}
      </h3>

      <p className="text-sm max-w-md mb-6 leading-relaxed">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all active:scale-95"
        >
          <RefreshCw size={16} /> Réessayer
        </button>
      )}
    </div>
  );
}

export default ErrorState;

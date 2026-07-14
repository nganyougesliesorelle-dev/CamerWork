import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — Capture les erreurs React non gérées dans l'arbre enfant.
 *
 * Affiche un fallback propre au lieu d'un écran blanc.
 *
 * Props :
 *   - fallback   : ReactNode optionnel pour remplacer le fallback par défaut
 *   - showError  : bool, affiche les détails techniques de l'erreur (dev uniquement)
 *
 * Usage :
 *   <ErrorBoundary>
 *     <PageQuiPeutPlanter />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CamerWork ErrorBoundary]', error, errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-floating border border-sky-100 dark:border-gray-700 p-8 max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 bg-error-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-error-500" />
            </div>

            <div>
              <h2 className="text-xl font-black text-sky-900 dark:text-gray-100 mb-1">
                Oups, quelque chose a cassé
              </h2>
              <p className="text-sky-500 dark:text-gray-400 text-sm leading-relaxed">
                Une erreur inattendue est survenue dans cette partie de l'application.
                Le reste du site continue de fonctionner.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 border border-sky-200 dark:border-gray-600 text-sky-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-sky-50 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                Réessayer
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
              >
                <RefreshCw size={15} /> Rafraîchir
              </button>
            </div>

            {this.props.showError && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-sky-400 cursor-pointer hover:text-sky-500 transition-colors">
                  Détails techniques
                </summary>
                <pre className="mt-2 text-xs text-error-500 bg-error-50 dark:bg-red-900/20 p-3 rounded-lg overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack?.split('\n').slice(0, 4).join('\n')}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

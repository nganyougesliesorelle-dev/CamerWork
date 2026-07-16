/**
 * PhishingBanner.jsx — Bannière de sensibilisation anti-phishing.
 *
 * Affiche un bandeau d'avertissement en haut de l'application
 * pour sensibiliser les utilisateurs aux risques de phishing.
 * Le bandeau peut être fermé (stocké en sessionStorage).
 *
 * Usage :
 *   <PhishingBanner />
 *
 * Intègre dans App.jsx avant le Router.
 */

import { useState, useEffect } from 'react';
import { ShieldAlert, X, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'camerwork_phishing_banner_dismissed';
const DISMISS_DURATION_HOURS = 24;

export function PhishingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    const dismissedAt = parseInt(dismissed, 10);
    const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
    if (hoursSince >= DISMISS_DURATION_HOURS) {
      sessionStorage.removeItem(STORAGE_KEY);
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <ShieldAlert size={18} className="shrink-0 animate-pulse" />
          <p className="text-xs sm:text-sm font-bold leading-snug">
            <span className="uppercase tracking-wider">⚠ Sécurité</span>
            {' — '}
            CamerWork ne vous demandera <strong>jamais</strong> votre mot de passe par email ou téléphone.
            Vérifiez toujours l'URL : <code className="bg-white/20 px-1.5 py-0.5 rounded text-[11px] font-mono">camerwork-1e3d0.web.app</code>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://camerwork-1e3d0.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-xs font-black uppercase bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
          >
            <ExternalLink size={11} />
          </a>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
            aria-label="Fermer la bannière"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PhishingBanner;

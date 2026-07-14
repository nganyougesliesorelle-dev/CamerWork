/**
 * KycBadge — Badge de vérification KYC pour les recruteurs.
 * 
 * Affiche un badge coloré selon le statut de vérification :
 *   - verified   : vert "Entreprise vérifiée ✓"
 *   - pending    : orange "Vérification en cours"
 *   - unverified : gris "Non vérifié"
 * 
 * Usage :
 *   <KycBadge status={recruiter.kycStatus} />
 */
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

const KYC_CONFIG = {
  verified: {
    icon: ShieldCheck,
    label: 'Entreprise vérifiée',
    classes: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  pending: {
    icon: ShieldAlert,
    label: 'Vérification en cours',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
  },
  unverified: {
    icon: Shield,
    label: 'Non vérifié',
    classes: 'bg-sky-50 text-sky-500 border-sky-200',
    dot: 'bg-sky-300',
  },
};

export function KycBadge({ status = 'unverified', size = 'sm' }) {
  const config = KYC_CONFIG[status] || KYC_CONFIG.unverified;
  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${config.classes}`}>
        <Icon size={11} />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${config.classes}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <Icon size={14} />
      {config.label}
    </div>
  );
}

/**
 * Vérifie si un recruteur peut publier des offres.
 * Bloque les recruteurs non vérifiés après un délai de grâce.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function canRecruiterPost(kycStatus, createdAt) {
  if (kycStatus === 'verified') return true;
  if (kycStatus === 'pending') return true; // tolérance pendant la vérification
  // Compte non vérifié : autorisé pendant 7 jours après création, puis bloqué
  if (!createdAt) return false;
  const ageInDays = (Date.now() - createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays <= 7;
}

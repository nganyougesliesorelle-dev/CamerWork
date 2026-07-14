/**
 * VerificationBadge.jsx — Badges de vérification multi-niveaux (style LinkedIn).
 *
 * Affiche les badges de vérification obtenus par l'utilisateur :
 *   - 🟢 Téléphone vérifié
 *   - 🟢 Identité vérifiée (pièce d'identité + selfie)
 *   - 🟢 Email professionnel vérifié
 *   - 🟢 Diplôme/Certificat vérifié
 *   - 🏆 Profil entièrement vérifié
 *
 * Usage :
 *   <VerificationBadge verificationSteps={user.verificationSteps} phoneVerified={user.phoneVerified} />
 *   <VerificationBadge size="sm" />  // Version compacte
 */

import {
  ShieldCheck, Phone, IdCard, Mail, Award, BadgeCheck,
} from 'lucide-react';

const BADGE_CONFIG = {
  phone: {
    icon: Phone,
    label: 'Téléphone vérifié',
    color: 'teal',
  },
  id_card: {
    icon: IdCard,
    label: 'Identité vérifiée',
    color: 'cyan',
  },
  selfie: {
    icon: ShieldCheck,
    label: 'Photo vérifiée',
    color: 'blue',
  },
  work_email: {
    icon: Mail,
    label: 'Email pro vérifié',
    color: 'indigo',
  },
  certificate: {
    icon: Award,
    label: 'Diplôme vérifié',
    color: 'violet',
  },
  full: {
    icon: BadgeCheck,
    label: 'Profil vérifié',
    color: 'emerald',
  },
};

const COLOR_MAP = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function VerificationBadge({ verificationSteps = {}, phoneVerified = false, size = 'sm' }) {
  // Collecter les badges actifs
  const activeBadges = [];

  // Téléphone
  if (phoneVerified) {
    activeBadges.push('phone');
  }

  // Étapes de vérification
  const steps = verificationSteps || {};
  if (steps.id_card?.status === 'verified') activeBadges.push('id_card');
  if (steps.selfie?.status === 'verified') activeBadges.push('selfie');
  if (steps.work_email?.status === 'verified') activeBadges.push('work_email');
  if (steps.certificate?.status === 'verified') activeBadges.push('certificate');

  // Badge complet si toutes les étapes sont vérifiées + téléphone
  const fullVerification = activeBadges.length >= 4 && phoneVerified;

  if (activeBadges.length === 0) return null;

  if (size === 'sm') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {fullVerification && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${COLOR_MAP.emerald}`}>
            <BadgeCheck size={11} />
            Profil vérifié
          </span>
        )}
        {!fullVerification && activeBadges.map(badgeId => {
          const config = BADGE_CONFIG[badgeId];
          const Icon = config.icon;
          return (
            <span
              key={badgeId}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${COLOR_MAP[config.color]}`}
              title={config.label}
            >
              <Icon size={10} />
              {config.label.split(' ')[0]}
            </span>
          );
        })}
      </div>
    );
  }

  // Grande version
  return (
    <div className="space-y-2">
      {fullVerification && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${COLOR_MAP.emerald}`}>
          <BadgeCheck size={18} />
          <div>
            <p className="text-xs font-bold">Profil entièrement vérifié</p>
            <p className="text-[10px] opacity-70">Toutes les vérifications complétées</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {activeBadges.map(badgeId => {
          const config = BADGE_CONFIG[badgeId];
          const Icon = config.icon;
          return (
            <span
              key={badgeId}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${COLOR_MAP[config.color]}`}
            >
              <Icon size={13} />
              {config.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default VerificationBadge;
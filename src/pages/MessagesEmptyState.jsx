import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  ChevronDown,
  Inbox,
  Archive,
  AlertTriangle,
  Check,
  Users,
  Briefcase,
} from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';

/* ──────────── Dropdown personnalisé ──────────── */
function FilterDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = [
    { value: 'inbox', label: 'Boîte de réception', icon: Inbox },
    { value: 'archives', label: 'Archives', icon: Archive },
    { value: 'spam', label: 'Spam', icon: AlertTriangle },
  ];

  const current = options.find((o) => o.value === selected) || options[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all
          ${open ? 'bg-blue-500 text-white shadow-lg shadow-blue-200/50' : 'bg-white text-sky-700 border border-sky-200 hover:border-sky-300 hover:bg-sky-50'}
        `}
      >
        <current.icon size={16} />
        {current.label}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 w-56 bg-white rounded-2xl border border-sky-100 shadow-xl shadow-sky-100/40 z-30 overflow-hidden animate-in">
          {options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all
                  ${isSelected ? 'bg-sky-50 text-sky-800 font-semibold' : 'text-sky-600 hover:bg-sky-50/50'}
                `}
              >
                <opt.icon size={16} className={isSelected ? 'text-teal-500' : 'text-sky-400'} />
                <span className="flex-1 text-left">{opt.label}</span>
                {isSelected && <Check size={14} className="text-teal-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────── SVG Illustration ──────────── */
function ChatBubblesIllustration() {
  return (
    <svg
      viewBox="0 0 280 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-64 h-56 drop-shadow-lg"
      aria-hidden="true"
    >
      {/* Fond décoratif */}
      <circle cx="140" cy="120" r="110" className="fill-sky-100/60" />

      {/* Bulle 1 — Recruteur (gauche) */}
      <g>
        <rect x="32" y="60" width="100" height="52" rx="22" className="fill-white" strokeWidth="1.5" stroke="#BAE6FD" />
        <path d="M32 90L14 102V82L32 90Z" className="fill-white" strokeWidth="1" stroke="#BAE6FD" />
        <rect x="44" y="74" width="36" height="4" rx="2" className="fill-sky-200" />
        <rect x="44" y="82" width="52" height="4" rx="2" className="fill-sky-200" />
        <rect x="44" y="90" width="28" height="4" rx="2" className="fill-sky-200" />
      </g>

      {/* Bulle 2 — Candidat (droite, plus bas) */}
      <g>
        <rect x="148" y="108" width="110" height="52" rx="22" className="fill-teal-50" strokeWidth="1.5" stroke="#A7F3D0" />
        <path d="M258 138L276 126V150L258 138Z" className="fill-teal-50" strokeWidth="1" stroke="#A7F3D0" />
        <rect x="160" y="122" width="26" height="4" rx="2" className="fill-teal-200" />
        <rect x="160" y="130" width="58" height="4" rx="2" className="fill-teal-200" />
        <rect x="160" y="138" width="34" height="4" rx="2" className="fill-teal-200" />
      </g>

      {/* Avatar recruteur */}
      <circle cx="68" cy="45" r="16" className="fill-sky-200" />
      <circle cx="68" cy="41" r="5" className="fill-sky-300" />
      <ellipse cx="68" cy="52" rx="6" ry="4" className="fill-sky-300" />

      {/* Avatar candidat */}
      <circle cx="222" cy="93" r="16" className="fill-teal-200" />
      <circle cx="222" cy="89" r="5" className="fill-teal-300" />
      <ellipse cx="222" cy="100" rx="6" ry="4" className="fill-teal-300" />

      {/* Icônes professionnelles */}
      <circle cx="50" cy="170" r="20" className="fill-sky-100" />
      <Briefcase size={18} className="fill-none stroke-sky-400" x="41" y="161" />

      <circle cx="230" cy="170" r="20" className="fill-teal-100" />
      <Users size={18} className="fill-none stroke-teal-400" x="221" y="161" />

      {/* Points de connexion */}
      <circle cx="140" cy="148" r="6" className="fill-teal-400" />
      <circle cx="134" cy="142" r="2" className="fill-teal-300" />
      <circle cx="146" cy="142" r="2" className="fill-teal-300" />
      <circle cx="140" cy="154" r="2" className="fill-teal-300" />
    </svg>
  );
}

/* ──────────── MessagesEmptyState ──────────── */
export function MessagesEmptyState() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('inbox');

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 font-sans antialiased flex flex-col">
        {/* ── HEADER ── */}
        <div className="bg-white/90 backdrop-blur-md border-b border-sky-100 px-4 py-3 sticky top-0 z-20 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Titre */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center">
                <MessageCircle size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-sky-800">
                {t('chat.title') || 'Messages'}
              </h1>
            </div>

            {/* Badge En ligne + Dropdown */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {t('chat.online') || 'En ligne'}
              </span>

              <FilterDropdown selected={filter} onChange={setFilter} />
            </div>
          </div>
        </div>

        {/* ── BODY (centré) ── */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center text-center max-w-sm">
            {/* Illustration SVG */}
            <div className="mb-6">
              <ChatBubblesIllustration />
            </div>

            {/* Titre */}
            <h2 className="text-xl font-extrabold text-sky-800 mb-3">
              Bienvenue sur CamerWork Messages
            </h2>

            {/* Texte d'invitation */}
            <p className="text-sm text-sky-500 leading-relaxed">
              Votre espace de discussion professionnelle est prêt. Dès qu'un recruteur
              ou un candidat vous contacte, la conversation apparaîtra ici instantanément.
              En attendant, découvrez les offres disponibles ou complétez votre profil
              pour maximiser vos chances.
            </p>

            {/* État du filtre */}
            <div className="mt-6 flex items-center gap-2 text-xs text-sky-400 bg-sky-50 px-4 py-2 rounded-full">
              <Inbox size={13} />
              {filter === 'inbox' && 'Boîte de réception active'}
              {filter === 'archives' && 'Archives sélectionnées'}
              {filter === 'spam' && 'Spam sélectionné'}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}

export default MessagesEmptyState;

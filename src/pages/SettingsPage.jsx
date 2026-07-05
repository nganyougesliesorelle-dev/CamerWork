import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Smartphone,
  Eye,
  ChevronRight,
  ChevronDown,
  Check,
  ToggleLeft,
  ToggleRight,
  Download,
  Save,
  LogOut,
  Monitor,
  MapPin,
  BadgeCheck,
} from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';
import { toast } from 'sonner';

/* ──────────── Sous-panneau : Paramètres du compte ──────────── */
function AccountPanel({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSave = () => {
    toast.success('Informations du compte mises à jour avec succès.');
    onClose?.();
  };

  return (
    <div className="bg-sky-50/60 rounded-2xl p-5 border border-sky-100 space-y-4 animate-in">
      <h3 className="text-sm font-semibold text-sky-800 flex items-center gap-2">
        <BadgeCheck size={16} className="text-teal-500" />
        Modifier le compte
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-sky-600 block mb-1">Nom complet</label>
          <input
            type="text"
            placeholder="Jean Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-sm text-sky-900 placeholder:text-sky-300
                       focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-sky-600 block mb-1">Email</label>
          <input
            type="email"
            placeholder="jean@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-sm text-sky-900 placeholder:text-sky-300
                       focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-sky-600 block mb-1">Téléphone</label>
          <input
            type="tel"
            placeholder="+237 6 00 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-sm text-sky-900 placeholder:text-sky-300
                       focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-sm
                   rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md shadow-teal-200/50 active:scale-[0.98]"
      >
        <Save size={16} />
        Sauvegarder
      </button>
    </div>
  );
}

/* ──────────── Sous-panneau : Gestion des appareils ──────────── */
function DevicePanel() {
  return (
    <div className="bg-sky-50/60 rounded-2xl p-5 border border-sky-100 space-y-4 animate-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
          <Monitor size={20} className="text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sky-800">Windows • Chrome</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin size={11} className="text-sky-400" />
            <p className="text-xs text-sky-500">Douala, Cameroun — Session active</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-600 rounded-full">Actif</span>
      </div>

      <button
        onClick={() => toast.success('Déconnecté de tous les autres appareils.')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 font-semibold text-sm
                   rounded-xl hover:bg-red-100 transition-all active:scale-[0.98]"
      >
        <LogOut size={15} />
        Déconnecter tous les autres appareils
      </button>
    </div>
  );
}

/* ──────────── Sous-panneau : Confidentialité ──────────── */
function PrivacyPanel() {
  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      account: { name: 'Jean Dupont', email: 'jean@exemple.com' },
      applications: [],
      messages: [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'camerwork-donnees.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export de vos données initié.');
  };

  return (
    <div className="bg-sky-50/60 rounded-2xl p-5 border border-sky-100 space-y-4 animate-in">
      <p className="text-sm text-sky-700 leading-relaxed">
        Conformément au <span className="font-semibold">RGPD</span> et aux lois camerounaises sur la protection des
        données, vous disposez d'un droit d'accès, de rectification et de suppression de vos informations personnelles.
      </p>

      <button
        onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-sky-200 text-sky-700 font-semibold text-sm
                   rounded-xl hover:bg-sky-50 hover:border-sky-300 transition-all active:scale-[0.98]"
      >
        <Download size={16} />
        Exporter mes données (JSON)
      </button>
    </div>
  );
}

/* ──────────── Section d'une ligne ──────────── */
function SettingRow({ icon: Icon, title, description, badge, toggle, checked, onToggle, expanded, onExpand, children }) {
  return (
    <div>
      <button
        onClick={() => {
          if (toggle !== undefined) onToggle?.();
          else if (children) onExpand?.();
        }}
        className="w-full flex items-center gap-4 px-4 py-4 bg-white hover:bg-sky-50/60 rounded-2xl border border-sky-100
                   transition-all group active:scale-[0.99]"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={20} className="text-teal-600" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-sky-800">{title}</p>
          <p className="text-xs text-sky-500 mt-0.5">{description}</p>
        </div>

        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full shrink-0">
            {badge}
          </span>
        )}

        {toggle !== undefined ? (
          <div className="shrink-0 transition-transform group-hover:scale-110">
            {checked ? (
              <ToggleRight size={36} className="text-teal-500" />
            ) : (
              <ToggleLeft size={36} className="text-sky-300" />
            )}
          </div>
        ) : children ? (
          <div className="shrink-0 text-sky-400 transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <ChevronRight size={18} />
          </div>
        ) : (
          <ChevronRight size={18} className="text-sky-300 shrink-0" />
        )}
      </button>

      {/* Sous-panneau expansible */}
      {expanded && children && (
        <div className="mt-3 ml-14 mr-4">
          {children}
        </div>
      )}
    </div>
  );
}

/* ──────────── SettingsPage ──────────── */
export function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [expandedSections, setExpandedSections] = useState({
    account: false,
    security: false,
    communication: false,
    devices: false,
    privacy: false,
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [comPrefs, setComPrefs] = useState({
    jobAlerts: true,
    messageNotifications: false,
    weeklyDigest: true,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleComPref = (key) => {
    setComPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 font-sans antialiased">
        {/* ── HEADER ── */}
        <div className="bg-white/90 backdrop-blur-md border-b border-sky-100 px-4 py-3 sticky top-0 z-20 shadow-sm">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-sky-800">Paramètres</h1>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* 1. Paramètres du compte */}
          <SettingRow
            icon={User}
            title="Paramètres du compte"
            description="Nom, email, téléphone"
            expanded={expandedSections.account}
            onExpand={() => toggleSection('account')}
          >
            <AccountPanel onClose={() => setExpandedSections((prev) => ({ ...prev, account: false }))} />
          </SettingRow>

          {/* 2. Paramètres de sécurité */}
          <SettingRow
            icon={Shield}
            title="Paramètres de sécurité"
            description="Authentification à deux facteurs"
            badge="Nouveau"
            toggle
            checked={mfaEnabled}
            onToggle={() => {
              setMfaEnabled(!mfaEnabled);
              toast.success(!mfaEnabled ? 'MFA activée avec succès.' : 'MFA désactivée.');
            }}
          />

          {/* 3. Paramètres de communication */}
          <SettingRow
            icon={Bell}
            title="Paramètres de communication"
            description="Alertes et notifications d'offres"
            expanded={expandedSections.communication}
            onExpand={() => toggleSection('communication')}
          >
            <div className="bg-sky-50/60 rounded-2xl p-5 border border-sky-100 space-y-3 animate-in">
              {[
                { key: 'jobAlerts', label: 'Alertes nouvelles offres', desc: 'Recevez une notification dès qu\'une offre correspond à votre profil.' },
                { key: 'messageNotifications', label: 'Notifications de messages', desc: 'Soyez informé lorsqu\'un recruteur vous contacte.' },
                { key: 'weeklyDigest', label: 'Résumé hebdomadaire', desc: 'Un email récapitulatif chaque lundi matin.' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3 bg-white rounded-xl border border-sky-100 cursor-pointer hover:border-sky-200 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={comPrefs[item.key]}
                    onChange={() => toggleComPref(item.key)}
                    className="mt-0.5 w-4 h-4 rounded accent-teal-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-sky-800">{item.label}</p>
                    <p className="text-xs text-sky-500 mt-0.5">{item.desc}</p>
                  </div>
                  {comPrefs[item.key] && <Check size={14} className="text-teal-500 ml-auto shrink-0 mt-0.5" />}
                </label>
              ))}
            </div>
          </SettingRow>

          {/* 4. Gestion des appareils */}
          <SettingRow
            icon={Smartphone}
            title="Gestion des appareils"
            description="Session actuelle et historique"
            expanded={expandedSections.devices}
            onExpand={() => toggleSection('devices')}
          >
            <DevicePanel />
          </SettingRow>

          {/* 5. Paramètres de confidentialité */}
          <SettingRow
            icon={Eye}
            title="Paramètres de confidentialité"
            description="Données personnelles et RGPD"
            expanded={expandedSections.privacy}
            onExpand={() => toggleSection('privacy')}
          >
            <PrivacyPanel />
          </SettingRow>
        </div>
      </div>
    </AnimatedPage>
  );
}

export default SettingsPage;

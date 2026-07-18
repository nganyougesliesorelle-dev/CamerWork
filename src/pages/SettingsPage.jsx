import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, User, Shield, Bell, Smartphone, Eye, ChevronRight,
  Check, ToggleLeft, ToggleRight, Download, Save, LogOut, Monitor,
  MapPin, BadgeCheck, Moon, Sun, Globe, Lock, Key, Trash2, AlertTriangle,
} from 'lucide-react';
import { AnimatedPage } from '../composants/AnimatedPage';
import { useTheme } from '../composants/ThemeContext';
import { MfaSetup } from '../security/MfaSetup';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  updatePassword, deleteUser, reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { toast } from 'sonner';

/* ═══════════════════════════════════════════════════════════════
   Sous-panneau : Paramètres du compte (connecté Firestore)
   ═══════════════════════════════════════════════════════════════ */
function AccountPanel({ onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setName(d.displayName || d.name || '');
        setPhone(d.phone || '');
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        name,
        phone,
        updatedAt: new Date(),
      });
      toast.success(t('settings.saved'));
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-4">
      <h3 className="text-sm font-semibold text-sky-800 dark:text-gray-100 flex items-center gap-2">
        <BadgeCheck size={16} className="text-teal-500" />
        {t('settings.account_modify')}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-sky-600 dark:text-gray-300 block mb-1">
            {t('settings.name_label')}
          </label>
          <input
            type="text"
            placeholder="Jean Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sky-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-sky-900 dark:text-gray-100 placeholder:text-sky-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-sky-600 dark:text-gray-300 block mb-1">
            {t('settings.email_label')}
          </label>
          <input
            type="email"
            value={auth.currentUser?.email || ''}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-sky-200 dark:border-gray-600 bg-sky-100 dark:bg-gray-700 text-sm text-sky-500 dark:text-gray-400 cursor-not-allowed"
          />
          <p className="text-[10px] text-sky-400 dark:text-gray-500 mt-1">
            {t('settings.email_immutable')}
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold text-sky-600 dark:text-gray-300 block mb-1">
            {t('settings.phone_label')}
          </label>
          <input
            type="tel"
            placeholder="+237 6 00 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-sky-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-sky-900 dark:text-gray-100 placeholder:text-sky-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-sm rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md shadow-teal-200/50 dark:shadow-teal-900/30 active:scale-[0.98] disabled:opacity-60"
      >
        <Save size={16} />
        {saving ? t('settings.saving') : t('common.save')}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sous-panneau : Changement de mot de passe
   ═══════════════════════════════════════════════════════════════ */
function PasswordPanel({ onClose }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    if (newPassword.length < 6) {
      toast.error(t('settings.password_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.password_mismatch'));
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast.success(t('settings.password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose?.();
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        toast.error(t('settings.wrong_password'));
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-4">
      <h3 className="text-sm font-semibold text-sky-800 dark:text-gray-100 flex items-center gap-2">
        <Key size={16} className="text-amber-500" />
        {t('settings.change_password')}
      </h3>

      <div className="space-y-3">
        <input
          type="password"
          placeholder={t('settings.current_password')}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-sky-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-sky-900 dark:text-gray-100 placeholder:text-sky-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
        <input
          type="password"
          placeholder={t('settings.new_password')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-sky-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-sky-900 dark:text-gray-100 placeholder:text-sky-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
        <input
          type="password"
          placeholder={t('settings.confirm_password')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-sky-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-sky-900 dark:text-gray-100 placeholder:text-sky-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
      </div>

      <button
        onClick={handleChange}
        disabled={saving || !currentPassword || !newPassword}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
      >
        <Lock size={16} />
        {saving ? t('settings.changing') : t('settings.change_password_btn')}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sous-panneau : Suppression de compte
   ═══════════════════════════════════════════════════════════════ */
function DeleteAccountPanel() {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      toast.success(t('settings.danger_deleted'));
      window.location.href = '/';
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error(t('settings.danger_requires_relogin'));
      } else {
        toast.error(err.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-red-50/60 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800 space-y-4">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
        <AlertTriangle size={16} />
        {t('settings.danger_title')}
      </h3>

      <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
        {t('settings.danger_text')}
      </p>

      <input
        type="text"
        placeholder={t('settings.danger_confirm_placeholder')}
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-sm text-red-900 dark:text-red-200 placeholder:text-red-300 dark:placeholder:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
      />

      <button
        onClick={handleDelete}
        disabled={confirmText !== 'SUPPRIMER' || deleting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 size={16} />
        {deleting ? t('settings.danger_deleting') : t('settings.danger_delete_btn')}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sous-panneau : Gestion des appareils
   ═══════════════════════════════════════════════════════════════ */
function DevicePanel() {
  const { t } = useTranslation();
  const [devices] = useState([
    { name: 'Windows • Chrome', location: 'Douala, Cameroun', active: true },
    { name: 'iPhone • Safari', location: 'Yaoundé, Cameroun', active: false },
  ]);

  return (
    <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-4">
      {devices.map((device, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center">
            <Monitor size={20} className="text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sky-800 dark:text-gray-100">{device.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={11} className="text-sky-400 dark:text-gray-400" />
              <p className="text-xs text-sky-500 dark:text-gray-300">
                {device.location} {device.active ? `— ${t('settings.device_active_session')}` : ''}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              device.active
                ? 'bg-green-100 text-green-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}
          >
            {device.active ? t('common.active') : t('common.inactive')}
          </span>
        </div>
      ))}

      <button
        onClick={() => toast.success(t('settings.device_logged_out'))}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-[0.98]"
      >
        <LogOut size={15} />
        {t('settings.device_logout_all')}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sous-panneau : Confidentialité
   ═══════════════════════════════════════════════════════════════ */
function PrivacyPanel() {
  const { t } = useTranslation();

  const handleExport = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const data = {
        exportDate: new Date().toISOString(),
        account: userSnap.exists()
          ? { name: userSnap.data().displayName, email: user.email }
          : { email: user.email },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'camerwork-donnees.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('settings.export_success'));
    } catch (_e) {
      toast.error(t('settings.export_error'));
    }
  };

  return (
    <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-4">
      <p className="text-sm text-sky-700 dark:text-gray-300 leading-relaxed">
        {t('settings.privacy_text')}
      </p>

      <button
        onClick={handleExport}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-sky-200 dark:border-gray-600 text-sky-700 dark:text-gray-200 font-semibold text-sm rounded-xl hover:bg-sky-50 dark:hover:bg-gray-700 hover:border-sky-300 dark:hover:border-gray-500 transition-all active:scale-[0.98]"
      >
        <Download size={16} />
        {t('settings.export_data')}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Composant SettingRow réutilisable
   ═══════════════════════════════════════════════════════════════ */
function SettingRow({
  icon: Icon, title, description, badge, toggle, checked, onToggle,
  expanded, onExpand, children,
}) {
  return (
    <div>
      <button
        onClick={() => {
          if (toggle !== undefined) onToggle?.();
          else if (children) onExpand?.();
        }}
        className="w-full flex items-center gap-4 px-4 py-4 bg-white dark:bg-gray-800 hover:bg-sky-50/60 dark:hover:bg-gray-800/60 rounded-2xl border border-sky-100 dark:border-gray-700 transition-all group active:scale-[0.99]"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={20} className="text-teal-600 dark:text-teal-400" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-sky-800 dark:text-gray-100">{title}</p>
          <p className="text-xs text-sky-500 dark:text-gray-300 mt-0.5">{description}</p>
        </div>

        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full shrink-0">
            {badge}
          </span>
        )}

        {toggle !== undefined ? (
          <div className="shrink-0 transition-transform group-hover:scale-110">
            {checked ? (
              <ToggleRight size={36} className="text-teal-500" />
            ) : (
              <ToggleLeft size={36} className="text-sky-300 dark:text-gray-500" />
            )}
          </div>
        ) : children ? (
          <div
            className="shrink-0 text-sky-400 dark:text-gray-400 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <ChevronRight size={18} />
          </div>
        ) : (
          <ChevronRight size={18} className="text-sky-300 dark:text-gray-500 shrink-0" />
        )}
      </button>

      {expanded && children && (
        <div className="mt-3 ml-14 mr-4">{children}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Page principale SettingsPage
   ═══════════════════════════════════════════════════════════════ */
export function SettingsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();

  const [expandedSections, setExpandedSections] = useState({
    account: false,
    security: false,
    communication: false,
    appearance: false,
    devices: false,
    privacy: false,
    danger: false,
  });
  const [comPrefs, setComPrefs] = useState({
    jobAlerts: true,
    messageNotifications: false,
    weeklyDigest: true,
  });
  const [profileVisibility, setProfileVisibility] = useState('recruiters');

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleComPref = (key) => {
    setComPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const user = auth.currentUser;
      if (user) {
        updateDoc(doc(db, 'users', user.uid), { comPreferences: next }).catch(() => {});
      }
      return next;
    });
  };

  // Charger les préférences depuis Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.comPreferences) setComPrefs(d.comPreferences);
        if (d.profileVisibility) setProfileVisibility(d.profileVisibility);
      }
    });
  }, []);

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 font-sans antialiased pb-24">
        {/* ── HEADER ── */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-sky-100 dark:border-gray-700 px-4 py-3 sticky top-0 z-20 shadow-sm dark:shadow-gray-900/30">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-sky-500 dark:text-gray-300 hover:text-sky-700 dark:hover:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-sky-800 dark:text-gray-100">
              {t('settings.title')}
            </h1>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* 1. Paramètres du compte */}
          <SettingRow
            icon={User}
            title={t('settings.account')}
            description={t('settings.account_desc')}
            expanded={expandedSections.account}
            onExpand={() => toggleSection('account')}
          >
            <AccountPanel onClose={() => setExpandedSections((prev) => ({ ...prev, account: false }))} />
          </SettingRow>

          {/* 2. Sécurité (MFA + mot de passe) */}
          <SettingRow
            icon={Shield}
            title={t('settings.security')}
            description={t('settings.security_desc')}
            badge={t('settings.security_badge')}
            expanded={expandedSections.security}
            onExpand={() => toggleSection('security')}
          >
            <div className="space-y-4">
              <MfaSetup />
              <PasswordPanel onClose={() => setExpandedSections((prev) => ({ ...prev, security: false }))} />
            </div>
          </SettingRow>

          {/* 3. Notifications & communication */}
          <SettingRow
            icon={Bell}
            title={t('settings.notifications')}
            description={t('settings.notifications_desc')}
            expanded={expandedSections.communication}
            onExpand={() => toggleSection('communication')}
          >
            <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-3">
              {[
                {
                  key: 'jobAlerts',
                  label: t('settings.job_alerts'),
                  desc: t('settings.job_alerts_desc'),
                },
                {
                  key: 'messageNotifications',
                  label: t('settings.message_notifications'),
                  desc: t('settings.message_notifications_desc'),
                },
                {
                  key: 'weeklyDigest',
                  label: t('settings.weekly_digest'),
                  desc: t('settings.weekly_digest_desc'),
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-sky-100 dark:border-gray-700 cursor-pointer hover:border-sky-200 dark:hover:border-gray-600 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={comPrefs[item.key]}
                    onChange={() => toggleComPref(item.key)}
                    className="mt-0.5 w-4 h-4 rounded accent-teal-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-sky-800 dark:text-gray-100">{item.label}</p>
                    <p className="text-xs text-sky-500 dark:text-gray-300 mt-0.5">{item.desc}</p>
                  </div>
                  {comPrefs[item.key] && <Check size={14} className="text-teal-500 ml-auto shrink-0 mt-0.5" />}
                </label>
              ))}
            </div>
          </SettingRow>

          {/* 4. Apparence (langue) */}
          <SettingRow
            icon={Eye}
            title={t('settings.appearance')}
            description={t('settings.appearance_desc')}
            expanded={expandedSections.appearance}
            onExpand={() => toggleSection('appearance')}
          >
            <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-4">
              {/* Dark mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                    {darkMode ? (
                      <Sun size={20} className="text-amber-500" />
                    ) : (
                      <Moon size={20} className="text-sky-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sky-800 dark:text-gray-100">{t('settings.dark_mode')}</p>
                    <p className="text-xs text-sky-500 dark:text-gray-300">
                      {darkMode ? t('settings.dark_mode_on') : t('settings.dark_mode_off')}
                    </p>
                  </div>
                </div>
                <button onClick={toggleDarkMode} className="shrink-0 transition-transform hover:scale-110">
                  {darkMode ? (
                    <ToggleRight size={36} className="text-teal-500" />
                  ) : (
                    <ToggleLeft size={36} className="text-sky-300 dark:text-gray-500" />
                  )}
                </button>
              </div>

              {/* Langue */}
              <div className="flex items-center justify-between pt-3 border-t border-sky-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                    <Globe size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sky-800 dark:text-gray-100">{t('settings.language')}</p>
                    <p className="text-xs text-sky-500 dark:text-gray-300">
                      {i18n.language === 'fr' ? t('settings.french') : t('settings.english')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SettingRow>

          {/* 5. Visibilité du profil */}
          <SettingRow
            icon={User}
            title={t('settings.visibility')}
            description={t('settings.visibility_desc')}
            expanded={expandedSections.visibility}
            onExpand={() => toggleSection('visibility')}
          >
            <div className="bg-sky-50/60 dark:bg-gray-800/60 rounded-2xl p-5 border border-sky-100 dark:border-gray-700 space-y-3">
              {[
                { value: 'public', label: t('settings.visibility_public'), desc: t('settings.visibility_public_desc') },
                { value: 'recruiters', label: t('settings.visibility_recruiters'), desc: t('settings.visibility_recruiters_desc') },
                { value: 'private', label: t('settings.visibility_private'), desc: t('settings.visibility_private_desc') },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-sky-100 dark:border-gray-700 cursor-pointer hover:border-sky-200 dark:hover:border-gray-600 transition-all"
                >
                  <input
                    type="radio"
                    name="profileVisibility"
                    value={opt.value}
                    checked={profileVisibility === opt.value}
                    onChange={async () => {
                      setProfileVisibility(opt.value);
                      const user = auth.currentUser;
                      if (user) {
                        await updateDoc(doc(db, 'users', user.uid), { profileVisibility: opt.value });
                      }
                      toast.success(t('settings.visibility_updated'));
                    }}
                    className="mt-0.5 accent-teal-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-sky-800 dark:text-gray-100">{opt.label}</p>
                    <p className="text-xs text-sky-500 dark:text-gray-300 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </SettingRow>

          {/* 6. Gestion des appareils */}
          <SettingRow
            icon={Smartphone}
            title={t('settings.devices')}
            description={t('settings.devices_desc')}
            expanded={expandedSections.devices}
            onExpand={() => toggleSection('devices')}
          >
            <DevicePanel />
          </SettingRow>

          {/* 7. Confidentialité */}
          <SettingRow
            icon={Eye}
            title={t('settings.privacy')}
            description={t('settings.privacy_desc')}
            expanded={expandedSections.privacy}
            onExpand={() => toggleSection('privacy')}
          >
            <PrivacyPanel />
          </SettingRow>

          {/* 8. Zone dangereuse */}
          <SettingRow
            icon={AlertTriangle}
            title={t('settings.danger_zone')}
            description={t('settings.danger_zone_desc')}
            expanded={expandedSections.danger}
            onExpand={() => toggleSection('danger')}
          >
            <DeleteAccountPanel />
          </SettingRow>
        </div>
      </div>
    </AnimatedPage>
  );
}

export default SettingsPage;
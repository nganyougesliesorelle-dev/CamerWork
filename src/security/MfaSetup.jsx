/**
 * MfaSetup.jsx — Configuration de la Double Authentification (MFA).
 *
 * Utilise l'API Firebase Auth pour :
 *   1. Vérifier si MFA est déjà activé sur le compte
 *   2. Permettre l'enrôlement MFA (TOTP via application d'authentification)
 *   3. Afficher le statut MFA actuel
 *
 * Prérequis Firebase :
 *   - MFA activé dans la console Firebase (Authentication → Settings → Multi-factor)
 *   - Projet sur le plan Blaze (pay-as-you-go)
 *
 * Usage :
 *   <MfaSetup />
 *
 * Intègre dans la page Profil (section sécurité).
 */

import { useState, useEffect } from 'react';
import {
  multiFactor,
  TotpMultiFactorGenerator,
} from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { Shield, ShieldCheck, Smartphone, Key, QrCode, Check, AlertTriangle, Loader } from 'lucide-react';
import { toast } from 'sonner';

export function MfaSetup() {
  const [mfaStatus, setMfaStatus] = useState(null); // null, 'none', 'enrolled'
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [totpSecret, setTotpSecret] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState('idle'); // idle → showQR → verify

  // Vérifier le statut MFA au chargement
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const enrolledFactors = multiFactor(user).enrolledFactors;
      if (enrolledFactors.length > 0) {
        setMfaStatus('enrolled');
      } else {
        setMfaStatus('none');
      }
    } catch {
      setMfaStatus('none');
    }
    setLoading(false);
  }, []);

  const handleEnrollTotp = async () => {
    setEnrolling(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Non connecté');

      // Démarrer l'enrôlement TOTP
      const session = await multiFactor(user).getSession();
      const totpVerificationId = await TotpMultiFactorGenerator.generateSecret(session);

      setTotpSecret(totpVerificationId);
      setStep('showQR');
    } catch (err) {
      console.error('Erreur enrôlement MFA:', err);
      toast.error('Impossible de configurer la double authentification. Vérifiez que votre compte est vérifié par email.');
    }
    setEnrolling(false);
  };

  const handleVerifyTotp = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error('Code de vérification invalide.');
      return;
    }

    setEnrolling(true);
    try {
      const user = auth.currentUser;
      if (!user || !totpSecret) throw new Error('Session invalide');

      const cred = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, verificationCode);
      await multiFactor(user).enroll(cred, 'Authentificateur TOTP');

      // Sauvegarder le secret TOTP dans Firestore pour la vérification côté serveur
      if (totpSecret.secretKey) {
        await updateDoc(doc(db, 'users', user.uid), {
          totpSecret: totpSecret.secretKey,
          totpEnrolledAt: new Date(),
        }).catch((err) => console.warn('Erreur sauvegarde secret TOTP:', err));
      }

      setMfaStatus('enrolled');
      setStep('idle');
      setVerificationCode('');
      setTotpSecret(null);
      toast.success('Double authentification activée avec succès !');
    } catch (err) {
      console.error('Erreur vérification MFA:', err);
      toast.error('Code incorrect. Veuillez réessayer.');
    }
    setEnrolling(false);
  };

  const handleCancelEnroll = () => {
    setStep('idle');
    setVerificationCode('');
    setTotpSecret(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-sky-100 p-5 animate-pulse">
        <div className="h-4 bg-sky-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-sky-50 rounded w-2/3" />
      </div>
    );
  }

  // Générer l'URL du QR code à partir du secret TOTP
  const qrCodeUrl = totpSecret?.generateQrCodeUrl
    ? totpSecret.generateQrCodeUrl('CamerWork', auth.currentUser?.email || 'user@camerwork.app')
    : null;

  return (
    <div className="bg-white rounded-2xl border border-sky-100 p-5 space-y-4">
      <h3 className="text-xs font-black text-sky-800 uppercase tracking-wider flex items-center gap-2">
        <Shield size={16} className="text-cyan-500" /> Sécurité du compte
      </h3>

      {/* Statut MFA */}
      <div className="flex items-center justify-between p-4 bg-sky-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${mfaStatus === 'enrolled' ? 'bg-teal-100 text-teal-600' : 'bg-amber-100 text-amber-600'}`}>
            {mfaStatus === 'enrolled' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div>
            <p className="text-sm font-bold text-sky-800">
              {mfaStatus === 'enrolled' ? 'Double authentification activée' : 'Double authentification non configurée'}
            </p>
            <p className="text-xs text-sky-500 mt-0.5">
              {mfaStatus === 'enrolled'
                ? 'Votre compte est protégé par une vérification en deux étapes.'
                : 'Ajoutez une couche de sécurité supplémentaire à votre compte.'}
            </p>
          </div>
        </div>

        {mfaStatus === 'none' && step === 'idle' && (
          <button
            onClick={handleEnrollTotp}
            disabled={enrolling}
            className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-xs font-black hover:bg-cyan-600 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {enrolling ? <Loader size={13} className="animate-spin" /> : <Key size={13} />}
            Activer MFA
          </button>
        )}
      </div>

      {/* Étape : Afficher QR Code */}
      {step === 'showQR' && totpSecret && (
        <div className="p-4 bg-white border border-cyan-200 rounded-xl space-y-4">
          <div className="text-center">
            <p className="text-sm font-bold text-sky-800 mb-1">Scannez ce QR code</p>
            <p className="text-xs text-sky-500">
              Utilisez Google Authenticator, Authy, ou Microsoft Authenticator.
            </p>
          </div>

          {/* QR Code (rendu via API Google Charts car jsPDF n'a pas de QR) */}
          {qrCodeUrl && (
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeUrl)}`}
                alt="QR Code MFA"
                className="w-44 h-44 rounded-xl border border-sky-100"
              />
            </div>
          )}

          {/* Code secret manuel */}
          <div className="bg-sky-50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-black text-sky-400 uppercase mb-1">Ou saisissez ce code manuellement</p>
            <code className="text-sm font-mono font-bold text-sky-700 break-all select-all">
              {totpSecret.secretKey || 'Code non disponible'}
            </code>
          </div>

          {/* Saisie du code */}
          <div>
            <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
              Code de vérification à 6 chiffres
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full p-3 bg-sky-50 border border-sky-100 rounded-xl outline-none focus:border-cyan-500 text-sky-800 text-center text-lg font-bold tracking-[0.3em]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCancelEnroll}
              className="flex-1 px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleVerifyTotp}
              disabled={enrolling || verificationCode.length < 6}
              className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-xs font-black hover:bg-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enrolling ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
              Vérifier et activer
            </button>
          </div>
        </div>
      )}

      {/* Conseils de sécurité */}
      <div className="space-y-2 pt-2 border-t border-sky-100">
        <p className="text-[10px] font-black text-sky-400 uppercase">Conseils de sécurité</p>
        <ul className="space-y-1.5 text-xs text-sky-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-teal-500 mt-0.5 shrink-0" />
            Utilisez un mot de passe unique et fort (12+ caractères).
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-teal-500 mt-0.5 shrink-0" />
            Ne partagez jamais votre mot de passe ou vos codes de vérification.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-teal-500 mt-0.5 shrink-0" />
            Vérifiez toujours l'URL avant de vous connecter.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default MfaSetup;

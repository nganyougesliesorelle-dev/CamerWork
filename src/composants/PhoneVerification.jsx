/**
 * PhoneVerification.jsx — Vérification par SMS (OTP) style WhatsApp/Telegram.
 *
 * Flux :
 *   1. L'utilisateur saisit son numéro (format international)
 *   2. Un SMS avec un code à 6 chiffres est envoyé
 *   3. L'utilisateur saisit le code → vérification
 *   4. Badge "Téléphone vérifié" activé
 *
 * Usage :
 *   <PhoneVerification userId={currentUser.uid} />
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Phone, Send, CheckCircle2, Loader, ShieldCheck, AlertTriangle } from 'lucide-react';
import { setUpRecaptcha, sendPhoneOTP, verifyPhoneOTP, isPhoneVerified } from '../firebase/phoneVerificationService';

export function PhoneVerification({ userId, onVerified }) {
  const [step, setStep] = useState('idle'); // idle → enterPhone → sent → verified
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false); // eslint-disable-line no-unused-vars
  const [checking, setChecking] = useState(!!userId);

  const recaptchaRef = useRef(null);

  // Vérifier l'état au chargement (uniquement si userId est fourni)
  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
      return;
    }
    isPhoneVerified(userId).then(verified => {
      setPhoneVerified(verified);
      if (verified) setStep('verified');
      setChecking(false);
    });
  }, [userId]);

  // Initialiser reCAPTCHA
  useEffect(() => {
    if (step !== 'enterPhone') return;
    try {
      const verifier = setUpRecaptcha('recaptcha-container');
      recaptchaRef.current = verifier;
    } catch {
      // reCAPTCHA peut échouer en dev local sans domaine whitelisté
      console.warn('reCAPTCHA non initialisé — mode développement');
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [step]);

  // Envoyer le code OTP
  const handleSendCode = async () => {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      toast.error('Format invalide. Utilisez le format +237...');
      return;
    }

    setLoading(true);
    const result = await sendPhoneOTP(phoneNumber, recaptchaRef.current);

    if (result.success) {
      setVerificationId(result.verificationId);
      setStep('sent');
      toast.success('Code envoyé par SMS !');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  // Vérifier le code OTP
  const handleVerifyCode = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error('Veuillez entrer le code à 6 chiffres.');
      return;
    }

    setLoading(true);
    const result = await verifyPhoneOTP(verificationId, otpCode, userId, phoneNumber);

    if (result.success) {
      setPhoneVerified(true);
      setStep('verified');
      toast.success('Téléphone vérifié avec succès !');
      // Notifier le parent (utile pour le flux d'inscription sans userId)
      if (onVerified) onVerified(phoneNumber);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  // Réinitialiser
  const handleReset = () => {
    setStep('idle');
    setPhoneNumber('');
    setOtpCode('');
    setVerificationId(null);
  };

  if (checking) {
    return (
      <div className="bg-white rounded-2xl border border-sky-100 p-5 animate-pulse">
        <div className="h-4 bg-sky-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-sky-50 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-sky-100 p-5 space-y-4">
      <h3 className="text-xs font-black text-sky-800 uppercase tracking-wider flex items-center gap-2">
        <Phone size={16} className="text-cyan-500" /> Téléphone
      </h3>

      {/* reCAPTCHA container (invisible) */}
      <div id="recaptcha-container" ref={recaptchaRef} />

      {/* État : Vérifié */}
      {step === 'verified' && (
        <div className="flex items-center justify-between p-4 bg-teal-50 rounded-xl border border-teal-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-700">Téléphone vérifié</p>
              <p className="text-xs text-teal-500">{phoneNumber || 'Numéro confirmé'}</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-[10px] text-teal-500 hover:text-teal-700 font-bold"
          >
            Modifier
          </button>
        </div>
      )}

      {/* Étape 1 : Saisie du numéro */}
      {(step === 'idle' || step === 'enterPhone') && (
        <div className="space-y-3">
          {step === 'idle' ? (
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-700">Téléphone non vérifié</p>
                  <p className="text-xs text-amber-500">Vérifiez votre numéro pour plus de sécurité.</p>
                </div>
              </div>
              <button
                onClick={() => setStep('enterPhone')}
                className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-xs font-black hover:bg-cyan-600 transition-all"
              >
                Vérifier
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+237 6 00 00 00 00"
                  className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800 placeholder:text-sky-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <p className="text-[10px] text-sky-400 mt-1">
                  Format international requis (+237 pour le Cameroun)
                </p>
              </div>

              <button
                onClick={handleSendCode}
                disabled={loading || !phoneNumber}
                className="w-full px-4 py-3 bg-cyan-500 text-white rounded-xl text-xs font-black hover:bg-cyan-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Envoyer le code par SMS
              </button>
            </>
          )}
        </div>
      )}

      {/* Étape 2 : Saisie du code */}
      {step === 'sent' && (
        <div className="space-y-3">
          <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
            📱 Un code à 6 chiffres a été envoyé au <strong>{phoneNumber}</strong>
          </div>

          <div>
            <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
              Code de vérification
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800 text-center tracking-[0.5em] font-mono font-bold placeholder:text-sky-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setStep('enterPhone'); setOtpCode(''); }}
              className="flex-1 px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all"
            >
              ← Modifier le numéro
            </button>
            <button
              onClick={handleVerifyCode}
              disabled={loading || otpCode.length < 6}
              className="flex-1 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-xs font-black hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Vérifier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhoneVerification;
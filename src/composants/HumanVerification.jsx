/**
 * HumanVerification.jsx — Vérification d'humanité multi-étapes (style LinkedIn).
 *
 * Étapes :
 *   1. Pièce d'identité (CNI, passeport, permis) — upload photo
 *   2. Selfie de vérification — correspondance faciale
 *   3. Email professionnel — vérification par code
 *   4. Certificat/diplôme — upload document
 *
 * Badges obtenus :
 *   🟢 Identité vérifiée   (étape 1+2 validées)
 *   🟢 Email pro vérifié   (étape 3 validée)
 *   🟢 Diplôme vérifié     (étape 4 validée)
 *   🏆 Profil vérifié      (toutes les étapes)
 *
 * Usage :
 *   <HumanVerification userId={currentUser.uid} onVerificationChange={handleChange} />
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, IdCard, Camera, Mail, Award,
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Upload, Loader, BadgeCheck,
} from 'lucide-react';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PhotoCapture } from './PhotoCapture';

// Configuration des étapes
const VERIFICATION_STEPS = [
  {
    id: 'id_card',
    title: 'Pièce d\'identité',
    description: 'Carte Nationale d\'Identité, Passeport ou Permis de conduire',
    icon: IdCard,
    badge: 'Identité vérifiée',
    color: 'cyan',
  },
  {
    id: 'selfie',
    title: 'Selfie de vérification',
    description: 'Prenez une photo de votre visage pour confirmer votre identité',
    icon: Camera,
    badge: 'Photo vérifiée',
    color: 'teal',
  },
  {
    id: 'work_email',
    title: 'Email professionnel',
    description: 'Vérifiez votre adresse email professionnelle',
    icon: Mail,
    badge: 'Email pro vérifié',
    color: 'blue',
  },
  {
    id: 'certificate',
    title: 'Diplôme / Certificat',
    description: 'Ajoutez votre diplôme ou certification professionnelle',
    icon: Award,
    badge: 'Diplôme vérifié',
    color: 'violet',
  },
];

export function HumanVerification({ userId, isOpen, onClose, verificationStatus = {} }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(verificationStatus || {});
  const [workEmail, setWorkEmail] = useState('');
  const [workEmailCode, setWorkEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Traiter l'upload pour chaque étape
  const handleStepComplete = async (stepId, data) => {
    setUploading(true);
    try {
      // En production : uploader vers Firebase Storage
      // Pour cette implémentation, on simule la réussite

      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mettre à jour l'état local
      const updated = {
        ...completedSteps,
        [stepId]: {
          status: 'pending_review',
          submittedAt: new Date().toISOString(),
          ...data,
        },
      };
      setCompletedSteps(updated);

      // Mettre à jour Firestore
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          verificationSteps: updated,
          kycStatus: getOverallKycStatus(updated),
          verificationUpdatedAt: serverTimestamp(),
        });
      }

      toast.success(`${VERIFICATION_STEPS.find(s => s.id === stepId)?.title} soumis pour vérification !`);
    } catch (error) {
      console.error('Erreur vérification:', error);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  // Étape 3 : Email professionnel
  const handleSendWorkEmailCode = async () => {
    if (!workEmail || !workEmail.includes('@')) {
      toast.error('Veuillez entrer une adresse email valide.');
      return;
    }

    // Vérifier que c'est un email pro (pas gmail/yahoo/hotmail)
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'proton.me', 'mail.com'];
    const domain = workEmail.split('@')[1]?.toLowerCase();
    if (personalDomains.includes(domain)) {
      toast.error('Veuillez utiliser une adresse email professionnelle (entreprise, école, organisation).');
      return;
    }

    // Simuler l'envoi (en production : Firebase Functions + SendGrid/Mailgun)
    toast.success(`Code de vérification envoyé à ${workEmail}`);
    setCodeSent(true);
  };

  const handleVerifyWorkEmail = async () => {
    if (!workEmailCode || workEmailCode.length < 6) {
      toast.error('Code invalide.');
      return;
    }

    // Simuler la vérification (en production : vérifier via backend)
    await handleStepComplete('work_email', { email: workEmail });
    setWorkEmail('');
    setWorkEmailCode('');
    setCodeSent(false);
  };

  // Calculer le statut global KYC
  const getOverallKycStatus = (steps) => {
    const stepIds = Object.keys(steps);
    if (stepIds.length === 0) return 'unverified';

    const allSubmitted = VERIFICATION_STEPS.every(s => steps[s.id]?.status);
    if (allSubmitted) {
      const allVerified = VERIFICATION_STEPS.every(s => steps[s.id]?.status === 'verified');
      if (allVerified) return 'verified';
      return 'pending';
    }

    // Au moins une étape commencée
    const hasAny = VERIFICATION_STEPS.some(s => steps[s.id]?.status);
    return hasAny ? 'pending' : 'unverified';
  };

  // Compter les étapes complétées
  const completedCount = Object.values(completedSteps).filter(s => s?.status).length;
  const totalSteps = VERIFICATION_STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  if (!isOpen) return null;

  const step = VERIFICATION_STEPS[currentStep];
  const currentStepData = completedSteps[step.id];
  const isCurrentStepDone = currentStepData?.status === 'pending_review' || currentStepData?.status === 'verified';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-sky-100 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-sky-50 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-sky-800 dark:text-gray-100 flex items-center gap-2">
              <BadgeCheck size={20} className="text-cyan-500" />
              Vérification du profil
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-400 bg-sky-50 dark:bg-gray-700 px-2 py-1 rounded-lg">
                {completedCount}/{totalSteps}
              </span>
              <button onClick={onClose} className="p-1.5 hover:bg-sky-50 dark:hover:bg-gray-700 rounded-lg text-sky-400">
                ✕
              </button>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-sky-100 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Indicateurs d'étapes */}
          <div className="flex justify-between mt-3">
            {VERIFICATION_STEPS.map((s, idx) => {
              const done = completedSteps[s.id]?.status === 'pending_review' || completedSteps[s.id]?.status === 'verified';
              const isActive = idx === currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                    done
                      ? 'bg-teal-500 text-white'
                      : isActive
                        ? 'bg-cyan-500 text-white ring-2 ring-cyan-200'
                        : 'bg-sky-100 dark:bg-gray-700 text-sky-400'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenu de l'étape */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl bg-${step.color}-50`}>
              <step.icon size={22} className={`text-${step.color}-500`} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-sky-800 dark:text-gray-100">{step.title}</h4>
              <p className="text-xs text-sky-500 dark:text-gray-400 mt-0.5">{step.description}</p>
            </div>
          </div>

          {/* Badge récompense */}
          <div className="bg-sky-50 dark:bg-gray-700/50 rounded-xl p-3 flex items-center gap-2">
            <Shield size={16} className="text-teal-500" />
            <span className="text-xs font-bold text-sky-700 dark:text-gray-200">
              Badge : <span className="text-teal-600">{step.badge}</span>
            </span>
          </div>

          {/* État actuel */}
          {isCurrentStepDone ? (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {currentStepData?.status === 'pending_review' ? (
                  <>
                    <Clock size={18} className="text-amber-500 animate-pulse" />
                    <span className="text-sm font-bold text-amber-700">En cours de vérification</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="text-teal-500" />
                    <span className="text-sm font-bold text-teal-700">Vérifié !</span>
                  </>
                )}
              </div>
              <p className="text-xs text-teal-600">
                {currentStepData?.status === 'pending_review'
                  ? 'Notre équipe examine votre document. Cela peut prendre 24-48h.'
                  : 'Cette étape est validée. ✅'}
              </p>
            </div>
          ) : (
            <>
              {/* Étape 1 & 2 & 4 : Upload photo/document */}
              {(step.id === 'id_card' || step.id === 'selfie' || step.id === 'certificate') && (
                <div className="space-y-3">
                  <PhotoCapture
                    onPhotoSelected={async (file) => {
                      await handleStepComplete(step.id, {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                      });
                    }}
                  />
                  <p className="text-[10px] text-sky-400 text-center">
                    Formats acceptés : JPEG, PNG, WebP — Max 5 MB
                  </p>
                </div>
              )}

              {/* Étape 3 : Email pro */}
              {step.id === 'work_email' && (
                <div className="space-y-3">
                  {!codeSent ? (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
                          Adresse email professionnelle
                        </label>
                        <input
                          type="email"
                          value={workEmail}
                          onChange={(e) => setWorkEmail(e.target.value)}
                          placeholder="prenom@entreprise.com"
                          className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800 placeholder:text-sky-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                        <p className="text-[10px] text-sky-400 mt-1">
                          Les emails personnels (Gmail, Yahoo, etc.) ne sont pas acceptés.
                        </p>
                      </div>
                      <button
                        onClick={handleSendWorkEmailCode}
                        disabled={!workEmail}
                        className="w-full px-4 py-3 bg-cyan-500 text-white rounded-xl text-xs font-black hover:bg-cyan-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Mail size={14} /> Envoyer le code de vérification
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 font-medium">
                        📧 Un code à 6 chiffres a été envoyé à <strong>{workEmail}</strong>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
                          Code de vérification
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={workEmailCode}
                          onChange={(e) => setWorkEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="w-full px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl text-sm text-sky-800 text-center tracking-[0.5em] font-mono font-bold placeholder:text-sky-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </div>
                      <button
                        onClick={handleVerifyWorkEmail}
                        disabled={workEmailCode.length < 6}
                        className="w-full px-4 py-3 bg-teal-500 text-white rounded-xl text-xs font-black hover:bg-teal-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={14} /> Vérifier le code
                      </button>
                      <button
                        onClick={() => { setCodeSent(false); setWorkEmailCode(''); }}
                        className="w-full text-xs text-sky-400 hover:text-sky-600 text-center"
                      >
                        ← Changer d'adresse email
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-4 border-t border-sky-50 dark:border-gray-700">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2.5 bg-sky-50 dark:bg-gray-700 text-sky-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-sky-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-all"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              disabled={currentStep === totalSteps - 1}
              className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-xl text-xs font-bold hover:bg-cyan-600 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              Étape suivante <ChevronRight size={14} />
            </button>
          </div>

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-sky-500">
              <Loader size={14} className="animate-spin" />
              <span className="text-xs font-medium">Traitement en cours...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HumanVerification;
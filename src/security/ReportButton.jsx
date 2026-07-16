/**
 * ReportButton.jsx — Bouton de signalement de comportement suspect.
 *
 * Permet à tout utilisateur de signaler un comportement suspect
 * (arnaque, usurpation, harcèlement, offre frauduleuse).
 * Les signalements sont envoyés vers la collection Firestore "reports".
 *
 * Usage :
 *   <ReportButton targetId={userId} targetType="user" />
 *   <ReportButton targetId={jobId}  targetType="job" />
 */

import { useState } from 'react';
import { Flag, X, Send, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const REPORT_REASONS = [
  { value: 'processing_fees', label: 'Demande de frais de dossier' },
  { value: 'medical_tests', label: 'Demande de tests médicaux payants' },
  { value: 'paid_training', label: 'Formation d\'intégration payante exigée' },
  { value: 'scam', label: 'Arnaque / Escroquerie' },
  { value: 'impersonation', label: 'Usurpation d\'identité' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'fake_job', label: 'Offre frauduleuse' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Autre' },
];

const SUSPEND_THRESHOLD = 3;

export function ReportButton({ targetId, targetType = 'user', recruiterId, className = '', variant = 'icon' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Veuillez sélectionner un motif de signalement.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error('Vous devez être connecté pour signaler un comportement.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetId: targetId || 'unknown',
        targetType,
        reason,
        details: details.trim() || '',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Auto-suspend : si un recruteur atteint 3 signalements, suspension automatique
      const suspendTargetId = recruiterId || (targetType === 'user' ? targetId : null);
      if (suspendTargetId) {
        const reportsQ = query(
          collection(db, 'reports'),
          where('targetId', '==', suspendTargetId),
          where('status', 'in', ['pending', 'under_review'])
        );
        const reportsSnap = await getDocs(reportsQ);
        if (reportsSnap.size >= SUSPEND_THRESHOLD) {
          try {
            await updateDoc(doc(db, 'users', suspendTargetId), {
              isSuspended: true,
              kycStatus: 'suspended',
              suspendedAt: serverTimestamp(),
              suspensionReason: `Suspension automatique : ${reportsSnap.size} signalements reçus.`,
            });
          } catch (_) { /* silencieux — l'admin sera notifié */ }
        }
      }

      setSubmitted(true);
      toast.success('Signalement envoyé. Merci de contribuer à la sécurité de CamerWork.');

      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setReason('');
        setDetails('');
      }, 2000);
    } catch (err) {
      console.error('Erreur signalement:', err);
      toast.error('Erreur lors de l\'envoi du signalement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(!open)}
        className={`transition-all active:scale-95 ${
          variant === 'text'
            ? 'text-red-400 hover:text-red-500 text-xs font-bold flex items-center gap-1'
            : 'p-2 text-sky-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all'
        } ${className}`}
        title="Signaler un comportement suspect"
      >
        <Flag size={variant === 'text' ? 12 : 16} />
        {variant === 'text' && 'Signaler'}
      </button>

      {/* Modal de signalement */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 w-full max-w-md p-6 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-sky-800 flex items-center gap-2">
                <Flag size={18} className="text-red-400" />
                Signaler un comportement suspect
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-sky-50 rounded-lg text-sky-400"
              >
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 size={48} className="mx-auto text-teal-500" />
                <p className="font-bold text-sky-800">Signalement envoyé !</p>
                <p className="text-xs text-sky-500">Notre équipe va examiner votre signalement.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Motif */}
                <div>
                  <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
                    Motif du signalement
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-sky-50 border border-sky-100 rounded-xl outline-none focus:border-red-400 text-sky-800 text-sm font-medium"
                  >
                    <option value="">Sélectionner un motif...</option>
                    {REPORT_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Détails */}
                <div>
                  <label className="text-[10px] font-black text-sky-400 uppercase mb-1.5 block">
                    Détails supplémentaires (optionnel)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full p-3 bg-sky-50 border border-sky-100 rounded-xl outline-none focus:border-red-400 text-sky-800 text-sm resize-none"
                    placeholder="Décrivez le comportement suspect..."
                  />
                  <p className="text-[10px] text-sky-400 mt-1 text-right">{details.length}/1000</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !reason}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      'Envoi...'
                    ) : (
                      <>
                        <Send size={13} /> Envoyer le signalement
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportButton;

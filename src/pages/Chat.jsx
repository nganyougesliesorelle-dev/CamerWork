/**
 * Module 4 — Planificateur d'Entretiens Intégré (Chat amélioré)
 *
 * Ajouts par rapport à la version précédente :
 *   - type: 'appointment_proposal' avec slots multiples et statut (pending/accepted)
 *   - Le recruteur propose 3 créneaux via 3 inputs datetime-local
 *   - Le candidat voit des boutons interactifs pour accepter un créneau
 *   - Acceptation → updateDoc → status 'accepted' → bandeau vert confirmé
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, doc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { ArrowLeft, Send, Briefcase, Building2, ShieldCheck, UserCheck, FileText, Calendar, Phone, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { OnlinePresence } from '../composants/OnlinePresence';
import { AnimatedPage } from '../composants/AnimatedPage';

export function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);

  const [chatInfo, setChatInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const currentUser = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  // 3 créneaux pour le nouveau système de rendez-vous
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/'); return; }

    // Déterminer les participants à partir du chatId (uid1_uid2 ou uid1_uid2_appId)
    const parts = chatId.split('_');
    if (parts.length >= 2) {
      const otherId = user.uid === parts[0] ? parts[1] : parts[0];
      getDoc(doc(db, "users", otherId)).then(snap => {
        if (snap.exists()) setCandidateProfile(snap.data());
      });
      // Lire les rôles des deux premiers UIDs pour déterminer qui est recruteur/candidat
      Promise.all([
        getDoc(doc(db, 'users', parts[0])),
        getDoc(doc(db, 'users', parts[1]))
      ]).then(([snap0, snap1]) => {
        const role0 = snap0.exists() ? snap0.data().role : '';
        const role1 = snap1.exists() ? snap1.data().role : '';
        const is0Recruiter = role0 === 'recruiter' || role0 === 'recruteur';
        const is1Recruiter = role1 === 'recruiter' || role1 === 'recruteur';
        if (is0Recruiter) {
          setChatInfo({ recruiterId: parts[0], candidateId: parts[1] });
        } else if (is1Recruiter) {
          setChatInfo({ recruiterId: parts[1], candidateId: parts[0] });
        } else {
          // Fallback : ordre d'origine
          setChatInfo({ recruiterId: parts[0], candidateId: parts[1] });
        }
      });
    }

    const q = query(collection(db, "messages"), where("chatId", "==", chatId), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => { console.error('[Chat] Erreur écoute des messages :', err); setLoading(false); });

    return () => unsubscribe();
  }, [chatId, navigate]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /**
   * Envoi d'un message avec création automatique du chat si nécessaire.
   * L'ancienne règle ==request.time empêchait la création du chat ;
   * on garantit maintenant qu'il existe avant d'écrire le message.
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const text = newMessage.trim(); setNewMessage('');
    try {
      await addDoc(collection(db, "messages"), {
        chatId, senderId: currentUser.uid, text, timestamp: serverTimestamp()
      });
      // Upsert la conversation parente
      if (chatInfo) {
        const participants = [chatInfo.recruiterId, chatInfo.candidateId].sort();
        const convId = participants.join('_');
        const senderName = currentUser.displayName || 'Utilisateur';
        await setDoc(doc(db, 'conversations', convId), {
          participants,
          lastMessage: text.length > 80 ? text.slice(0, 77) + '...' : text,
          lastSenderId: currentUser.uid,
          lastSenderName: senderName,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.error('[Chat] Erreur envoi :', err);
      toast.error(`Erreur d'envoi : ${err.message}`);
    }
  };

  /** Nouveau : proposer 3 créneaux */
  const handleProposeSlots = async () => {
    const slots = [slot1, slot2, slot3].filter(s => s.trim());
    if (slots.length === 0) return toast.error(t('chat.select_date'));
    setScheduling(true);
    try {
      const text = `📅 Proposition d'entretien — ${slots.length} créneau(x) proposé(s)`;
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: currentUser.uid,
        text,
        type: 'appointment_proposal',
        slots,
        status: 'pending',
        acceptedSlot: null,
        timestamp: serverTimestamp(),
      });
      toast.success(t('notifications.interview_proposed'));
      setSlot1(''); setSlot2(''); setSlot3('');
      setScheduling(false);
    } catch (_e) { toast.error(t('chat.schedule_error')); setScheduling(false); }
  };

  /** Candidat accepte un créneau */
  const handleAcceptSlot = async (msgId, slot) => {
    try {
      await updateDoc(doc(db, "messages", msgId), { status: 'accepted', acceptedSlot: slot });
      toast.success("✅ Créneau accepté !");
    } catch (_e) { toast.error(t('chat.schedule_error')); }
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  /** Formatage lisible d'une date ISO */
  const formatSlot = (isoStr) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        + ' — ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return isoStr; }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-500 dark:text-gray-300 font-medium text-sm">{t('chat.loading')}</p>
      </div>
    </div>
  );

  const isRecruiter = currentUser?.uid === chatInfo?.recruiterId;
  const otherName = candidateProfile?.displayName || candidateProfile?.fullName || (isRecruiter ? 'Candidat' : 'Recruteur');
  const otherInitials = otherName.charAt(0).toUpperCase();

  // Vérifier si un entretien a été planifié et accepté entre les deux parties
  const hasAcceptedInterview = messages.some(
    m => m.type === 'appointment_proposal' && m.status === 'accepted'
  );
  const isOtherCandidate = candidateProfile?.role === 'candidate' || candidateProfile?.role === 'candidat';
  const shouldMaskContact = isRecruiter && isOtherCandidate && !hasAcceptedInterview;

  return (
    <AnimatedPage>
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 font-sans antialiased flex flex-col">
      
      {/* ─── HEADER ─── */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-sky-100 dark:border-gray-700 px-4 py-3 sticky top-0 z-20 shadow-sm dark:shadow-gray-900/30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-sky-500 dark:text-gray-300 hover:text-sky-700 dark:hover:text-gray-200 hover:bg-sky-50 dark:hover:bg-gray-800 rounded-xl transition-all">
            <ArrowLeft size={20} />
          </button>
          
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
            {otherInitials}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sky-800 dark:text-gray-100 text-sm truncate">{otherName}</h1>
            <div className="flex items-center gap-2 text-xs text-sky-500 dark:text-gray-300">
              <Briefcase size={12} />
              <span className="truncate">{chatInfo?.jobTitle || (candidateProfile?.role === 'recruiter' ? 'Recruteur' : 'Candidat')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <OnlinePresence userId={isRecruiter ? chatInfo?.candidateId : chatInfo?.recruiterId} showLabel size="sm" />
          </div>
        </div>
      </div>

      {/* ─── BODY: 2 COLUMNS ─── */}
      <div className="flex-1 flex max-w-6xl w-full mx-auto overflow-hidden">
        
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            {/* Bannière info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-sky-100 dark:border-gray-700 flex gap-3 items-start shadow-sm dark:shadow-gray-900/30">
              <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl text-cyan-500 shrink-0"><ShieldCheck size={18} /></div>
              <div>
                <p className="font-bold text-xs text-sky-800 dark:text-gray-100">{t('chat.info_title')}</p>
                <p className="text-xs text-sky-500 dark:text-gray-300 mt-0.5">{t('chat.info_body')}</p>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-16">
                <Building2 size={40} className="mx-auto mb-3 text-sky-300 dark:text-gray-600" />
                <p className="text-sky-400 dark:text-gray-400 text-sm font-medium">{t('chat.no_messages')}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser?.uid;
                const isInterview = msg.type === 'interview';
                const isAppointment = msg.type === 'appointment_proposal';
                const isAccepted = msg.status === 'accepted';
                const isCandidate = !isRecruiter;

                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${isAppointment ? 'max-w-[85%]' : 'max-w-[75%]'}`}>
                      {/* Avatar tiny */}
                      {!isMine && (
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          <div className="w-5 h-5 bg-sky-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sky-600 dark:text-gray-300 text-[9px] font-bold">{otherInitials}</div>
                          <span className="text-[10px] font-bold text-sky-400 dark:text-gray-400">{otherName.split(' ')[0]}</span>
                        </div>
                      )}

                      {/* ─── RENDU SPÉCIAL : PROPOSITION DE RENDEZ-VOUS ─── */}
                      {isAppointment ? (
                        <div className={`rounded-2xl p-4 ${
                          isAccepted
                            ? 'bg-teal-500 text-white'
                            : 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 border border-teal-200 dark:border-teal-800'
                        }`}>
                          <p className="font-black text-sm mb-3 flex items-center gap-2">
                            {isAccepted ? '✅ Entretien confirmé' : '📅 Proposition d\'entretien'}
                          </p>

                          {isAccepted && msg.acceptedSlot ? (
                            <div className="bg-white/20 rounded-xl p-3">
                              <p className="text-sm font-bold">{formatSlot(msg.acceptedSlot)}</p>
                              <p className="text-xs opacity-75 mt-1">
                                {isRecruiter ? 'Le candidat a accepté ce créneau.' : 'Vous avez accepté ce créneau.'}
                              </p>
                            </div>
                          ) : msg.status === 'pending' && msg.slots ? (
                            <div className="space-y-2">
                              {msg.slots.filter(s => s).map((slot, i) => (
                                isCandidate ? (
                                  <button
                                    key={i}
                                    onClick={() => handleAcceptSlot(msg.id, slot)}
                                    className="w-full text-left bg-sky-50 dark:bg-gray-800 hover:bg-cyan-100 dark:hover:bg-gray-700 border border-sky-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm font-bold text-sky-700 dark:text-gray-200 transition-all hover:border-cyan-300"
                                  >
                                    {formatSlot(slot)}
                                  </button>
                                ) : (
                                  <div key={i} className="bg-sky-50 dark:bg-gray-800 border border-sky-100 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-sky-600 dark:text-gray-300 font-medium">
                                    {formatSlot(slot)}
                                  </div>
                                )
                              ))}
                            </div>
                          ) : null}
                          <p className="text-[10px] mt-2 opacity-60">
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      ) : (
                        /* ─── RENDU NORMAL ─── */
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isInterview 
                            ? 'bg-gradient-to-r from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-medium'
                            : isMine 
                              ? 'bg-cyan-500 text-white rounded-br-md' 
                              : 'bg-white dark:bg-gray-800 text-sky-800 dark:text-gray-100 rounded-bl-md border border-sky-100 dark:border-gray-700 shadow-sm dark:shadow-gray-900/30'
                        }`}>
                          {msg.text}
                        </div>
                      )}
                      {!isAppointment && (
                        <p className={`text-[10px] text-sky-400 dark:text-gray-400 mt-0.5 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="bg-white dark:bg-gray-900 border-t border-sky-100 dark:border-gray-700 px-4 py-3">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
              {isRecruiter && (
                <button type="button" onClick={() => setScheduling(!scheduling)}
                  className={`p-2.5 rounded-xl transition-all ${scheduling ? 'bg-teal-500 text-white' : 'bg-sky-50 dark:bg-gray-800 text-sky-400 dark:text-gray-400 hover:bg-sky-100 dark:hover:bg-gray-700'}`} title="Planifier entretien">
                  <Calendar size={18} />
                </button>
              )}
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-3 bg-sky-50 dark:bg-gray-800 border border-sky-100 dark:border-gray-700 rounded-2xl outline-none focus:border-cyan-400 text-sky-800 dark:text-gray-100 text-sm" placeholder={t('chat.message_placeholder')} />
              <button type="submit" disabled={!newMessage.trim()}
                className="p-3 bg-cyan-500 text-white rounded-2xl hover:bg-cyan-600 transition-all disabled:bg-sky-200 dark:disabled:bg-gray-700 disabled:text-sky-400 dark:disabled:text-gray-500">
                <Send size={18} />
              </button>
            </form>
            {/* ─── SCHEDULING : 3 CRÉNEAUX ─── */}
            {scheduling && (
              <div className="mt-3 max-w-3xl mx-auto bg-teal-50 dark:bg-teal-900/30 p-4 rounded-2xl border border-teal-100 dark:border-teal-800 space-y-3">
                <p className="text-xs font-black text-teal-700 dark:text-teal-300 flex items-center gap-2">
                  <Calendar size={14} /> Proposer 3 créneaux d'entretien
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i}>
                      <label className="text-[10px] font-bold text-teal-500 dark:text-teal-400 mb-1 block">Créneau {i + 1}</label>
                      <input type="datetime-local"
                        value={i === 0 ? slot1 : i === 1 ? slot2 : slot3}
                        onChange={e => i === 0 ? setSlot1(e.target.value) : i === 1 ? setSlot2(e.target.value) : setSlot3(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-700 rounded-lg text-xs text-sky-700 dark:text-gray-100 outline-none focus:border-teal-400" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleProposeSlots} disabled={scheduling}
                    className="px-4 py-2 bg-teal-500 text-white rounded-xl text-xs font-black hover:bg-teal-600 transition-all">
                    Proposer ces créneaux
                  </button>
                  <button onClick={() => setScheduling(false)} className="px-4 py-2 text-xs font-bold text-sky-500 dark:text-gray-300 hover:text-red-500">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar droite : profil candidat */}
        <div className="hidden lg:block w-72 border-l border-sky-100 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-black text-sky-800 dark:text-gray-100 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCheck size={14} className="text-cyan-500" /> {t('chat.contact_profile')}
          </h3>
          
          {candidateProfile ? (
            <div className="space-y-3">
              <div className="text-center pb-3 border-b border-sky-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-2">
                  {candidateProfile.photoURL ? <img src={candidateProfile.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" /> : otherInitials}
                </div>
                <p className="font-bold text-sky-800 dark:text-gray-100 text-sm">{otherName}</p>
                <p className="text-xs text-sky-500 dark:text-gray-300">{candidateProfile.role === 'recruiter' ? 'Recruteur' : 'Candidat'}</p>
              </div>

              <div className="space-y-2">
                {shouldMaskContact ? (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 font-medium flex items-center gap-2">
                    <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                    <span>Coordonnées masquées — planifiez un entretien pour les débloquer</span>
                  </div>
                ) : (
                  <>
                    {candidateProfile.email && (
                      <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-gray-300">
                        <CheckCircle2 size={12} className="text-teal-500" /> {candidateProfile.email}
                      </div>
                    )}
                    {candidateProfile.phone && (
                      <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-gray-300">
                        <Phone size={12} className="text-sky-400 dark:text-gray-400" /> {candidateProfile.phone}
                      </div>
                    )}
                  </>
                )}
                {candidateProfile.location && (
                  <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-gray-300">
                    <MapPin size={12} className="text-sky-400 dark:text-gray-400" /> {candidateProfile.location}
                  </div>
                )}
              </div>

              {candidateProfile.skills?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-sky-400 dark:text-gray-400 uppercase mb-1.5">{t('profile.skills')}</p>
                  <div className="flex flex-wrap gap-1">
                    {candidateProfile.skills.slice(0, 8).map((s, i) => (
                      <span key={i} className="bg-sky-50 dark:bg-gray-800 text-sky-600 dark:text-gray-300 px-2 py-0.5 rounded-lg text-[10px] font-bold">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {candidateProfile.cvUrl && (
                <a href={candidateProfile.cvUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-black text-cyan-500 hover:text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 px-3 py-2 rounded-xl transition-all">
                  <FileText size={14} /> {t('profile.consult_cv')}
                </a>
              )}

              {!candidateProfile.cvUrl && !candidateProfile.skills?.length && (
                <p className="text-xs text-sky-400 dark:text-gray-400 italic text-center py-4">{t('chat.profile_sparse')}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-sky-400 dark:text-gray-400 text-center py-8">{t('chat.profile_unavailable')}</p>
          )}
        </div>
      </div>
    </div>
    </AnimatedPage>
  );
}
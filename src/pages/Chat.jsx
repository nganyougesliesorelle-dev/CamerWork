import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, doc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Send, Briefcase, Building2, ShieldCheck, UserCheck, FileText, Calendar, Phone, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [chatInfo, setChatInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const currentUser = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/'); return; }

    const fetchChatInfo = async () => {
      try {
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          setChatInfo(data);
          // Charger le profil du candidat
          const otherId = user.uid === data.recruiterId ? data.candidateId : data.recruiterId;
          if (otherId) {
            const userSnap = await getDoc(doc(db, "users", otherId));
            if (userSnap.exists()) setCandidateProfile(userSnap.data());
          }
        } else {
          const parts = chatId.split('_');
          if (parts.length >= 2) {
            const [id1, id2] = parts;
            const otherId = user.uid === id1 ? id2 : id1;
            // DM entre utilisateurs (pas lié à une candidature)
            const userSnap = await getDoc(doc(db, "users", otherId));
            const otherData = userSnap.exists() ? userSnap.data() : {};
            const initialData = {
              companyName: otherData.company || otherData.displayName || 'Discussion',
              jobTitle: otherData.role === 'recruiter' ? 'Recruteur' : 'Candidat',
              recruiterId: id1, candidateId: id2,
              createdAt: serverTimestamp(),
              lastMessage: 'Discussion initiée.',
              lastMessageAt: serverTimestamp(),
              isDM: true,
            };
            await setDoc(chatRef, initialData);
            setChatInfo(initialData);
            if (userSnap.exists()) setCandidateProfile(otherData);
          } else {
            toast.error("Discussion introuvable.");
            navigate(-1);
          }
        }
      } catch (_e) { /* ignore */ }
    };

    fetchChatInfo();

    const q = query(collection(db, "messages"), where("chatId", "==", chatId), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => { setLoading(false); });

    return () => unsubscribe();
  }, [chatId, navigate]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const text = newMessage.trim(); setNewMessage('');
    try {
      await addDoc(collection(db, "messages"), { chatId, senderId: currentUser.uid, text, timestamp: serverTimestamp() });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
    } catch (_e) { toast.error("Erreur d'envoi."); }
  };

  const handleScheduleInterview = async () => {
    if (!interviewDate) return toast.error("Sélectionnez une date.");
    setScheduling(true);
    const text = `📅 *Proposition d'entretien* : ${new Date(interviewDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`;
    try {
      await addDoc(collection(db, "messages"), { chatId, senderId: currentUser.uid, text, timestamp: serverTimestamp(), type: 'interview' });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
      toast.success("Proposition d'entretien envoyée !");
      setInterviewDate('');
      setScheduling(false);
    } catch (_e) { toast.error("Erreur."); setScheduling(false); }
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return '';
    return ts.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-500 font-medium text-sm">Chargement de la discussion...</p>
      </div>
    </div>
  );

  const isRecruiter = currentUser?.uid === chatInfo?.recruiterId;
  const otherName = candidateProfile?.displayName || candidateProfile?.fullName || (isRecruiter ? 'Candidat' : 'Recruteur');
  const otherInitials = otherName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 font-sans antialiased flex flex-col">
      
      {/* ─── HEADER ─── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-sky-100 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-sky-500 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-all">
            <ArrowLeft size={20} />
          </button>
          
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
            {otherInitials}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sky-800 text-sm truncate">{otherName}</h1>
            <div className="flex items-center gap-2 text-xs text-sky-500">
              <Briefcase size={12} />
              <span className="truncate">{chatInfo?.jobTitle || (candidateProfile?.role === 'recruiter' ? 'Recruteur' : 'Candidat')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-teal-600 font-bold hidden sm:inline">En ligne</span>
          </div>
        </div>
      </div>

      {/* ─── BODY: 2 COLUMNS ─── */}
      <div className="flex-1 flex max-w-6xl w-full mx-auto overflow-hidden">
        
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            {/* Bannière info */}
            <div className="bg-white rounded-2xl p-4 border border-sky-100 flex gap-3 items-start shadow-sm">
              <div className="p-2 bg-cyan-50 rounded-xl text-cyan-500 shrink-0"><ShieldCheck size={18} /></div>
              <div>
                <p className="font-bold text-xs text-sky-800">Espace d'échange professionnel</p>
                <p className="text-xs text-sky-500 mt-0.5">Échangez librement. Planifiez un entretien avec le bouton calendrier.</p>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-16">
                <Building2 size={40} className="mx-auto mb-3 text-sky-300" />
                <p className="text-sky-400 text-sm font-medium">Aucun message. Lancez la discussion !</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser?.uid;
                const isInterview = msg.type === 'interview';
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMine ? 'order-1' : 'order-1'}`}>
                      {/* Avatar tiny */}
                      {!isMine && (
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          <div className="w-5 h-5 bg-sky-200 rounded-full flex items-center justify-center text-sky-600 text-[9px] font-bold">{otherInitials}</div>
                          <span className="text-[10px] font-bold text-sky-400">{otherName.split(' ')[0]}</span>
                        </div>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isInterview 
                          ? 'bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-800 border border-teal-200 font-medium'
                          : isMine 
                            ? 'bg-cyan-500 text-white rounded-br-md' 
                            : 'bg-white text-sky-800 rounded-bl-md border border-sky-100 shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <p className={`text-[10px] text-sky-400 mt-0.5 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="bg-white border-t border-sky-100 px-4 py-3">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
              {isRecruiter && (
                <button type="button" onClick={() => setScheduling(!scheduling)}
                  className={`p-2.5 rounded-xl transition-all ${scheduling ? 'bg-teal-500 text-white' : 'bg-sky-50 text-sky-400 hover:bg-sky-100'}`} title="Planifier entretien">
                  <Calendar size={18} />
                </button>
              )}
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 p-3 bg-sky-50 border border-sky-100 rounded-2xl outline-none focus:border-cyan-400 text-sky-800 text-sm" placeholder="Votre message..." />
              <button type="submit" disabled={!newMessage.trim()}
                className="p-3 bg-cyan-500 text-white rounded-2xl hover:bg-cyan-600 transition-all disabled:bg-sky-200 disabled:text-sky-400">
                <Send size={18} />
              </button>
            </form>
            {scheduling && (
              <div className="mt-2 flex items-center gap-2 max-w-3xl mx-auto bg-teal-50 p-2 rounded-xl border border-teal-100">
                <Calendar size={16} className="text-teal-500 shrink-0" />
                <input type="datetime-local" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)}
                  className="flex-1 p-1.5 bg-white border border-teal-200 rounded-lg text-xs text-sky-700 outline-none" />
                <button onClick={handleScheduleInterview} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-black hover:bg-teal-600">
                  Proposer
                </button>
                <button onClick={() => setScheduling(false)} className="p-1.5 text-sky-400 hover:text-red-400">✕</button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar droite : profil candidat */}
        <div className="hidden lg:block w-72 border-l border-sky-100 bg-white/60 backdrop-blur-sm p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-black text-sky-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCheck size={14} className="text-cyan-500" /> Profil contact
          </h3>
          
          {candidateProfile ? (
            <div className="space-y-3">
              <div className="text-center pb-3 border-b border-sky-100">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-2">
                  {candidateProfile.photoURL ? <img src={candidateProfile.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" /> : otherInitials}
                </div>
                <p className="font-bold text-sky-800 text-sm">{otherName}</p>
                <p className="text-xs text-sky-500">{candidateProfile.role === 'recruiter' ? 'Recruteur' : 'Candidat'}</p>
              </div>

              <div className="space-y-2">
                {candidateProfile.email && (
                  <div className="flex items-center gap-2 text-xs text-sky-600">
                    <CheckCircle2 size={12} className="text-teal-500" /> {candidateProfile.email}
                  </div>
                )}
                {candidateProfile.phone && (
                  <div className="flex items-center gap-2 text-xs text-sky-600">
                    <Phone size={12} className="text-sky-400" /> {candidateProfile.phone}
                  </div>
                )}
                {candidateProfile.location && (
                  <div className="flex items-center gap-2 text-xs text-sky-600">
                    <MapPin size={12} className="text-sky-400" /> {candidateProfile.location}
                  </div>
                )}
              </div>

              {candidateProfile.skills?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-sky-400 uppercase mb-1.5">Compétences</p>
                  <div className="flex flex-wrap gap-1">
                    {candidateProfile.skills.slice(0, 8).map((s, i) => (
                      <span key={i} className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {candidateProfile.cvUrl && (
                <a href={candidateProfile.cvUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-black text-cyan-500 hover:text-cyan-600 bg-cyan-50 px-3 py-2 rounded-xl transition-all">
                  <FileText size={14} /> Consulter le CV
                </a>
              )}

              {!candidateProfile.cvUrl && !candidateProfile.skills?.length && (
                <p className="text-xs text-sky-400 italic text-center py-4">Profil peu détaillé</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-sky-400 text-center py-8">Profil non disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}

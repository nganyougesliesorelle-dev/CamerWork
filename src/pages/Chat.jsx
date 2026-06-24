import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, doc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ArrowLeft, Send, MessageSquare, Briefcase, User, Building2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [chatInfo, setChatInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentification et chargement initial
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }
    setCurrentUser(user);

    // Récupérer les métadonnées du salon de discussion
    const fetchChatInfo = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          setChatInfo(chatDoc.data());
        } else {
          toast.error("Salon de discussion introuvable.");
          navigate(-1);
        }
      } catch (error) {
        console.error("Erreur chat info:", error);
      }
    };

    fetchChatInfo();

    // Écouter les messages en temps réel
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Erreur temps réel messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, navigate]);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoi de message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // 1. Ajouter le message dans Firestore
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: currentUser.uid,
        text: messageText,
        timestamp: serverTimestamp()
      });

      // 2. Mettre à jour le dernier message dans le document du chat
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Erreur envoi message:", error);
      toast.error("Impossible d'envoyer le message.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      
      {/* BARRE SUPÉRIEURE DE NAVIGATION */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-blue-50 text-blue-600 rounded-lg">
                  <Building2 size={14} />
                </span>
                <h1 className="font-black text-slate-800 text-base md:text-lg truncate uppercase tracking-tight">
                  {chatInfo?.companyName}
                </h1>
              </div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest truncate flex items-center gap-1.5 mt-0.5">
                <Briefcase size={12} className="text-blue-600" /> Pré-entretien : {chatInfo?.jobTitle}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex bg-emerald-50 text-emerald-700 px-4 py-2 border border-emerald-100 rounded-2xl text-[10px] font-black uppercase tracking-wider items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Salon Actif
          </div>
        </div>
      </div>

      {/* ZONE DES MESSAGES */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto space-y-4">
        
        {/* ENCADRÉ D'AVERTISSEMENT ACADÉMIQUE / SÉCURITÉ */}
        <div className="bg-blue-900 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-950/10 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-yellow-400">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-yellow-400">Espace de Pré-entretien Connecté</h4>
            <p className="text-xs text-blue-100 font-medium mt-1 leading-relaxed">
              Ce salon s'est ouvert automatiquement. Vous êtes en relation directe pour caler un rendez-vous, échanger vos contacts ou passer un premier entretien écrit.
            </p>
          </div>
        </div>

        {/* LISTE DES MESSAGES DU COMPTE À REBOURS */}
        <div className="space-y-4 pt-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-[1.8rem] p-4 shadow-sm border ${
                  isMe 
                    ? 'bg-blue-700 text-white rounded-tr-none border-blue-600' 
                    : 'bg-white text-slate-800 rounded-tl-none border-slate-100'
                }`}>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* BARRE D'ENVOI DE MESSAGE */}
      <div className="bg-white border-t border-slate-100 p-4 md:p-6 sticky bottom-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message ici..."
            className="flex-1 px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none font-medium transition-all text-sm"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-100 text-white disabled:text-slate-400 p-4 rounded-2xl shadow-xl hover:shadow-blue-200 transition-all flex items-center justify-center active:scale-95"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

    </div>
  );
}
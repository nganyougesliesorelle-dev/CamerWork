import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { messaging, db, auth } from './firebase/firebaseConfig';
import { onMessage } from 'firebase/messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

// Imports de tes pages et composants
import { LandingPage } from './pages/LandingPage';
import Home from './pages/Home';
import { JobList } from './pages/joblist';
import { Profile } from './pages/Profile'; 
import { DashboardRecruiter } from './pages/DashboardRecruiter';
import { RecruiterPost } from './pages/RecruiterPost';
import { JobDetails } from './pages/jobDetails';
import { Chat } from './pages/Chat';
import { AtsCv } from './pages/AtsCv';
import { InterviewSimulator } from './pages/InterviewSimulator';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { Notifications } from './composants/Notifications';
import { LangProvider } from './composants/LangContext';

function App() {
  const { t } = useTranslation();
  const [globalUser, setGlobalUser] = useState(null);
  const prevAppsRef = useRef({});

  // Surveiller l'auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setGlobalUser(user));
    return () => unsub();
  }, []);

  // Écouteur global : changements de statut des candidatures (candidat)
  useEffect(() => {
    if (!globalUser) return;
    const q = query(
      collection(db, "applications"),
      where("candidateId", "==", globalUser.uid),
      orderBy("appliedAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const data = change.doc.data();
          const prev = prevAppsRef.current[change.doc.id];
          // Détecter un changement de statut
          if (prev && prev.status !== data.status) {
            if (data.status === "accepted" || data.status === "retenu") {
              const chatId = `${data.recruiterId || ''}_${data.candidateId}_${change.doc.id}`;
              toast.success(
                <div>
                  <strong>{t('notifications.application_accepted_title')}</strong>
                  <p className="text-xs mt-1">{data.jobTitle} {t('common.at')} {data.company}</p>
                  <button 
                    onClick={() => window.location.href = `/chat/${chatId}`}
                    className="mt-2 px-3 py-1 bg-teal-500 text-white rounded-lg text-xs font-bold"
                  >
                    {t('chat.title')}
                  </button>
                </div>,
                { duration: 8000 }
              );
            } else if (data.status === "rejected" || data.status === "refusé") {
              toast.error(
                t('notifications.application_rejected_body', { 
                  jobTitle: data.jobTitle, 
                  company: data.company 
                }), 
                { duration: 5000 }
              );
            }
          }
          prevAppsRef.current[change.doc.id] = data;
        } else if (change.type === "added") {
          prevAppsRef.current[change.doc.id] = change.doc.data();
        }
      });
    });
    return () => unsub();
  }, [globalUser, t]);

  // Gestionnaire de notifications push en premier plan
  useEffect(() => {
    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('[CamerWork] Message reçu en premier plan:', payload);
        const title = payload.notification?.title || 'CamerWork';
        const body = payload.notification?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/logo.png' });
        }
        toast.info(body || title, { description: t('notifications.new_notification') });
      });
      return () => unsubscribe();
    } catch (_e) {
      // messaging non supporté
    }
  }, [t]);

  return (
    <LangProvider>
    <Router>
      <Toaster 
        position="top-center" 
        richColors 
        closeButton 
        toastOptions={{
          style: { borderRadius: '1.2rem' }
        }}
      />
      
      <Routes>
        {/* 1. Page Vitrine (Nouvel Accueil chaleureux) */}
        <Route path="/" element={<LandingPage />} />

        {/* Formulaire de Connexion / Inscription (Anciennement sur "/") */}
        <Route path="/login" element={<Home />} />

        {/* 2. Flux d'offres d'emploi */}
        <Route path="/offres" element={<JobList />} />
        <Route path="/offres/:id" element={<JobDetails />} />

        {/* 3. Profils (Mon profil et Profil public via ID) */}
        <Route path="/profil" element={<Profile />} />
        <Route path="/profil/:id" element={<Profile />} />
        <Route path="/mon-profil" element={<Profile />} /> 

        {/* 4. Centre de Notifications (Coach & Opportunités) */}
        <Route path="/notifications" element={<Notifications />} />

        {/* 5. Messagerie instantanée (Pré-entretiens) */}
        <Route path="/chat/:chatId" element={<Chat />} />

        {/* 5b. Outils Candidat */}
        <Route path="/cv-generator" element={<AtsCv />} />
        <Route path="/interview-simulator" element={<InterviewSimulator />} />
        <Route path="/career-dashboard" element={<CandidateDashboard />} />

        {/* 6. Espace Recruteur */}
        <Route path="/DashboardRecruiter" element={<DashboardRecruiter />} /> 
        <Route path="/RecruiterPost" element={<RecruiterPost />} />

        {/* 7. Redirection de sécurité (Doit toujours être TOUT à la fin) */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
    </LangProvider>
  );
}

export default App;

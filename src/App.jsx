import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { messaging } from './firebase/firebaseConfig';
import { onMessage } from 'firebase/messaging';
import { toast } from 'sonner';

// Imports de tes pages et composants
import { LandingPage } from './pages/LandingPage'; // AJOUTÉ : Ta nouvelle page vitrine
import Home from './pages/Home'; // C'est ton ancien composant avec le formulaire d'auth
import { JobList } from './pages/joblist';
import { Profile } from './pages/Profile'; 
import { DashboardRecruiter } from './pages/DashboardRecruiter';
import { RecruiterPost } from './pages/RecruiterPost';
import { JobDetails } from './pages/jobDetails';
import { Chat } from './pages/Chat';
import { AtsCv } from './pages/AtsCv';
import { InterviewSimulator } from './pages/InterviewSimulator';
import { Notifications } from './composants/Notifications';

function App() {
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
        toast.info(body || title, { description: 'Nouvelle notification' });
      });
      return () => unsubscribe();
    } catch (_e) {
      // messaging non supporté
    }
  }, []);

  return (
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

        {/* 6. Espace Recruteur */}
        <Route path="/DashboardRecruiter" element={<DashboardRecruiter />} /> 
        <Route path="/RecruiterPost" element={<RecruiterPost />} />

        {/* 7. Redirection de sécurité (Doit toujours être TOUT à la fin) */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
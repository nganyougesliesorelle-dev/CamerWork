import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Imports de tes pages et composants
import Home from './pages/Home';
import { JobList } from './pages/joblist';
import { Profile } from './pages/Profile'; 
import { DashboardRecruiter } from './pages/DashboardRecruiter';
import { RecruiterPost } from './pages/RecruiterPost';
import { JobDetails } from './pages/jobDetails';
import { Chat } from './pages/Chat';
import { Notifications } from './components/Notifications'; // AJOUTÉ : Le centre d'alertes

function App() {
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
        {/* 1. Accueil & Auth */}
        <Route path="/" element={<Home />} />

        {/* 2. Flux d'offres d'emploi */}
        <Route path="/offres" element={<JobList />} />
        <Route path="/offres/:id" element={<JobDetails />} />

        {/* 3. Profils (Mon profil et Profil public via ID) */}
        <Route path="/profil" element={<Profile />} />
        <Route path="/profil/:id" element={<Profile />} />
        {/* AJOUTÉ : Redirection du bouton "Optimiser mon profil" vers le bon composant */}
        <Route path="/mon-profil" element={<Profile />} /> 

        {/* 4. Centre de Notifications (Coach & Opportunités) */}
        <Route path="/notifications" element={<Notifications />} />

        {/* 5. Messagerie instantanée (Pré-entretiens) */}
        <Route path="/chat/:chatId" element={<Chat />} />

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
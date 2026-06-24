import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Imports de tes pages
import Home from './pages/Home';
import { JobList } from './pages/joblist';
import { Profile } from './pages/Profile'; // Assure-toi qu'il gère les deux modes
import { DashboardRecruiter } from './pages/DashboardRecruiter';
import { RecruiterPost } from './pages/RecruiterPost';
import { JobDetails } from './pages/jobDetails';
import { Chat } from './pages/Chat';

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

        {/* 4. Espace Recruteur */}
        {/* J'ai harmonisé le nom ici pour correspondre aux redirections */}
        <Route path="/DashboardRecruiter" element={<DashboardRecruiter />} /> 
        <Route path="/RecruiterPost" element={<RecruiterPost />} />

        {/* 5. Redirection de sécurité */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/chat/:chatId" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;
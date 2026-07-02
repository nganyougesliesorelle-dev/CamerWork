import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, MessageSquare, Briefcase, Zap } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sky-50 font-sans antialiased text-sky-800 flex flex-col justify-between">
      
      {/* 1. HEADER / BARRE DE NAVIGATION */}
      <header className="bg-white/80 backdrop-blur-md border-b border-sky-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo CamerWork */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-600 to-cyan-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-200">
              C
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
              Camer<span className="text-sky-900">Work</span>
            </span>
          </div>

          {/* Connexion à droite */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')} 
              className="text-sm font-semibold text-sky-600 hover:text-sky-600 transition-colors"
            >
              Connexion
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all active:scale-95 hidden sm:block"
            >
              Essai Gratuit
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION COMPACTE STYLE SLACK */}
      <main className="flex-1 bg-gradient-to-b from-sky-950 to-sky-900 text-white py-12 lg:py-20 flex items-center relative overflow-hidden">
        {/* Cercles lumineux légers en arrière-plan */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* BLOC GAUCHE : TEXTE ET ACTIONS */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-sky-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/5">
              <Sparkles size={12} className="animate-pulse text-sky-400" />
              Propulsé par un moteur de matching intelligent
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
              Conçu pour les jeunes.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                Optimisé dans la recherche d'emploie et combler le vide du manque d'information.
              </span>
            </h1>

            <p className="text-sky-300 text-sm sm:text-base font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Connectez votre profil, découvrez instantanément votre <span className="text-sky-300 font-semibold">New.work</span> et discutez en direct avec les entreprises via nos salons de pré-entretien automatisés.
            </p>

            {/* Formulaire / Boutons d'inscription rapide */}
            <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto lg:mx-0 pt-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto bg-white hover:bg-sky-100 text-sky-900 text-xs font-black uppercase tracking-wider px-6 py-4 rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
              >
                S'inscrire avec votre e-mail
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider px-6 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
              >
                S'inscrire via Google
              </button>
            </div>

            <p className="text-xs text-sky-400 font-medium">
              Vous pouvez essayer CamerWork gratuitement aussi longtemps que vous le souhaitez.
            </p>
          </div>

          {/* BLOC DROITE : SIMULATION DE L'INTERFACE APPLICATION (CSS RAFFINÉ) */}
          <div className="lg:col-span-6 hidden lg:flex justify-center relative">
            
            {/* Boîte principale : Aperçu du Chat */}
            <div className="w-[420px] bg-white rounded-2xl shadow-2xl border border-sky-100 p-4 text-sky-800 rotate-1 transform hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 border-b border-sky-100 pb-3 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="text-xs text-sky-400 font-bold ml-2"># salon-entretien-camerwork</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">RH</div>
                  <div>
                    <p className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      Responsable Recrutement <span className="text-[10px] text-sky-400 font-normal">14:32</span>
                    </p>
                    <p className="text-xs text-sky-600 mt-0.5 bg-sky-50 p-2.5 rounded-xl rounded-tl-none border border-sky-100">
                      Bonjour ! Votre profil coche toutes nos cases en React & Spring Boot. Êtes-vous disponible pour un échange écrit ce jeudi ?
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start justify-end">
                  <div className="text-right">
                    <p className="text-xs font-bold text-sky-900 flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-sky-400 font-normal">14:35</span> Vous
                    </p>
                    <p className="text-xs text-white bg-sky-600 p-2.5 rounded-xl rounded-tr-none shadow-xs mt-0.5 text-left">
                      Absolument ! Mon CV est à jour. Très ravi de cette opportunité ! 🚀
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-sky-100 flex gap-2">
                <div className="flex-1 bg-sky-50 rounded-lg text-[11px] text-sky-400 p-2 border border-sky-200/60 font-medium">Écrire un message...</div>
                <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center"><Zap size={14} /></div>
              </div>
            </div>

            {/* Petite boîte flottante : Notification Score de Match */}
            <div className="absolute -bottom-6 -left-6 w-[220px] bg-sky-900/95 backdrop-blur-md text-white border border-white/10 rounded-2xl p-4 shadow-xl -rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-teal-500 rounded-md text-white">
                  <CheckCircle2 size={12} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Match Idéal Détecté</span>
              </div>
              <p className="text-xs font-bold text-white">Score : 92% Rentabilité</p>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-400 to-teal-400 h-full w-[92%]" />
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* 3. BANNIÈRE PARTENAIRES (ENTREPRISES ET ÉCOLES DU CAMEROUN) */}
      <footer className="bg-sky-100 border-t border-sky-200/60 py-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-4">
          Des organisations et institutions nous font confiance au Cameroun
        </p>
        
        {/* Liste défilante ou grille de faux partenaires locaux typiques pour donner du réalisme */}
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-50 grayscale hover:opacity-75 transition-opacity">
          <span className="font-black text-sky-700 tracking-tighter text-sm md:text-base">NEXUS TECH</span>
          <span className="font-bold text-sky-700 tracking-tight text-sm md:text-base flex items-center gap-1"><Briefcase size={14} /> AFRIK SOLUTIONS</span>
          <span className="font-extrabold text-sky-700 text-sm md:text-base">UY1 - ICT4D</span>
          <span className="font-medium text-sky-700 italic text-sm md:text-base">Cameroon Innovation Hub</span>
          <span className="font-mono text-sky-700 text-xs md:text-sm font-bold">&lt;SAHEL_DEV /&gt;</span>
        </div>
      </footer>

    </div>
  );
}
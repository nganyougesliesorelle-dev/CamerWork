import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowRight, Sparkles, CheckCircle2, MessageSquare, Briefcase, Zap } from 'lucide-react';
import { useLang } from '../composants/LangContext';
import { LanguageSwitcher } from '../composants/boutons';

export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useLang();

  return (
    <div className="min-h-screen bg-sky-50 font-sans antialiased text-sky-800 flex flex-col justify-between">
      
      {/* 1. HEADER / BARRE DE NAVIGATION */}
      <header className="bg-white/80 backdrop-blur-md border-b border-sky-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo CamerWork */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative w-10 h-10 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200/50 hover:scale-110 active:scale-95 transition-transform duration-200">
              <span className="font-black text-lg tracking-tighter text-white select-none leading-none">CW</span>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm"></div>
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
              Camer<span className="text-sky-900">Work</span>
            </span>
          </div>

          {/* Langue + Connexion à droite */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="icon" />
            <button onClick={toggleDarkMode} className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${darkMode ? 'bg-sky-100 text-sky-700' : 'text-sky-400 hover:text-sky-600'}`} title={darkMode ? 'Mode clair' : 'Mode nuit'}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="text-sm font-semibold text-sky-600 hover:text-sky-600 transition-colors"
            >
              {t('auth.connexion')}
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all active:scale-95 hidden sm:block"
            >
              {t('auth.essai_gratuit')}
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1 bg-gradient-to-b from-sky-950 to-sky-900 text-white py-12 lg:py-20 flex items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* BLOC GAUCHE */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-sky-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/5">
              <Sparkles size={12} className="animate-pulse text-sky-400" />
              {t('landing.badge')}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]">
              {t('landing.title1')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                {t('landing.title2')}
              </span>
            </h1>

            <p className="text-sky-300 text-sm sm:text-base font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <Trans i18nKey="landing.subtitle" components={{ 1: <span className="text-sky-300 font-semibold" /> }} />
            </p>

            {/* Bouton Google uniquement */}
            <div className="flex flex-col items-center gap-3 max-w-md mx-auto lg:mx-0 pt-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto bg-white hover:bg-sky-100 text-sky-900 text-xs font-black uppercase tracking-wider px-8 py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('landing.cta_google')}
              </button>
            </div>

            <p className="text-xs text-sky-400 font-medium text-center lg:text-left">
              {t('landing.footer_text')}
            </p>
          </div>

          {/* BLOC DROITE */}
          <div className="lg:col-span-6 hidden lg:flex justify-center relative">
            
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
                      Bonjour ! Votre profil coche toutes nos cases en React & Spring Boot.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start justify-end">
                  <div className="text-right">
                    <p className="text-xs font-bold text-sky-900 flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-sky-400 font-normal">14:35</span> Vous
                    </p>
                    <p className="text-xs text-white bg-sky-600 p-2.5 rounded-xl rounded-tr-none shadow-xs mt-0.5 text-left">
                      Absolument ! Mon CV est à jour. 🚀
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-sky-100 flex gap-2">
                <div className="flex-1 bg-sky-50 rounded-lg text-[11px] text-sky-400 p-2 border border-sky-200/60 font-medium">Écrire un message...</div>
                <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center"><Zap size={14} /></div>
              </div>
            </div>

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

      {/* 3. FOOTER */}
      <footer className="bg-sky-100 border-t border-sky-200/60 py-6 text-center">
        <span className="font-extrabold text-sky-700 text-sm">UY1 - ICT4D</span>
      </footer>

    </div>
  );
}

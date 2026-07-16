import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { messaging, db, auth } from './firebase/firebaseConfig';
import { onMessage } from 'firebase/messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { PhishingBanner } from './security/PhishingBanner';
import { LangProvider } from './composants/LangContext';
import { ThemeProvider } from './composants/ThemeContext';
import { usePresenceTracker } from './composants/OnlinePresence';
import { ErrorBoundary } from './composants/ErrorBoundary';

// ── Lazy-loaded pages ──────────────────────────────────────────
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then(m => ({ default: m.LandingPage }))
);
const Home = lazy(() => import('./pages/Home'));
const JobList = lazy(() =>
  import('./pages/joblist').then(m => ({ default: m.JobList }))
);
const JobDetails = lazy(() =>
  import('./pages/jobDetails').then(m => ({ default: m.JobDetails }))
);
const Profile = lazy(() =>
  import('./pages/Profile').then(m => ({ default: m.Profile }))
);
const DashboardRecruiter = lazy(() =>
  import('./pages/DashboardRecruiter').then(m => ({ default: m.DashboardRecruiter }))
);
const RecruiterPost = lazy(() =>
  import('./pages/RecruiterPost').then(m => ({ default: m.RecruiterPost }))
);
const Chat = lazy(() =>
  import('./pages/Chat').then(m => ({ default: m.Chat }))
);
const AtsCv = lazy(() =>
  import('./pages/AtsCv').then(m => ({ default: m.AtsCv }))
);
const InterviewSimulator = lazy(() =>
  import('./pages/InterviewSimulator').then(m => ({ default: m.InterviewSimulator }))
);
const CandidateDashboard = lazy(() =>
  import('./pages/CandidateDashboard').then(m => ({ default: m.CandidateDashboard }))
);
const Notifications = lazy(() =>
  import('./composants/Notifications').then(m => ({ default: m.Notifications }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
);
const FavoritesPage = lazy(() =>
  import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage }))
);
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard')
);

// ── Suspense fallback ──────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-sky-200 dark:border-gray-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" />
        </div>
        <span className="text-xs font-bold text-sky-400 dark:text-gray-500 uppercase tracking-widest">
          Chargement
        </span>
      </div>
    </div>
  );
}

function App() {
  const { t } = useTranslation();
  const [globalUser, setGlobalUser] = useState(null);
  const prevAppsRef = useRef({});

  usePresenceTracker(globalUser?.uid);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setGlobalUser(user));
    return () => unsub();
  }, []);

  // Écouteur global : changements de statut des candidatures (candidat)
  useEffect(() => {
    if (!globalUser) return;
    const q = query(
      collection(db, 'applications'),
      where('candidateId', '==', globalUser.uid),
      orderBy('appliedAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const prev = prevAppsRef.current[change.doc.id];
          if (prev && prev.status !== data.status) {
            if (data.status === 'accepted' || data.status === 'retenu') {
              const chatId = `${data.recruiterId || ''}_${data.candidateId}_${change.doc.id}`;
              toast.success(
                <div>
                  <strong>{t('notifications.application_accepted_title')}</strong>
                  <p className="text-xs mt-1">
                    {data.jobTitle} {t('common.at')} {data.company}
                  </p>
                  <button
                    onClick={() => (window.location.href = `/chat/${chatId}`)}
                    className="mt-2 px-3 py-1 bg-teal-500 text-white rounded-lg text-xs font-bold"
                  >
                    {t('chat.title')}
                  </button>
                </div>,
                { duration: 8000 }
              );
            } else if (data.status === 'rejected' || data.status === 'refusé') {
              toast.error(
                t('notifications.application_rejected_body', {
                  jobTitle: data.jobTitle,
                  company: data.company,
                }),
                { duration: 5000 }
              );
            }
          }
          prevAppsRef.current[change.doc.id] = data;
        } else if (change.type === 'added') {
          prevAppsRef.current[change.doc.id] = change.doc.data();
        }
      });
    });
    return () => unsub();
  }, [globalUser, t]);

  // Gestionnaire de notifications push en premier plan
  useEffect(() => {
    try {
      const unsubscribe = onMessage(messaging, payload => {
        const title = payload.notification?.title || 'CamerWork';
        const body = payload.notification?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/logo.png' });
        }
        toast.info(body || title, {
          description: t('notifications.new_notification'),
        });
      });
      return () => unsubscribe();
    } catch (_e) {
      // messaging non supporté
    }
  }, [t]);

  return (
    <LangProvider>
      <ThemeProvider>
        <Router>
          <PhishingBanner />
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{ style: { borderRadius: '1.2rem' } }}
          />

          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary showError={import.meta.env.DEV}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Home />} />
                <Route path="/offres" element={<JobList />} />
                <Route path="/offres/:id" element={<JobDetails />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="/profil/:id" element={<Profile />} />
                <Route path="/mon-profil" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chat/:chatId" element={<Chat />} />
                <Route path="/cv-generator" element={<AtsCv />} />
                <Route path="/interview-simulator" element={<InterviewSimulator />} />
                <Route path="/career-dashboard" element={<CandidateDashboard />} />
                <Route path="/DashboardRecruiter" element={<DashboardRecruiter />} />
                <Route path="/RecruiterPost" element={<RecruiterPost />} />
                <Route path="/favoris" element={<FavoritesPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/parametres" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </Router>
      </ThemeProvider>
    </LangProvider>
  );
}

export default App;

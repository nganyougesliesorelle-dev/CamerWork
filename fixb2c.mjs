import { readFileSync, writeFileSync } from 'fs';

// === Profile.jsx: Premium badge + view tracking ===
let p = readFileSync('C:/Users/USER/Documents/CamerWork/src/pages/Profile.jsx', 'utf8');

// Add premium badge after candidate role badge
p = p.replace(
  "{candidate.role === 'recruiter' ? t('profile.recruiter') : t('profile.candidate')}\n                </span>\n                {candidate.role === 'recruiter' && <KycBadge status={candidate.kycStatus || 'unverified'} isValidated={candidate.isValidated} />}",
  "{candidate.role === 'recruiter' ? t('profile.recruiter') : t('profile.candidate')}\n                </span>\n                {candidate.subscription === 'premium' && (\n                  <span className=\"px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm\">\n                    \u2B50 Premium\n                  </span>\n                )}\n                {candidate.role === 'recruiter' && <KycBadge status={candidate.kycStatus || 'unverified'} isValidated={candidate.isValidated} />}"
);

// Add profile view logging when someone else views the profile
const viewLogCode = `
      // Logger la vue du profil pour le candidat premium
      if (!isMyProfile && candidate?.subscription === 'premium' && user) {
        addDoc(collection(db, 'users', targetId, 'profileViews'), {
          viewerId: user.uid,
          viewerName: user.displayName || 'Anonyme',
          viewedAt: serverTimestamp(),
        }).catch(() => {});
      }`;
p = p.replace(
  'fetchProfile(targetId);',
  'fetchProfile(targetId);' + viewLogCode
);

// Add addDoc import if not present
if (!p.includes('addDoc')) {
  p = p.replace(
    "import { doc, getDoc, getDocs, updateDoc, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'; ",
    "import { doc, getDoc, getDocs, updateDoc, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'; "
  );
}

writeFileSync('C:/Users/USER/Documents/CamerWork/src/pages/Profile.jsx', p, 'utf8');
console.log('Profile.jsx: premium badge + view tracking');

// === DashboardRecruiter: sort premium applications first ===
let d = readFileSync('C:/Users/USER/Documents/CamerWork/src/pages/DashboardRecruiter.jsx', 'utf8');
d = d.replace(
  "setApplications(appsData.sort((a, b) => b.appliedAt?.seconds - a.appliedAt?.seconds));",
  "setApplications(appsData.sort((a, b) => {\n        if (a.premiumCandidate !== b.premiumCandidate) return a.premiumCandidate ? -1 : 1;\n        return b.appliedAt?.seconds - a.appliedAt?.seconds;\n      }));"
);
writeFileSync('C:/Users/USER/Documents/CamerWork/src/pages/DashboardRecruiter.jsx', d, 'utf8');
console.log('DashboardRecruiter: premium app priority');

// === RecruiterPost (applyToJob): add premiumCandidate flag ===
let auth = readFileSync('C:/Users/USER/Documents/CamerWork/src/firebase/authService.js', 'utf8');
auth = auth.replace(
  "status: \"pending\",\n      appliedAt: serverTimestamp(),",
  "status: \"pending\",\n      premiumCandidate: userData.subscription === 'premium' || false,\n      appliedAt: serverTimestamp(),"
);
writeFileSync('C:/Users/USER/Documents/CamerWork/src/firebase/authService.js', auth, 'utf8');
console.log('authService: premiumCandidate flag');

console.log('All done');

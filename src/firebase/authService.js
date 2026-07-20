let auth = null;
let db = null;
let storage = null;

try {
  ({ auth, db, storage } = await import('./firebaseConfig.js'));
} catch (_error) {
  // The pure helper used in tests does not require Firebase runtime.
}
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, collection, addDoc, serverTimestamp, updateDoc, deleteDoc, getDocs, query, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
let initiateLogin = async () => ({ success: false, error: 'Firebase runtime unavailable' });
let completeMfaChallenge = async () => ({ success: false, error: 'Firebase runtime unavailable' });
let isMfaError = () => false;

try {
  ({ initiateLogin, completeMfaChallenge, isMfaError } = await import('./mfaService.js'));
} catch (_error) {
  // The pure helper used in tests does not require Firebase runtime.
}

export const buildApplicationPayload = ({ job, user, userData, message = '', cvUrl = '', cvName = '', cvLabel = '', cvId = '' }) => ({
  jobId: job?.id,
  jobTitle: job?.title,
  company: job?.company,
  recruiterId: job?.recruiterId || null,
  candidateId: user?.uid,
  candidateName: userData?.displayName || userData?.name || user?.displayName || "Candidat",
  candidateEmail: user?.email,
  status: 'pending',
  message: message?.trim() || '',
  cvUrl,
  cvName,
  cvLabel,
  cvId,
  appliedAt: serverTimestamp(),
});

export const mergeCvLibraryEntries = (existingLibrary = [], newEntry) => {
  if (!newEntry) return Array.isArray(existingLibrary) ? existingLibrary : [];
  const normalizedExisting = Array.isArray(existingLibrary) ? existingLibrary.filter(Boolean) : [];
  const alreadyExists = normalizedExisting.some((entry) => entry?.id === newEntry.id || entry?.url === newEntry.url);
  if (alreadyExists) {
    return normalizedExisting;
  }
  return [...normalizedExisting, newEntry];
};

// Domaines gratuits — tout autre domaine est considéré professionnel
const FREE_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.fr', 'ymail.com',
  'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
  'aol.com', 'aol.fr', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me', 'mail.com', 'email.com',
  'gmx.com', 'gmx.fr', 'gmx.de', 'web.de', 'laposte.net',
  'orange.fr', 'wanadoo.fr', 'sfr.fr', 'free.fr',
  'yandex.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru',
  'inbox.com', 'zoho.com',
]);

const isProfessionalEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && !FREE_DOMAINS.has(domain);
};

/**
 * 1. INSCRIPTION + ENVOI DU MAIL DE CONFIRMATION (Champs additionnels inclus)
 */
export const registerUser = async (email, password, role, fullName, additionalFields = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 1. Mettre à jour le profil de l'utilisateur avec son nom
    await updateProfile(user, { displayName: fullName });

    // 2. ENVOI DU MAIL DE CONFIRMATION
    await sendEmailVerification(user);

    // 3. Création du document utilisateur dans Firestore avec les nouveaux champs du modèle
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: fullName,
      name: fullName, // Doublé ici pour éviter les erreurs de lecture (name vs displayName)
      email: email,
      role: role, 
      emailVerified: false, // Initialisé à faux tant qu'il n'a pas cliqué sur le lien
      onboardingCompleted: false,
      setupPending: true,
      createdAt: serverTimestamp(),
      
      // Extraction sécurisée des nouveaux paramètres optionnels du profil
      username: additionalFields.username || "",
      gender: additionalFields.gender || "",
      birthDate: additionalFields.birthDate || "",
      country: additionalFields.country || "Cameroun",
      location: additionalFields.location || "",
      // Champs recruteur
      niu: additionalFields.niu || "",
      company: additionalFields.company || "",
      creationDate: additionalFields.creationDate || "",
      isValidated: false,
      kycStatus: 'unverified',
      validationPriority: isProfessionalEmail(email) ? 'high' : 'standard',
      validationSteps: {
        step1_dgi: false,
        step2_email: isProfessionalEmail(email),
        step3_approved: false,
      }
    });

    return { success: true, user, role, msg: "Un e-mail de confirmation vous a été envoyé." };
  } catch (error) {
    console.error("Erreur Inscription:", error.code);
    let message = error.message;
    if (error.code === 'auth/email-already-in-use') message = "Cet e-mail est déjà utilisé.";
    return { success: false, error: message };
  }
};

/**
 * 2. CONNEXION (Vérifie si l'e-mail est validé avant de laisser entrer)
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Bloquer la connexion si l'e-mail n'est pas encore validé
    if (!user.emailVerified) {
      return { 
        success: false, 
        error: "Veuillez valider votre adresse e-mail en cliquant sur le lien envoyé dans votre boîte de réception avant de vous connecter." 
      };
    }
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const shouldMarkSetupPending = userData.onboardingCompleted === false && userData.setupPending !== true;
      // Mettre à jour le statut dans la base de données
      await updateDoc(doc(db, "users", user.uid), {
        emailVerified: true,
        setupPending: shouldMarkSetupPending ? true : (userData.setupPending ?? (userData.onboardingCompleted === false)),
      });
      return { success: true, user, role: userData.role };
    }
    return { success: false, error: "Profil utilisateur inexistant dans la base." };
  } catch (error) {
    if (isMfaError(error)) {
      return {
        success: false,
        mfaRequired: true,
        mfaResolver: null,
        error: 'Vérification en deux étapes requise.',
        firebaseError: error,
      };
    }
    console.error("Erreur Connexion:", error.code);
    return { success: false, error: "Email ou mot de passe incorrect." };
  }
};

/**
 * 2.B CONNEXION AVEC SUPPORT MFA COMPLET
 * Gère le flux : email/mdp → détection MFA → challenge TOTP → connexion finale.
 */
export const loginWithMfa = async (email, password, mfaCode, mfaResolver) => {
  if (mfaCode && mfaResolver) {
    const result = await completeMfaChallenge(mfaResolver, mfaCode);
    if (!result.success) return result;
    const user = result.user;
    if (!user.emailVerified) {
      return { success: false, error: "Veuillez valider votre adresse e-mail avant de vous connecter." };
    }
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const shouldMarkSetupPending = userData.onboardingCompleted === false && userData.setupPending !== true;
      await updateDoc(doc(db, "users", user.uid), {
        emailVerified: true,
        setupPending: shouldMarkSetupPending ? true : (userData.setupPending ?? (userData.onboardingCompleted === false)),
      });
      return { success: true, user, role: userData.role };
    }
    return { success: false, error: "Profil utilisateur inexistant dans la base." };
  }

  const result = await initiateLogin(email, password);
  if (result.success) {
    const user = result.user;
    if (!user.emailVerified) {
      return { success: false, error: "Veuillez valider votre adresse e-mail avant de vous connecter." };
    }
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const shouldMarkSetupPending = userData.onboardingCompleted === false && userData.setupPending !== true;
      await updateDoc(doc(db, "users", user.uid), {
        emailVerified: true,
        setupPending: shouldMarkSetupPending ? true : (userData.setupPending ?? (userData.onboardingCompleted === false)),
      });
      return { success: true, user, role: userData.role };
    }
    return { success: false, error: "Profil utilisateur inexistant dans la base." };
  }

  return {
    success: false,
    mfaRequired: result.mfaRequired || false,
    mfaResolver: result.resolver || null,
    error: result.error || 'Email ou mot de passe incorrect.',
  };
};

/**
 * 3. RÉINITIALISATION MOT DE PASSE
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error("Erreur Reset:", error.code);
    let message = "Impossible d'envoyer l'email.";
    if (error.code === 'auth/user-not-found') message = "Aucun compte trouvé avec cet email.";
    return { success: false, error: message };
  }
};

/**
 * 4. POSTULER
 */
export const applyToJob = async ({ job, user, userData, message = '', cvUrl = '', cvName = '', cvLabel = '', cvId = '' }) => {
  try {
    const payload = buildApplicationPayload({ job, user, userData, message, cvUrl, cvName, cvLabel, cvId });
    await addDoc(collection(db, "applications"), payload);
    return { success: true };
  } catch (error) {
    console.error("Erreur Application:", error);
    return { success: false, error: "Une erreur est survenue lors de l'envoi." };
  }
};

/**
 * 4.A ANNULER UNE CANDIDATURE (côté candidat)
 */
export const cancelApplication = async (jobId, userId) => {
  try {
    const q = query(
      collection(db, "applications"),
      where("jobId", "==", jobId),
      where("candidateId", "==", userId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return { success: false, error: "Candidature introuvable." };

    const batch = [];
    snapshot.forEach(docSnap => {
      batch.push(deleteDoc(doc(db, "applications", docSnap.id)));
    });
    await Promise.all(batch);
    return { success: true };
  } catch (error) {
    console.error("Erreur annulation:", error);
    return { success: false, error: error.message };
  }
};

/**
 * 4.B METTRE À JOUR LE STATUT, NOTIFIER ET CRÉER UN CHAT AUTOMATIQUE
 */
export const updateApplicationStatus = async (applicationId, candidateId, jobTitle, companyName, newStatus, recruiterId) => {
  try {
    let standardizedStatus = newStatus;
    if (newStatus === "retenu") standardizedStatus = "accepted";
    if (newStatus === "refusé") standardizedStatus = "rejected";
    console.debug('[updateApplicationStatus] payload:', { applicationId, candidateId, jobTitle, companyName, standardizedStatus, recruiterId });

    await updateDoc(doc(db, "applications", applicationId), {
      status: standardizedStatus
    });

    let titleNotification = "";
    let messageNotification = "";
    const warnings = [];

    if (standardizedStatus === "accepted") {
      titleNotification = "Candidature retenue ! 🎉";
      messageNotification = `Félicitations ! L'entreprise ${companyName} a retenu ton profil pour le poste de : ${jobTitle}. Un salon de discussion a été ouvert pour votre pré-entretien.`;

      const chatId = `${recruiterId}_${candidateId}_${applicationId}`;
      try {
        await setDoc(doc(db, "chats", chatId), {
          chatId: chatId,
          recruiterId: recruiterId,
          candidateId: candidateId,
          jobTitle: jobTitle,
          companyName: companyName,
          createdAt: serverTimestamp(),
          lastMessage: "Salon de discussion ouvert pour le pré-entretien.",
          lastMessageAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('[updateApplicationStatus] Chat creation failed:', error);
        warnings.push("Le chat n'a pas pu être créé.");
      }
    } else if (standardizedStatus === "rejected") {
      titleNotification = "Mise à jour de candidature";
      messageNotification = `L'entreprise ${companyName} a clôturé l'étude des profils pour le poste de : ${jobTitle}.`;
    }

    if (titleNotification) {
      try {
        await addDoc(collection(db, "notifications"), {
          userId: candidateId,
          title: titleNotification,
          message: messageNotification,
          type: "status_update",
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('[updateApplicationStatus] Notification creation failed:', error);
        warnings.push("La notification n'a pas pu être envoyée.");
      }
    }

    return { success: true, warnings: warnings.join(' ') };
  } catch (error) {
    console.error("Erreur Changement Statut / Chat:", error.code || error.message || error);
    return { success: false, error: error.message || String(error), code: error.code || null };
  }
};

/**
 * 5. GESTION DES CV (Upload vers Storage)
 */
export const uploadCV = async (file, userId, options = {}) => {
  try {
    const storageRef = ref(storage, `cvs/${userId}_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const label = String(options.label || file.name.replace(/\.[^.]+$/, '') || 'CV').trim();
    const entryId = `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id: entryId,
      url: downloadURL,
      name: file.name,
      label,
      uploadedAt: new Date().toISOString(),
    };

    const userSnap = await getDoc(doc(db, "users", userId));
    const currentUserData = userSnap.exists() ? userSnap.data() : {};
    const existingLibrary = Array.isArray(currentUserData.cvLibrary) ? currentUserData.cvLibrary : [];
    const nextLibrary = mergeCvLibraryEntries(existingLibrary, entry);
    const primaryCvId = options.makePrimary || !existingLibrary.length ? entryId : currentUserData.primaryCvId || existingLibrary[0]?.id || entryId;

    await updateDoc(doc(db, "users", userId), {
      cvUrl: downloadURL,
      cvName: file.name,
      cvLabel: label,
      cvId: entryId,
      primaryCvId,
      cvLibrary: nextLibrary,
    });

    return { success: true, url: downloadURL, name: file.name, label, id: entryId, entry, cvLibrary: nextLibrary, primaryCvId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * 6. GESTION DES OFFRES (Modifier / Supprimer)
 */
export const updateJobOffer = async (jobId, updatedData) => {
  try {
    await updateDoc(doc(db, "jobs", jobId), updatedData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteJobOffer = async (jobId) => {
  try {
    await deleteDoc(doc(db, "jobs", jobId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * 7. CHAT INTERNE (Envoi de message)
 */
export const sendMessage = async (chatId, senderId, text) => {
  try {
    await addDoc(collection(db, "messages"), {
      chatId,
      senderId,
      text,
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (_error) {
    return { success: false };
  }
};

/**
 * ==========================================
 * 🔥 MOTEUR DE RECOMMANDATION DYNAMIQUE (CAMERWORK)
 * ==========================================
 */

export const analyzeOpportunity = (candidate, job) => {
  const candidateSkills = (candidate.skills || []).map(s => s.trim().toLowerCase());
  const jobSkills = (job.skills || []).map(s => s.trim().toLowerCase());

  let profitabilityScore = 0;
  const salaryValue = job.salary ? Number(job.salary.toString().replace(/\s/g, '')) : 0;
  
  if (salaryValue > 0) {
    if (salaryValue >= 200000) profitabilityScore += 60; 
    else if (salaryValue >= 100000) profitabilityScore += 40;
    else profitabilityScore += 20;
  }
  
  if (job.type === "CDI") profitabilityScore += 40;
  if (job.type === "CDD" || job.type === "Freelance") profitabilityScore += 25;
  if (job.type === "Stage") profitabilityScore += 15;

  if (profitabilityScore > 100) profitabilityScore = 100;

  const missingSkills = (job.skills || []).filter(
    skill => !candidateSkills.includes(skill.trim().toLowerCase())
  );
  
  const matchedSkillsCount = jobSkills.length - missingSkills.length;
  const technicalMatchPercent = jobSkills.length > 0 
    ? Math.round((matchedSkillsCount / jobSkills.length) * 100) 
    : 100;

  const sameCity = candidate.city?.trim().toLowerCase() === job.city?.trim().toLowerCase();

  const globalScore = Math.round(
    (technicalMatchPercent * 0.5) + (profitabilityScore * 0.4) + (sameCity ? 10 : 0)
  );

  const shouldNotify = globalScore >= 50 || profitabilityScore >= 75;

  return {
    globalScore,
    profitabilityScore,
    technicalMatchPercent,
    missingSkills,
    shouldNotify
  };
};

export const dispatchJobOpportunities = async (newJob) => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const candidates = [];
    
    usersSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.role === "candidate" || data.role === "student" || data.role === "candidat") {
        candidates.push({ id: docSnap.id, ...data });
      }
    });

    for (const candidate of candidates) {
      const analysis = analyzeOpportunity(candidate, newJob);

      if (analysis.shouldNotify) {
        let pushMessage = "";
        
        if (analysis.missingSkills.length > 0) {
          pushMessage = `Une opportunité à haute rentabilité financière (${newJob.salary ? newJob.salary + ' FCFA' : 'Attractif'}) est disponible chez ${newJob.company} ! Il te manque les compétences [ ${analysis.missingSkills.join(", ")} ] pour valider ton match. Mets ton CV à niveau pour postuler !`;
        } else {
          pushMessage = `L'offre idéale vient d'être publiée par ${newJob.company} (${newJob.title}). Ton profil coche toutes les cases avec un score de rentabilité optimal. Postule vite !`;
        }

        await addDoc(collection(db, "notifications"), {
          userId: candidate.id,
          title: "Nouvelle opportunité de carrière ! 🚀",
          message: pushMessage,
          type: "opportunity_boost",
          jobId: newJob.id,
          globalScore: analysis.globalScore,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error("Erreur lors de la distribution proactive des offres:", error);
  }
};

/**
 * Connexion via Google OAuth (popup).
 *
 * Flux :
 *   1. Ouvre la popup Google Sign-In
 *   2. Si premier login → crée le document Firestore avec données Google
 *   3. Si compte existant → met à jour la dernière connexion
 *   4. Retourne l'utilisateur et son rôle
 *
 * @returns {Promise<{success:boolean, user?:object, role?:string, isNew?:boolean, error?:string}>}
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const newUserData = {
        uid: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        emailVerified: user.emailVerified,
        photoURL: user.photoURL || '',
        avatarSource: user.photoURL ? 'google' : 'none',
        role: 'candidate',
        provider: 'google',
        onboardingCompleted: false,
        setupPending: true,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      await setDoc(userDocRef, newUserData);
      return { success: true, user, role: 'candidate', isNew: true, userData: newUserData };
    }

    // Compte existant — mettre à jour la dernière connexion
    const existingData = userDoc.data();
    const nextAvatarSource = existingData.avatarSource === 'custom' ? 'custom' : 'google';
    const nextPhotoURL = existingData.avatarSource === 'custom' && existingData.photoURL
      ? existingData.photoURL
      : (user.photoURL || existingData.photoURL || '');

    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
      emailVerified: user.emailVerified,
      photoURL: nextPhotoURL,
      avatarSource: nextAvatarSource,
      displayName: existingData.displayName || user.displayName || user.email.split('@')[0],
      name: existingData.name || user.displayName || user.email.split('@')[0],
      setupPending: existingData.setupPending ?? (existingData.onboardingCompleted === false),
    });

    return { 
      success: true, 
      user, 
      role: existingData.role || 'candidate',
      isNew: false,
      userData: existingData,
      needsProfileSetup: existingData.onboardingCompleted === false
    };
  } catch (error) {
    console.error("Erreur Google Sign-In:", error);

    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Fenêtre de connexion fermée.' };
    }
    if (error.code === 'auth/account-exists-with-different-credential') {
      return { 
        success: false, 
        error: 'Un compte existe déjà avec cet email. Connectez-vous avec votre mot de passe.' 
      };
    }

    return { success: false, error: error.message || 'Erreur de connexion Google.' };
  }
};
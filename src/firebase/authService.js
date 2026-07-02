import { auth, db, storage } from "./firebaseConfig"; // Ajout de storage
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification // AJOUTÉ : Requis pour envoyer le mail de confirmation
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, collection, addDoc, serverTimestamp, updateDoc, deleteDoc, getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Ajout pour les fichiers

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
      createdAt: serverTimestamp(),
      
      // Extraction sécurisée des nouveaux paramètres optionnels du profil
      username: additionalFields.username || "",
      gender: additionalFields.gender || "",
      birthDate: additionalFields.birthDate || "",
      country: additionalFields.country || "Cameroun",
      location: additionalFields.location || ""
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
      // Mettre à jour le statut dans la base de données
      await updateDoc(doc(db, "users", user.uid), { emailVerified: true });
      return { success: true, user, role: userDoc.data().role };
    }
    return { success: false, error: "Profil utilisateur inexistant dans la base." };
  } catch (error) {
    console.error("Erreur Connexion:", error.code);
    return { success: false, error: "Email ou mot de passe incorrect." };
  }
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
export const applyToJob = async (job, user) => {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    await addDoc(collection(db, "applications"), {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      recruiterId: job.recruiterId || null,
      candidateId: user.uid,
      candidateName: userData.displayName || userData.name || user.displayName || "Candidat",
      candidateEmail: user.email,
      status: "pending",
      appliedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur Application:", error);
    return { success: false, error: "Une erreur est survenue lors de l'envoi." };
  }
};

/**
 * 4.B METTRE À POUR LE STATUT, NOTIFIER ET CRÉER UN CHAT AUTOMATIQUE
 */
export const updateApplicationStatus = async (applicationId, candidateId, jobTitle, companyName, newStatus, recruiterId) => {
  try {
    let standardizedStatus = newStatus;
    if (newStatus === "retenu") standardizedStatus = "accepted";
    if (newStatus === "refusé") standardizedStatus = "rejected";

    await updateDoc(doc(db, "applications", applicationId), {
      status: standardizedStatus
    });

    let titleNotification = "";
    let messageNotification = "";

    if (standardizedStatus === "accepted") {
      titleNotification = "Candidature retenue ! 🎉";
      messageNotification = `Félicitations ! L'entreprise ${companyName} a retenu ton profil pour le poste de : ${jobTitle}. Un salon de discussion a été ouvert pour votre pré-entretien.`;

      const chatId = `${recruiterId}_${candidateId}_${applicationId}`;
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
    } else if (standardizedStatus === "rejected") {
      titleNotification = "Mise à jour de candidature";
      messageNotification = `L'entreprise ${companyName} a clôturé l'étude des profils pour le poste de : ${jobTitle}.`;
    }

    if (titleNotification) {
      await addDoc(collection(db, "notifications"), {
        userId: candidateId,
        title: titleNotification,
        message: messageNotification,
        type: "status_update",
        read: false,
        createdAt: serverTimestamp()
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Erreur Changement Statut / Chat:", error);
    return { success: false, error: error.message };
  }
};

/**
 * 5. GESTION DES CV (Upload vers Storage)
 */
export const uploadCV = async (file, userId) => {
  try {
    const storageRef = ref(storage, `cvs/${userId}_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    await updateDoc(doc(db, "users", userId), {
      cvUrl: downloadURL,
      cvName: file.name
    });

    return { success: true, url: downloadURL };
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
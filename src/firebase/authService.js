import { auth, db, storage } from "./firebaseConfig"; // Ajout de storage
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from "firebase/auth";
import { 
  doc, setDoc, getDoc, collection, addDoc, serverTimestamp, updateDoc, deleteDoc 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Ajout pour les fichiers

/**
 * 1. INSCRIPTION
 */
export const registerUser = async (email, password, role, fullName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: fullName });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: fullName,
      name: fullName, // Doublé ici pour éviter les erreurs de lecture (name vs displayName)
      email: email,
      role: role, 
      createdAt: serverTimestamp(),
    });

    return { success: true, user, role };
  } catch (error) {
    console.error("Erreur Inscription:", error.code);
    return { success: false, error: error.message };
  }
};

/**
 * 2. CONNEXION
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
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
 * 4.B METTRE À JOUR LE STATUT, NOTIFIER ET CRÉER UN CHAT AUTOMATIQUE
 * Appelé quand le recruteur clique sur "Retenir" ou "Refuser"
 */
export const updateApplicationStatus = async (applicationId, candidateId, jobTitle, companyName, newStatus, recruiterId) => {
  try {
    // 1. Mettre à jour le statut dans la collection applications
    await updateDoc(doc(db, "applications", applicationId), {
      status: newStatus
    });

    // 2. Créer les textes de notification personnalisés et le chat automatique
    let titleNotification = "";
    let messageNotification = "";

    if (newStatus === "accepted") {
      titleNotification = "Candidature retenue ! 🎉";
      messageNotification = `Félicitations ! L'entreprise ${companyName} a retenu ton profil pour le poste de : ${jobTitle}. Un salon de discussion a été ouvert pour votre pré-entretien.`;

      // CRÉATION DU SALON DE CHAT AUTOMATIQUE
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
    } else if (newStatus === "rejected") {
      titleNotification = "Mise à jour de candidature";
      messageNotification = `L'entreprise ${companyName} a clôturé l'étude des profils pour le poste de : ${jobTitle}.`;
    }

    // 3. Envoyer la notification directement à l'étudiant
    if (titleNotification) {
      await addDoc(collection(db, "notifications"), {
        userId: candidateId, // L'étudiant reçoit le signal
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
  } catch (error) {
    return { success: false };
  }
};
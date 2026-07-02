/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  fr: {
    langLabel: 'Langue',
    connexion: 'Connexion',
    creerCompte: 'Créer un compte',
    heureuxRevoir: 'Heureux de vous revoir sur CamerWork',
    remplirInfos: 'Remplissez vos informations pour commencer',
    candidat: 'Candidat',
    recruteur: 'Recruteur',
    nom: 'Nom',
    prenoms: 'Prénoms',
    pays: 'Pays',
    email: 'E-mail',
    telephone: 'Téléphone',
    sexe: 'Sexe',
    masculin: 'Masculin',
    feminin: 'Féminin',
    dateNaissance: 'Date de naissance',
    nomEntreprise: "Nom de l'entreprise",
    emailEntreprise: "Email de l'entreprise",
    dateCreation: 'Date de création',
    motDePasse: 'Mot de passe',
    oublie: 'Oublié ?',
    accepterTermes: "Accepter les termes et conditions",
    login: 'Se connecter',
    commencerAventure: "Commencer l'aventure",
    nouveauCamerWork: 'Nouveau sur CamerWork ? Créer un compte',
    dejaCompte: 'Déjà un compte ? Se connecter',
    retour: 'Retour',
    essaiGratuit: 'Essai gratuit',
    chargerProfil: 'Charger mon profil',
    chargerProfilPourCV: 'Chargez votre profil pour pré-remplir le CV',
    charger: 'Chargement...',
    confirmerEmail: 'Confirmez votre e-mail',
    lienActivation: "Un lien d'activation a été envoyé à l'adresse",
    validerEmail: "J'ai validé mon e-mail",
    verification: 'Vérification...',
    profilCharge: 'Profil chargé !',
    connectezVous: "Connectez-vous d'abord.",
    cv: 'CV',
    consulter: 'Consulter',
    aucunCV: 'Aucun CV',
    uploader: 'Uploader',
    envoi: 'Envoi...',
    localisation: 'Localisation',
    selectVille: 'Sélectionner une ville',
    nonRenseigne: 'Non renseigné',
    nonRenseignee: 'Non renseignée',
    deconnexion: 'Déconnexion',
    profilIntrouvable: 'Profil introuvable',
    retourOffres: 'Retour aux offres',
    erreurChargement: 'Erreur de chargement',
    erreurVerification: 'Erreur lors de la vérification.',
    validerEmailAvant: 'Veuillez valider votre adresse e-mail avant de vous connecter.',
    contenuRevoir: 'Content de vous revoir !',
    emailConfirmation: 'Un e-mail de confirmation vous a été envoyé !',
    completerChamps: 'Veuillez remplir tous les champs.',
    mdp6caracteres: 'Le mot de passe doit faire au moins 6 caractères.',
    accepterTermesError: "Veuillez accepter les termes et conditions.",
    nomValide: 'Veuillez entrer un nom valide.',
  },
  en: {
    langLabel: 'Language',
    connexion: 'Login',
    creerCompte: 'Create Account',
    heureuxRevoir: 'Welcome back to CamerWork',
    remplirInfos: 'Fill in your information to get started',
    candidat: 'Candidate',
    recruteur: 'Recruiter',
    nom: 'Name',
    prenoms: 'First Name',
    pays: 'Country',
    email: 'Email',
    telephone: 'Phone',
    sexe: 'Gender',
    masculin: 'Male',
    feminin: 'Female',
    dateNaissance: 'Date of Birth',
    nomEntreprise: 'Company Name',
    emailEntreprise: 'Company Email',
    dateCreation: 'Creation Date',
    motDePasse: 'Password',
    oublie: 'Forgot?',
    accepterTermes: 'Agree with Terms & Conditions',
    login: 'Login',
    commencerAventure: 'Get Started',
    nouveauCamerWork: 'New to CamerWork? Create an account',
    dejaCompte: 'Already have an account? Log in',
    retour: 'Back',
    essaiGratuit: 'Free Trial',
    chargerProfil: 'Load My Profile',
    chargerProfilPourCV: 'Load your profile to pre-fill the CV',
    charger: 'Loading...',
    confirmerEmail: 'Confirm your email',
    lienActivation: 'An activation link has been sent to',
    validerEmail: 'I verified my email',
    verification: 'Verifying...',
    profilCharge: 'Profile loaded!',
    connectezVous: 'Please log in first.',
    cv: 'CV',
    consulter: 'View',
    aucunCV: 'No CV',
    uploader: 'Upload',
    envoi: 'Sending...',
    localisation: 'Location',
    selectVille: 'Select a city',
    nonRenseigne: 'Not provided',
    nonRenseignee: 'Not provided',
    deconnexion: 'Logout',
    profilIntrouvable: 'Profile not found',
    retourOffres: 'Back to offers',
    erreurChargement: 'Loading error',
    erreurVerification: 'Verification error.',
    validerEmailAvant: 'Please verify your email before logging in.',
    contenuRevoir: 'Welcome back!',
    emailConfirmation: 'A confirmation email has been sent!',
    completerChamps: 'Please fill in all fields.',
    mdp6caracteres: 'Password must be at least 6 characters.',
    accepterTermesError: 'Please accept the terms and conditions.',
    nomValide: 'Please enter a valid name.',
  }
};

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('camerwork-lang') || 'fr');

  useEffect(() => {
    localStorage.setItem('camerwork-lang', lang);
  }, [lang]);

  const t = (key) => translations[lang]?.[key] || key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

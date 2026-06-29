import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, MapPin, Link as LinkIcon, Save, ArrowLeft, Plus, X, Upload, FileText, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth'; 
import { toast } from 'sonner';
import { uploadCV } from '../firebase/authService'; 
import { requestNotificationPermission } from '../firebase/notificationService';

// Liste standardisée des villes pour un matching parfait
const CAMEROON_CITIES = [
  "Yaoundé", "Douala", "Garoua", "Maroua", "Bafoussam", 
  "Bamenda", "Ngaoundéré", "Buea", "Bertoua", "Ebolowa", 
  "Kribi", "Limbe", "Dschang", "Foumban"
];

const CustomBadge = ({ children, className }) => (
  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${className}`}>
    {children}
  </span>
);

export function Profile() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [applications, setApplications] = useState([]); 
  const [uploading, setUploading] = useState(false); 

  const isMyProfile = !id || id === auth.currentUser?.uid;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const targetId = id || user?.uid;
      if (!targetId) {
        setLoading(false);
        return;
      }
      fetchProfile(targetId);
      
      // DEBUT DES MODIFICATIONS : Déclenchement automatique de la demande de permission
      if (user) {
        requestNotificationPermission(user.uid);
      }
      // FIN DES MODIFICATIONS

      // Si c'est mon profil, on charge l'historique sans bloquer sur une variante de string du rôle
      if (isMyProfile) {
        const unsubscribeHistory = fetchHistory(targetId);
        return () => {
          if (unsubscribeHistory) unsubscribeHistory();
        };
      }
    });

    const fetchProfile = async (targetId) => {
      try {
        const docRef = doc(db, "users", targetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCandidate(docSnap.data());
        }
      } catch (error) {
        console.error("Erreur profil:", error);
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    // Fonction pour récupérer l'historique en temps réel avec notifications de statut
    const fetchHistory = (uid) => {
      const q = query(
        collection(db, "applications"),
        where("candidateId", "==", uid),
        orderBy("appliedAt", "desc")
      );

      let isInitialLoad = true; 

      return onSnapshot(q, (snapshot) => {
        const updatedApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Déclencheur d'alertes en temps réel lors d'une modification par le recruteur
        if (!isInitialLoad) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              const appData = change.doc.data();
              
              // HARMONISATION : Synchronisation avec "accepted" et "rejected" d'authService
              if (appData.status === "accepted" || appData.status === "retenu") {
                toast.success(`🎉 Félicitations ! Votre candidature pour "${appData.jobTitle}" chez ${appData.company} a été retenue !`, {
                  duration: 5000
                });
              } else if (appData.status === "rejected" || appData.status === "refusé") {
                toast.error(`💼 Des nouvelles pour "${appData.jobTitle}" (${appData.company}) : Votre candidature n'a pas été retenue.`, {
                  duration: 5000
                });
              }
            }
          });
        }

        setApplications(updatedApps);
        isInitialLoad = false; 
      }, (err) => {
        console.error("Erreur historique applications:", err);
      });
    };

    return () => unsubscribe();
  }, [id, isMyProfile]);

  const handleSave = async () => {
    if (!auth.currentUser) return toast.error("Vous devez être connecté");
    
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, {
        summary: candidate.summary || "",
        phone: candidate.phone || "",
        skills: candidate.skills || [],
        location: candidate.location || "",
        cvUrl: candidate.cvUrl || "" 
      });
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès !');
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Seuls les fichiers PDF sont acceptés");

    setUploading(true);
    const result = await uploadCV(file, auth.currentUser.uid);
    setUploading(false);

    if (result.success) {
      setCandidate({ ...candidate, cvUrl: result.url, cvName: file.name });
      toast.success("CV mis en ligne avec succès !");
    } else {
      toast.error("Erreur lors de l'envoi du CV");
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !candidate.skills?.includes(newSkill.trim())) {
      setCandidate({
        ...candidate, 
        skills: [...(candidate.skills || []), newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setCandidate({
      ...candidate,
      skills: candidate.skills.filter(s => s !== skillToRemove)
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!candidate) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <h2 className="text-2xl font-black text-slate-800 mb-2">Profil introuvable</h2>
      <button onClick={() => navigate('/offres')} className="bg-blue-700 text-white px-8 py-3 rounded-2xl font-black mt-4 shadow-lg">
        Retour aux offres
      </button>
    </div>
  );

  // Vérification de rôle inclusive
  const isCandidateUser = candidate.role === 'candidate' || candidate.role === 'candidat' || candidate.role === 'student';

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Banner */}
      <div className={`h-48 w-full flex items-start p-6 ${candidate.role === 'recruiter' ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900'}`}>
         <button 
            onClick={() => navigate(-1)} 
            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md transition-all"
         >
            <ArrowLeft size={20} />
         </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-20">
        {/* Carte Principale */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100 p-8 mb-6 relative">
          <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
            
            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-4xl border-8 border-white shadow-xl font-black uppercase">
                {(candidate.fullName || candidate.displayName || "U").charAt(0)}
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tighter">
                        {candidate.fullName || candidate.displayName}
                    </h1>
                    <CustomBadge className="mt-2 bg-blue-50 text-blue-700 border-blue-100 inline-block">
                        {candidate.role === 'recruiter' ? '🏢 Recruteur' : '🎓 Candidat'}
                    </CustomBadge>
                </div>
                
                {isMyProfile && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-6 py-3 rounded-2xl font-black transition-all text-sm ${isEditing ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {isEditing ? 'Annuler' : 'Modifier le profil'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-600 truncate">{candidate.email}</span>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-transparent">
                  <Phone className="w-5 h-5 text-blue-600" />
                  {isEditing ? (
                    <input 
                       type="text"
                       value={candidate.phone || ''} 
                       onChange={(e) => setCandidate({...candidate, phone: e.target.value})}
                       className="bg-white border border-slate-200 px-3 py-1 rounded-lg outline-none text-sm font-bold w-full"
                       placeholder="Ex: 690 00 00 00"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-600">{candidate.phone || "Téléphone non renseigné"}</span>
                  )}
                </div>

                {/* Localisation standardisée par liste déroulante */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-transparent">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  {isEditing ? (
                    <select 
                       value={candidate.location || ''} 
                       onChange={(e) => setCandidate({...candidate, location: e.target.value})}
                       className="bg-white border border-slate-200 px-3 py-1 rounded-lg outline-none text-sm font-bold w-full cursor-pointer"
                    >
                      <option value="">Sélectionner une ville</option>
                      {CAMEROON_CITIES.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-slate-600">{candidate.location || "Non renseignée"}</span>
                  )}
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-transparent">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {isEditing ? (
                    <label className="cursor-pointer group flex items-center gap-2">
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                      <span className="text-sm font-black text-blue-600 group-hover:underline">
                        {uploading ? "Envoi..." : (candidate.cvUrl ? "Changer le CV" : "Uploader mon CV")}
                      </span>
                      <Upload size={14} className="text-blue-600" />
                    </label>
                  ) : (
                    candidate.cvUrl ? (
                      <a href={candidate.cvUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">
                        Consulter mon CV <LinkIcon size={14} />
                      </a>
                    ) : <span className="text-sm font-bold text-slate-400 italic">Aucun CV envoyé</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Bio / Description */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 mb-6">
          <h2 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
             <Briefcase className="w-5 h-5 text-blue-600" /> 
             {candidate.role === 'recruiter' ? "À propos de l'entreprise" : "Mon Parcours"}
          </h2>
          {isEditing ? (
            <textarea
              value={candidate.summary || ''}
              onChange={(e) => setCandidate({...candidate, summary: e.target.value})}
              rows={4}
              className="w-full px-6 py-4 border-2 border-slate-50 rounded-3xl text-slate-700 focus:border-blue-600 outline-none resize-none bg-slate-50 font-medium transition-all"
              placeholder="Décrivez votre expérience ou votre entreprise..."
            />
          ) : (
            <p className="text-slate-600 leading-relaxed font-medium text-lg italic">
              "{candidate.summary || "Aucune description pour le moment."}"
            </p>
          )}
        </div>

        {/* Section Compétences */}
        {!isCandidateUser && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 mb-6">
            <h2 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
               Compétences & Expertise
            </h2>
            <div className="flex flex-wrap gap-3">
              {(candidate.skills || []).map((skill, index) => (
                <div key={index} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-black border border-blue-100">
                  {skill}
                  {isEditing && (
                    <button onClick={() => removeSkill(skill)} className="hover:text-red-500">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={newSkill} 
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Ajouter..."
                    className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm outline-none focus:border-blue-600 w-32"
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <button onClick={addSkill} className="p-2 bg-blue-600 text-white rounded-xl">
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historique des Candidatures */}
        {isMyProfile && isCandidateUser && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
            <h2 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
               <Clock className="w-5 h-5 text-blue-600" /> Historique de mes postulations
            </h2>
            <div className="space-y-4">
              {applications.length === 0 ? (
                <p className="text-slate-400 text-center py-4 font-medium italic">Aucune candidature pour le moment.</p>
              ) : (
                applications.map(app => {
                  const isAccepted = app.status === 'accepted' || app.status === 'retenu';
                  const isRejected = app.status === 'rejected' || app.status === 'refusé';
                  const chatId = `${app.recruiterId}_${app.candidateId}_${app.id}`;

                  return (
                    <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                      <div>
                        <h4 className="font-black text-slate-800 uppercase text-sm tracking-tighter">{app.jobTitle}</h4>
                        <p className="text-xs text-slate-500 font-bold uppercase">{app.company}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {/* Bouton Chat d'entretien actif UNIQUEMENT si accepté */}
                        {isAccepted && (
                          <button
                            onClick={() => navigate(`/chat/${chatId}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-blue-600/10"
                          >
                            <MessageSquare size={12} /> Entretien
                          </button>
                        )}

                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${
                          isAccepted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          isRejected ? 'bg-red-50 text-red-600 border-red-100' : 
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {isAccepted ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : <Clock size={12} />}
                          {isAccepted ? 'retenu' : isRejected ? 'refusé' : 'en attente'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Dashboard Shortcut Recruteur */}
        {isMyProfile && candidate.role === 'recruiter' && (
            <div className="mt-8 p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="font-black text-2xl tracking-tighter">Espace Recrutement</h3>
                    <p className="text-slate-400 font-medium">Gérez vos annonces et trouvez des talents.</p>
                </div>
                <button 
                    onClick={() => navigate('/DashboardRecruiter')}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                >
                    Tableau de bord
                </button>
            </div>
        )}
      </div>

      {/* Bouton Sauvegarder Fixe */}
      {isEditing && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 z-50">
          <button
            onClick={handleSave}
            className="w-full bg-blue-700 text-white py-5 rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-3 hover:bg-blue-800 transition-all scale-105"
          >
            <Save size={20} /> Enregistrer les modifications
          </button>
        </div>
      )}
    </div>
  );
}
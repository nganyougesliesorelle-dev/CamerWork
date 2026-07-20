/**
 * favoritesService.js — Gestion des favoris/emplois sauvegardés (style Indeed).
 *
 * Permet aux utilisateurs de sauvegarder des offres pour les consulter plus tard.
 * Un favori est un document dans la collection "favorites" avec :
 *   - userId, jobId, jobTitle, company, city, type, salary, savedAt
 *
 * Usage :
 *   import { toggleFavorite, isFavorite, getFavorites, removeFavorite } from '../firebase/favoritesService';
 *
 *   await toggleFavorite(userId, job);
 *   const favs = await getFavorites(userId);
 */

import { db, auth } from './firebaseConfig';
import {
  collection, doc, setDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';

const FAVORITES_COLLECTION = 'favorites';

/**
 * Bascule l'état favori d'une offre : ajoute si absent, retire si présent.
 * @param {string} userId — UID de l'utilisateur
 * @param {Object} job — Données de l'offre { id, title, company, city, type, salary, ... }
 * @returns {Promise<{ saved: boolean, error?: string }>}
 */
export async function toggleFavorite(userId, job) {
  if (!job?.id) {
    return { saved: false, error: 'Données manquantes.' };
  }

  try {
    const uid = auth.currentUser?.uid || userId || null;
    if (!uid) return { saved: false, error: 'Utilisateur non authentifié.' };
    const favId = `${uid}_${job.id}`;
    const favRef = doc(db, FAVORITES_COLLECTION, favId);
    try { console.debug('[favoritesService] toggle start', { favId, uid, dbProject: db?.app?.options?.projectId || db?._databaseId?.projectId || null }); } catch (_) {}

    const existingQuery = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', uid),
      where('jobId', '==', job.id)
    );
    const snapshot = await getDocs(existingQuery);

    if (!snapshot.empty) {
      // Déjà en favori → retirer le premier document trouvé
      await deleteDoc(doc(db, FAVORITES_COLLECTION, snapshot.docs[0].id));
      return { saved: false };
    } else {
      // Ajouter aux favoris
      const payload = {
        userId: uid,
        jobId: job.id,
        title: job.title || '',
        company: job.company || '',
        city: job.city || '',
        type: job.type || 'CDI',
        salary: job.salary || '',
        savedAt: serverTimestamp(),
      };
      // Diagnostic logging
      try { console.debug('[favoritesService] setDoc payload:', payload, 'favId=', favId, 'auth.uid=', auth.currentUser?.uid); } catch (_) {}
      await setDoc(favRef, payload);
      return { saved: true };
    }
    } catch (error) {
    try { console.error('Erreur favori:', error.code || error.message || error); } catch (_) {}
    return { saved: false, error: error.message || String(error), code: error.code || null };
  }
}

/**
 * Vérifie si une offre est dans les favoris de l'utilisateur.
 * @param {string} userId
 * @param {string} jobId
 * @returns {Promise<boolean>}
 */
export async function isFavorite(userId, jobId) {
  if (!userId || !jobId) return false;
  try {
    const favId = `${userId}_${jobId}`;
    const favSnap = await getDoc(doc(db, FAVORITES_COLLECTION, favId));
    return favSnap.exists();
  } catch {
    return false;
  }
}

/**
 * Récupère tous les favoris d'un utilisateur, triés par date (plus récent d'abord).
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getFavorites(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId),
      orderBy('savedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Erreur récupération favoris:', error);
    return [];
  }
}

/**
 * Supprime un favori.
 * @param {string} userId
 * @param {string} jobId
 */
export async function removeFavorite(userId, jobId) {
  if (!userId || !jobId) return;
  try {
    const favId = `${userId}_${jobId}`;
    await deleteDoc(doc(db, FAVORITES_COLLECTION, favId));
  } catch (error) {
    console.error('Erreur suppression favori:', error);
  }
}

/**
 * Compte le nombre de favoris d'un utilisateur.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getFavoriteCount(userId) {
  if (!userId) return 0;
  try {
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch {
    return 0;
  }
}

export default { toggleFavorite, isFavorite, getFavorites, removeFavorite, getFavoriteCount };
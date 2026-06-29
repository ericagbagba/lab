import { collection, doc, setDoc, serverTimestamp, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { localDb } from '../db';
import { generateId } from '../utils/helpers';

const isOnline = () => navigator.onLine && isFirebaseConfigured;

/**
 * Journalise une activité opérationnelle.
 * 
 * @param {object} activityData
 * @param {string} [activityData.agencyId]
 * @param {string} activityData.userId
 * @param {string} activityData.userDisplayName
 * @param {string} activityData.action
 * @param {string} activityData.entity - client | panne | stock | base | agence | topologie | user
 * @param {string} activityData.entityId
 * @param {string} activityData.details
 * @param {object} userContext - contexte utilisateur courant
 */
export const logActivity = async (activityData, userContext = {}) => {
  const activityId = generateId();
  const now = new Date().toISOString();
  
  const activityRecord = {
    id: activityId,
    agencyId: activityData.agencyId || userContext.agencyId || null,
    userId: activityData.userId || userContext.uid || 'system',
    userDisplayName: activityData.userDisplayName || userContext.displayName || 'Utilisateur',
    action: activityData.action,
    entity: activityData.entity,
    entityId: activityData.entityId,
    details: activityData.details || '',
    createdAt: now
  };

  try {
    if (isOnline()) {
      const docRef = doc(db, 'activities', activityId);
      await setDoc(docRef, {
        ...activityRecord,
        createdAt: serverTimestamp()
      });
      // Mettre aussi en cache local
      await localDb.activities.put({
        ...activityRecord,
        _pendingSync: false
      });
    } else {
      // Offline cache
      await localDb.activities.put({
        ...activityRecord,
        _pendingSync: true
      });
    }
  } catch (error) {
    console.error('Erreur journalisation activité:', error);
    // En cas d'erreur, on stocke en local
    try {
      await localDb.activities.put({
        ...activityRecord,
        _pendingSync: true
      });
    } catch (e) {
      console.error('Erreur stockage local activité:', e);
    }
  }
};

/**
 * Récupérer l'historique d'activité
 * @param {object} filterContext
 * @param {string} [filterContext.agencyId] - Filtrer par agence
 * @param {boolean} [filterContext.global] - true pour tout voir (directeur/contrôleur)
 */
export const getActivities = async (filterContext = {}) => {
  if (isOnline()) {
    try {
      let q = collection(db, 'activities');
      if (!filterContext.global && filterContext.agencyId) {
        q = query(q, where('agencyId', '==', filterContext.agencyId));
      }
      q = query(q, orderBy('createdAt', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return activities;
    } catch (error) {
      console.error('Erreur lecture activités online:', error);
    }
  }

  // Offline or error reading online
  let cached = await localDb.activities.toArray();
  if (!filterContext.global && filterContext.agencyId) {
    cached = cached.filter(act => act.agencyId === filterContext.agencyId);
  }
  cached.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return cached.slice(0, 100);
};

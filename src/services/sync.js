import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { localDb } from '../db';

const isOnline = () => navigator.onLine && isFirebaseConfigured;

/**
 * Compare deux dates pour savoir si la locale est plus récente
 * @param {string|object} localDateStr 
 * @param {object} remoteTimestamp 
 * @returns {boolean}
 */
const isLocalMoreRecent = (localDateStr, remoteTimestamp) => {
  if (!remoteTimestamp) return true;
  if (!localDateStr) return false;
  
  const localDate = new Date(localDateStr);
  const remoteDate = remoteTimestamp.toDate ? remoteTimestamp.toDate() : new Date(remoteTimestamp);
  
  return localDate.getTime() > remoteDate.getTime();
};

/**
 * Synchronise une table spécifique d'IndexedDB vers Firestore
 * @param {string} storeName - Nom du store Dexie
 * @param {string} collectionName - Nom de la collection Firestore
 */
export const syncStore = async (storeName, collectionName) => {
  if (!isOnline()) return 0;

  const pendingItems = await localDb[storeName].where('_pendingSync').equals(1).toArray();
  let syncCount = 0;

  for (const item of pendingItems) {
    const { _pendingSync, ...cleanData } = item;
    const docRef = doc(db, collectionName, item.id);

    try {
      // 1. Vérifier le conflit avec Firestore
      const docSnap = await getDoc(docRef);
      let shouldUpload = true;

      if (docSnap.exists()) {
        const remoteData = docSnap.data();
        // Si le document distant est plus récent, on écrase localement (conflit résolu en faveur du plus récent)
        if (!isLocalMoreRecent(cleanData.updatedAt, remoteData.updatedAt)) {
          shouldUpload = false;
          await localDb[storeName].put({
            ...remoteData,
            id: docSnap.id,
            _pendingSync: false
          });
        }
      }

      // 2. Si local est plus récent ou inexistant sur Firestore, on l'envoie
      if (shouldUpload) {
        // Préparer les dates pour Firestore
        const firestoreData = { ...cleanData };
        if (firestoreData.createdAt && typeof firestoreData.createdAt === 'string') {
          firestoreData.createdAt = new Date(firestoreData.createdAt);
        }
        if (firestoreData.updatedAt && typeof firestoreData.updatedAt === 'string') {
          firestoreData.updatedAt = new Date(firestoreData.updatedAt);
        }
        if (firestoreData.resolvedAt && typeof firestoreData.resolvedAt === 'string') {
          firestoreData.resolvedAt = new Date(firestoreData.resolvedAt);
        }

        await setDoc(docRef, firestoreData, { merge: true });
        
        // Mettre à jour Dexie : marquer synchronisé
        await localDb[storeName].update(item.id, { _pendingSync: false });
        syncCount++;
      }
    } catch (error) {
      console.error(`Erreur de synchronisation pour l'entité ${item.id} du store ${storeName}:`, error);
    }
  }

  return syncCount;
};

/**
 * Synchroniser toutes les tables en attente vers Firestore
 */
export const syncAllData = async () => {
  if (!isOnline()) return { synced: 0, status: 'offline' };

  try {
    const stores = [
      { local: 'agencies', remote: 'agencies' },
      { local: 'bases', remote: 'bases' },
      { local: 'clients', remote: 'clients' },
      { local: 'faults', remote: 'faults' },
      { local: 'stocks', remote: 'stocks' },
      { local: 'stockRequests', remote: 'stockRequests' },
      { local: 'topologies', remote: 'topologies' },
      { local: 'activities', remote: 'activities' }
    ];

    let totalSynced = 0;
    for (const store of stores) {
      const count = await syncStore(store.local, store.remote);
      totalSynced += count;
    }

    return { synced: totalSynced, status: 'success' };
  } catch (error) {
    console.error('Erreur lors de la synchronisation globale:', error);
    return { synced: 0, status: 'error', error };
  }
};

/**
 * Compte le nombre total de documents en attente de synchronisation
 */
export const getPendingSyncCount = async () => {
  const stores = ['agencies', 'bases', 'clients', 'faults', 'stocks', 'stockRequests', 'topologies', 'activities'];
  let total = 0;
  
  for (const storeName of stores) {
    try {
      const count = await localDb[storeName].where('_pendingSync').equals(1).count();
      total += count;
    } catch (e) {
      console.error(`Erreur comptage pending sur ${storeName}:`, e);
    }
  }
  
  return total;
};

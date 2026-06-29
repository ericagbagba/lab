import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { localDb } from '../db';
import { logActivity } from './activities';

// Helper pour vérifier si on est online
const isOnline = () => navigator.onLine && isFirebaseConfigured;

// Helper pour convertir les Firebase Timestamps en Date ou millisecondes pour Dexie
const serializeForDexie = (data) => {
  const serialized = { ...data };
  Object.keys(serialized).forEach(key => {
    if (serialized[key] && typeof serialized[key].toDate === 'function') {
      serialized[key] = serialized[key].toDate().toISOString();
    } else if (serialized[key] instanceof Date) {
      serialized[key] = serialized[key].toISOString();
    }
  });
  return serialized;
};

// --- SERVICES UTILISATEURS ---
export const usersService = {

  async getUser(uid) {
    // ✅ On essaie Firestore même si offline
    // car l'user vient de s'authentifier
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (e) {
      console.error('❌ Erreur getUser:', e.code, e.message);
      return null;
    }
  },

  async saveUser(userData) {
    // ✅ CORRECTIF : On tente Firestore directement
    // sans vérifier isOnline() qui bloque tout
    try {
      const docRef = doc(db, 'users', userData.uid);
      await setDoc(docRef, {
        ...userData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log("✅ Document user sauvegardé dans Firestore:", userData.uid);
      return true;

    } catch (e) {
      console.error('❌ Erreur saveUser Firestore:', e.code, e.message);
      
      // ✅ Message d'erreur clair selon le type
      if (e.code === 'permission-denied') {
        throw new Error(
          "Permission refusée : vérifiez les règles Firestore"
        );
      }
      if (e.code === 'unavailable') {
        throw new Error(
          "Firestore indisponible : vérifiez votre connexion internet"
        );
      }
      throw e;
    }
  },

  async getAllUsers() {
    try {
      const q = query(
        collection(db, 'users'), 
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (e) {
      console.error('❌ Erreur getAllUsers:', e.code, e.message);
      return [];
    }
  },

  // ✅ NOUVEAU : Mettre à jour le rôle d'un utilisateur (Directeur)
  async updateUserRole(uid, role, agencyId = null) {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, {
        role: role,
        agencyId: agencyId,
        isActive: true, // ✅ Active le compte
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Rôle "${role}" attribué à ${uid}`);
      return true;
    } catch (e) {
      console.error('❌ Erreur updateUserRole:', e.code, e.message);
      throw e;
    }
  },

  // ✅ NOUVEAU : Récupérer les users en attente de rôle
  async getPendingUsers() {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', null)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (e) {
      console.error('❌ Erreur getPendingUsers:', e.code, e.message);
      return [];
    }
  }
};

// --- GENERIC CRUD AVEC CACHE OFFLINE-FIRST ---

const createCrudService = (collectionName, dbStoreName) => {
  return {
    async getAll(filters = [], orderField = 'updatedAt', orderDir = 'desc') {
      let items = [];

      if (isOnline()) {
        try {
          let q = collection(db, collectionName);
          
          // Appliquer les filtres
          filters.forEach(filter => {
            if (filter.field && filter.op && filter.value !== undefined) {
              q = query(q, where(filter.field, filter.op, filter.value));
            }
          });

          const querySnapshot = await getDocs(q);
          items = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Mettre en cache dans Dexie
          await localDb[dbStoreName].clear();
          for (const item of items) {
            await localDb[dbStoreName].put({
              ...serializeForDexie(item),
              _pendingSync: false
            });
          }
          return items;
        } catch (error) {
          console.error(`Erreur chargement online ${collectionName}:`, error);
        }
      }

      // Si offline ou erreur réseau, lire depuis Dexie
      let dexieCollection = localDb[dbStoreName];
      // On récupère tout et on filtre localement si nécessaire
      let cachedItems = await dexieCollection.toArray();
      
      // Appliquer les filtres en JS
      filters.forEach(filter => {
        if (filter.field && filter.op && filter.value !== undefined) {
          const { field, op, value } = filter;
          cachedItems = cachedItems.filter(item => {
            if (op === '==') return item[field] === value;
            if (op === 'array-contains') return Array.isArray(item[field]) && item[field].includes(value);
            return true;
          });
        }
      });

      // Tri local
      cachedItems.sort((a, b) => {
        const valA = a[orderField] || '';
        const valB = b[orderField] || '';
        if (orderDir === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });

      return cachedItems;
    },

    async getById(id) {
      if (isOnline()) {
        try {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() };
            await localDb[dbStoreName].put({
              ...serializeForDexie(data),
              _pendingSync: false
            });
            return data;
          }
        } catch (error) {
          console.error(`Erreur getById online ${collectionName}:`, error);
        }
      }
      return await localDb[dbStoreName].get(id);
    },

    async create(data, userContext = {}) {
      const now = new Date().toISOString();
      const newDoc = {
        ...data,
        createdAt: now,
        updatedAt: now,
        createdBy: userContext.uid || 'system'
      };

      if (isOnline()) {
        try {
          const docRef = doc(db, collectionName, data.id);
          await setDoc(docRef, {
            ...newDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          await localDb[dbStoreName].put({
            ...newDoc,
            _pendingSync: false
          });

          // Journaliser l'activité
          await logActivity({
            agencyId: data.agencyId || userContext.agencyId || null,
            userId: userContext.uid,
            userDisplayName: userContext.displayName || 'Utilisateur',
            action: `Création de ${collectionName}`,
            entity: collectionName.slice(0, -1), // Enlever le s de la fin
            entityId: data.id,
            details: `Création réussie de l'entité: ${data.name || data.nom || data.id}`
          }, userContext);

          return newDoc;
        } catch (error) {
          console.error(`Erreur create online ${collectionName}:`, error);
        }
      }

      // Offline fallback
      await localDb[dbStoreName].put({
        ...newDoc,
        _pendingSync: true
      });

      // Journaliser localement l'activité
      await logActivity({
        agencyId: data.agencyId || userContext.agencyId || null,
        userId: userContext.uid,
        userDisplayName: userContext.displayName || 'Utilisateur',
        action: `Création de ${collectionName} (Hors ligne)`,
        entity: collectionName.slice(0, -1),
        entityId: data.id,
        details: `Création hors ligne de l'entité: ${data.name || data.nom || data.id}`
      }, userContext);

      return newDoc;
    },

    async update(id, data, userContext = {}) {
      const now = new Date().toISOString();
      const updateData = {
        ...data,
        updatedAt: now
      };

      if (isOnline()) {
        try {
          const docRef = doc(db, collectionName, id);
          await updateDoc(docRef, {
            ...updateData,
            updatedAt: serverTimestamp()
          });

          // Récupérer le complet pour mettre à jour Dexie
          const updatedDocSnap = await getDoc(docRef);
          if (updatedDocSnap.exists()) {
            await localDb[dbStoreName].put({
              ...serializeForDexie({ id, ...updatedDocSnap.data() }),
              _pendingSync: false
            });
          }

          // Journaliser l'activité
          await logActivity({
            agencyId: data.agencyId || userContext.agencyId || null,
            userId: userContext.uid,
            userDisplayName: userContext.displayName || 'Utilisateur',
            action: `Modification de ${collectionName}`,
            entity: collectionName.slice(0, -1),
            entityId: id,
            details: `Modification de l'entité: ${data.name || data.nom || id}`
          }, userContext);

          return true;
        } catch (error) {
          console.error(`Erreur update online ${collectionName}:`, error);
        }
      }

      // Offline fallback
      const existing = await localDb[dbStoreName].get(id);
      await localDb[dbStoreName].put({
        ...existing,
        ...updateData,
        _pendingSync: true
      });

      await logActivity({
        agencyId: data.agencyId || userContext.agencyId || null,
        userId: userContext.uid,
        userDisplayName: userContext.displayName || 'Utilisateur',
        action: `Modification de ${collectionName} (Hors ligne)`,
        entity: collectionName.slice(0, -1),
        entityId: id,
        details: `Modification hors ligne de l'entité: ${data.name || data.nom || id}`
      }, userContext);

      return true;
    },

    async delete(id, userContext = {}) {
      if (isOnline()) {
        try {
          const docRef = doc(db, collectionName, id);
          await deleteDoc(docRef);
          await localDb[dbStoreName].delete(id);

          await logActivity({
            agencyId: userContext.agencyId || null,
            userId: userContext.uid,
            userDisplayName: userContext.displayName || 'Utilisateur',
            action: `Suppression de ${collectionName}`,
            entity: collectionName.slice(0, -1),
            entityId: id,
            details: `Suppression de l'entité ID: ${id}`
          }, userContext);

          return true;
        } catch (error) {
          console.error(`Erreur delete online ${collectionName}:`, error);
        }
      }

      // Pour la suppression hors ligne, on peut soit ajouter un tag de suppression, soit le supprimer directement de Dexie.
      // Dans notre logique de synchro simple, on le supprime de Dexie et on pourra l'enlever de Firestore à la reconnexion
      // si on gère une file d'attente de suppression. Faisons une suppression locale simple pour l'instant.
      await localDb[dbStoreName].delete(id);
      return true;
    }
  };
};

// Instancier les services CRUD correspondants
export const agenciesService = createCrudService('agencies', 'agencies');
export const basesService = createCrudService('bases', 'bases');
export const topologiesService = createCrudService('topologies', 'topologies');
export const clientsService = createCrudService('clients', 'clients');
export const faultsService = createCrudService('faults', 'faults');
export const stocksService = createCrudService('stocks', 'stocks');
export const stockRequestsService = createCrudService('stockRequests', 'stockRequests');

// --- STOCK GLOBAL SERVICE (Spécifique au contrôleur) ---
export const stockGlobalService = {
  async getAll() {
    if (isOnline()) {
      try {
        const q = query(collection(db, 'stockGlobal'), orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return items;
      } catch (error) {
        console.error('Erreur get stockGlobal:', error);
      }
    }
    return [];
  },

  async create(data, userContext) {
    if (isOnline()) {
      const docRef = doc(db, 'stockGlobal', data.id);
      const newDoc = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userContext.uid
      };
      await setDoc(docRef, newDoc);

      await logActivity({
        agencyId: null,
        userId: userContext.uid,
        userDisplayName: userContext.displayName,
        action: "Création de stock global",
        entity: "stock",
        entityId: data.id,
        details: `Création du produit global: ${data.name}`
      }, userContext);

      return newDoc;
    }
    throw new Error("Connexion internet requise pour gérer le stock global");
  },

  async update(id, data, userContext) {
    if (isOnline()) {
      const docRef = doc(db, 'stockGlobal', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      await logActivity({
        agencyId: null,
        userId: userContext.uid,
        userDisplayName: userContext.displayName,
        action: "Modification du stock global",
        entity: "stock",
        entityId: id,
        details: `Mise à jour du produit global ID: ${id}`
      }, userContext);

      return true;
    }
    throw new Error("Connexion internet requise pour gérer le stock global");
  },

  async delete(id, userContext) {
    if (isOnline()) {
      const docRef = doc(db, 'stockGlobal', id);
      await deleteDoc(docRef);

      await logActivity({
        agencyId: null,
        userId: userContext.uid,
        userDisplayName: userContext.displayName,
        action: "Suppression du stock global",
        entity: "stock",
        entityId: id,
        details: `Suppression du produit global ID: ${id}`
      }, userContext);

      return true;
    }
    throw new Error("Connexion internet requise pour gérer le stock global");
  }
};

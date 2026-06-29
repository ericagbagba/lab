import React, { createContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { usersService } from '../services/dataService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-charger ou rafraîchir les informations de rôle de l'utilisateur
  const refreshUserRole = async (uid) => {
    if (!uid) return null;
    try {
      const dbUser = await usersService.getUser(uid);
      if (dbUser) {
        return dbUser;
      }
    } catch (e) {
      console.error("Erreur de récupération du rôle utilisateur:", e);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Utilisateur connecté, récupérer ses infos Firestore
        let dbUser = await refreshUserRole(user.uid);
        
        if (!dbUser) {
          // L'utilisateur n'existe pas en Firestore, on crée sa fiche par défaut
          dbUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            role: null, // Pas de rôle par défaut
            agencyId: null,
            assignedAgencyIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await usersService.saveUser(dbUser);
        }

        // Combiner l'utilisateur Auth de base et ses données métiers Firestore
        setCurrentUser({
          ...user,
          ...dbUser
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Inscription
const register = async (email, password, displayName) => {
  setLoading(true);
  try {
    // ÉTAPE 1 : Créer dans Firebase Auth
    console.log("📝 Création compte Auth...");
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      email, 
      password
    );
    const user = userCredential.user;
    console.log("✅ Compte Auth créé:", user.uid);

    // ÉTAPE 2 : Mettre à jour le profil
    await updateProfile(user, { displayName });
    console.log("✅ Profil mis à jour");

    // ÉTAPE 3 : Créer document Firestore
    console.log("📝 Sauvegarde dans Firestore...");
    const dbUser = {
      uid: user.uid,
      email: email,
      displayName: displayName,
      role: null,        // En attente d'attribution
      agencyId: null,
      assignedAgencyIds: [],
      isActive: false,   // Inactif jusqu'à validation
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await usersService.saveUser(dbUser);
    console.log("✅ Document Firestore créé");

    // ÉTAPE 4 : Mettre à jour le state
    setCurrentUser({
      ...user,
      ...dbUser
    });

    return user;

  } catch (error) {
    console.error("❌ Erreur inscription:", error.code, error.message);
    throw error;
  } finally {
    setLoading(false);
  }
};

  // Connexion
  const login = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const dbUser = await refreshUserRole(user.uid);
      
      if (dbUser) {
        setCurrentUser({
          ...user,
          ...dbUser
        });
      }
      return userCredential;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Déconnexion
  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setCurrentUser(null);
    setLoading(false);
  };

  // Forcer la mise à jour des rôles
  const forceRefreshProfile = async () => {
    if (currentUser) {
      const dbUser = await refreshUserRole(currentUser.uid);
      if (dbUser) {
        setCurrentUser(prev => ({
          ...prev,
          ...dbUser
        }));
      }
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    forceRefreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

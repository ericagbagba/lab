import { useState, useEffect, useCallback } from 'react';
import { syncAllData, getPendingSyncCount } from '../services/sync';
import { isFirebaseConfigured } from '../firebase/config';

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine && isFirebaseConfigured);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Rafraîchir le nombre de modifications en attente
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch (e) {
      console.error('Erreur rafraîchissement pending count:', e);
    }
  }, []);

  // Déclencher la synchronisation manuellement ou automatiquement
  const forceSync = useCallback(async () => {
    if (!navigator.onLine || !isFirebaseConfigured) return;
    
    setIsSyncing(true);
    try {
      await syncAllData();
      await refreshPendingCount();
    } catch (error) {
      console.error('Erreur forceSync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Synchronisation automatique dès le retour en ligne
      forceSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Charger le compteur initial
    refreshPendingCount();

    // Pool régulier (ex: toutes les 15 secondes pour actualiser l'état du cache local)
    const interval = setInterval(() => {
      refreshPendingCount();
      // Si on est en ligne et qu'il y a des éléments en attente, tenter une synchro en arrière plan
      if (navigator.onLine && isFirebaseConfigured && pendingCount > 0 && !isSyncing) {
        forceSync();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [forceSync, refreshPendingCount, pendingCount, isSyncing]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    forceSync,
    refreshPendingCount
  };
};

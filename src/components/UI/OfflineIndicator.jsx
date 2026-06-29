import React from 'react';
import { useSync } from '../../hooks/useSync';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator = () => {
  const { isOnline, isSyncing, pendingCount, forceSync } = useSync();

  if (!isOnline) {
    return (
      <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 shadow-inner dark:bg-amber-950/40 dark:text-amber-300">
        <div className="flex items-center space-x-2">
          <WifiOff className="h-4 w-4 animate-bounce text-amber-600 dark:text-amber-400" />
          <span>Hors ligne — <strong>{pendingCount}</strong> modification{pendingCount > 1 ? 's' : ''} en attente</span>
        </div>
        <button
          disabled
          className="rounded bg-amber-200 px-2 py-1 text-[10px] font-bold text-amber-900 opacity-60 dark:bg-amber-900/40 dark:text-amber-200"
        >
          Synchronisation automatique à la reconnexion
        </button>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center justify-between bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 shadow-inner dark:bg-blue-950/40 dark:text-blue-300">
        <div className="flex items-center space-x-2">
          <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>En ligne — <strong>{pendingCount}</strong> modification{pendingCount > 1 ? 's' : ''} en attente</span>
        </div>
        <button
          onClick={forceSync}
          disabled={isSyncing}
          className="flex items-center space-x-1 rounded bg-blue-200 px-2.5 py-1 text-[10px] font-bold text-blue-900 hover:bg-blue-300 disabled:opacity-50 dark:bg-blue-900/40 dark:text-blue-200"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchro...' : 'Sync maintenant'}</span>
        </button>
      </div>
    );
  }

  return null; // Tout est en ligne et synchronisé, pas d'affichage intrusif
};

export default OfflineIndicator;

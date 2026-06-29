import React from 'react';
import { isFirebaseConfigured } from '../../firebase/config';

export const FirebaseConfigWarning = () => {
  if (isFirebaseConfigured) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <h3 className="mb-2 text-center text-xl font-bold text-slate-800 dark:text-white">
          Configuration Firebase Requise
        </h3>
        <p className="mb-4 text-center text-sm text-slate-600 dark:text-slate-400">
          L'application <strong>Bit</strong> nécessite l'initialisation de Firebase pour fonctionner pleinement.
        </p>
        <div className="rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-semibold mb-2 text-brand">Instructions :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copiez le fichier <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">.env.example</code> en <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">.env</code></li>
            <li>Remplissez les variables Firebase</li>
            <li>Redémarrez le serveur de développement</li>
          </ol>
        </div>
        <div className="mt-6 text-center text-xs text-slate-500">
          L'application peut démarrer localement sur IndexedDB, mais l'authentification et Firestore nécessitent ces clés.
        </div>
      </div>
    </div>
  );
};

export default FirebaseConfigWarning;

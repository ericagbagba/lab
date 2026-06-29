import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loading from '../components/UI/Loading';
import { ShieldAlert, LogOut } from 'lucide-react';

export const PrivateRoute = () => {
  const { currentUser, loading, logout } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si l'utilisateur n'a pas de rôle, on affiche l'écran de verrouillage / attente d'attribution
  if (currentUser.role === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f8] p-4 text-center dark:bg-[#0f172a]">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-900/10 dark:text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            Accès restreint
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Bonjour <strong className="text-brand dark:text-blue-400">{currentUser.displayName}</strong>.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Votre compte est en attente d'attribution de rôle par un directeur. Veuillez contacter votre administrateur pour activer vos accès opérationnels.
          </p>

          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-left text-xs font-semibold text-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
            Détails :
            <ul className="list-disc list-inside mt-1 font-mono text-[10px]">
              <li>ID: {currentUser.uid}</li>
              <li>Email: {currentUser.email}</li>
              <li>Statut: En attente</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-[14px] bg-brand py-3 text-sm font-bold text-white hover:bg-brand/90 transition duration-200"
            >
              Rafraîchir mon profil
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center space-x-2 w-full rounded-[14px] bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition duration-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default PrivateRoute;

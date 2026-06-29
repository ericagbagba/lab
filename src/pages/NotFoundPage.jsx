import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-4 text-center">
      <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800 text-slate-500 mb-4">
        <ShieldAlert className="h-10 w-10 text-brand" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">Page non trouvée</h2>
      <p className="text-xs text-slate-400 mt-1 max-w-sm font-semibold">
        Le lien que vous avez suivi est incorrect, ou la page a été déplacée par un administrateur.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-6 rounded-[14px] bg-brand py-3 px-6 text-xs font-bold text-white hover:bg-brand/90 transition shadow"
      >
        Retourner au tableau de bord
      </button>
    </div>
  );
};

export default NotFoundPage;

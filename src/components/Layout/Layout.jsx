import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import OfflineIndicator from '../UI/OfflineIndicator';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Sun, Moon, User } from 'lucide-react';

export const Layout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Erreur déconnexion:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 transition-colors duration-200 dark:bg-[#0f172a] dark:text-slate-100">
      
      {/* Indicateur de statut Offline tout en haut */}
      <div className="sticky top-0 z-50">
        <OfflineIndicator />
      </div>

      {/* Header pour mobile (invisible sur desktop car la navbar gère déjà le header) */}
      <header className="flex h-14 items-center justify-between border-b border-brand-border bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow">
            <span className="text-sm font-black">B</span>
          </div>
          <span className="text-base font-black tracking-tight text-brand dark:text-blue-400">
            Bit App
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/profile')}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Mon profil"
          >
            <User className="h-5 w-5" />
          </button>
          <button
            onClick={handleLogout}
            className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            title="Se déconnecter"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Zone principale de contenu */}
      <main className="mx-auto max-w-7xl px-4 pt-4 pb-24 md:pt-24 md:pb-8">
        <Outlet />
      </main>

      {/* Barre de navigation du bas / du haut */}
      <Navbar />
    </div>
  );
};

export default Layout;

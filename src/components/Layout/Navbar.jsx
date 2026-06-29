import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { 
  Home, 
  Users, 
  AlertTriangle, 
  Layers, 
  Database, 
  Menu,
  Settings,
  Activity,
  MapPin,
  Building2,
  UserCheck
} from 'lucide-react';

export const Navbar = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  // Si l'utilisateur n'a pas de rôle, pas de barre de navigation opérationnelle
  if (!role) return null;

  // Définir les onglets principaux du bas (max 5)
  const mainTabs = [
    {
      to: "/dashboard",
      label: "Bord",
      icon: <Home className="h-5 w-5" />,
      allowed: true // Tout le monde voit le dashboard/accueil
    },
    {
      to: "/clients",
      label: "Clients",
      icon: <Users className="h-5 w-5" />,
      allowed: true
    },
    {
      to: "/faults",
      label: "Pannes",
      icon: <AlertTriangle className="h-5 w-5" />,
      allowed: true
    },
    {
      to: "/stocks",
      label: "Stocks",
      icon: <Database className="h-5 w-5" />,
      allowed: true
    },
    {
      to: "/settings", // Plus/Paramètres
      label: "Plus",
      icon: <Menu className="h-5 w-5" />,
      allowed: true
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-border bg-white pb-safe shadow-lg dark:border-slate-800 dark:bg-slate-900 md:top-0 md:bottom-auto md:h-16 md:border-b md:border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-around px-4 md:justify-between">
        
        {/* LOGO (uniquement visible sur écran moyen/grand) */}
        <div className="hidden items-center space-x-2 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-md">
            <span className="text-xl font-black tracking-tighter">B</span>
          </div>
          <span className="text-lg font-black bg-gradient-to-r from-brand to-violetSec bg-clip-text text-transparent dark:from-brand-light">
            Bit PWA
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {role.toUpperCase()}
          </span>
        </div>

        {/* Liens de navigation */}
        <div className="flex w-full justify-around md:w-auto md:space-x-1">
          {mainTabs.filter(tab => tab.allowed).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 text-[10px] font-bold tracking-tight md:flex-row md:space-x-2 md:py-2 md:px-4 md:text-sm
                ${isActive 
                  ? 'text-brand dark:text-blue-400 bg-brand-light dark:bg-slate-800' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/40'
                }
              `}
            >
              <div className="md:h-5 md:w-5">
                {tab.icon}
              </div>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Profil abrégé (visible sur grand écran) */}
        <div className="hidden items-center space-x-3 md:flex">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {currentUser.displayName}
            </p>
            <p className="text-[10px] font-semibold text-slate-400">
              {currentUser.email}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violetSec/10 text-violetSec font-bold dark:bg-violetSec/20 dark:text-violet-400">
            {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'US'}
          </div>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;

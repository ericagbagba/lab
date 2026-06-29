import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { 
  Sun, 
  Moon, 
  Building, 
  Warehouse, 
  Network, 
  UserCheck, 
  Activity, 
  User, 
  LogOut,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const SettingsPage = () => {
  const { currentUser, logout } = useAuth();
  const role = currentUser?.role;
  const navigate = useNavigate();

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark') || 
    localStorage.getItem('theme') === 'dark'
  );

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Liste des menus secondaires autorisés
  const menuItems = [
    {
      to: "/profile",
      label: "Mon profil utilisateur",
      desc: "Rôles, agences affectées, informations de connexion",
      icon: <User className="h-5 w-5 text-blue-500" />,
      allowed: true
    },
    {
      to: "/agencies",
      label: "Gestion des Agences",
      desc: "Voir et configurer les agences physiques",
      icon: <Building className="h-5 w-5 text-indigo-500" />,
      allowed: true // Tout le monde peut voir
    },
    {
      to: "/bases",
      label: "Bases Techniques",
      desc: "Créer et gérer les bases de raccordement",
      icon: <Warehouse className="h-5 w-5 text-violetSec" />,
      allowed: role === ROLES.DIRECTEUR || role === ROLES.CHEF_AGENCE || role === ROLES.SUPERVISEUR
    },
    {
      to: "/topologies",
      label: "Topologies de Réseau",
      desc: "Voir et éditer les schémas et matériels actifs",
      icon: <Network className="h-5 w-5 text-sky-500" />,
      allowed: true
    },
    {
      to: "/users",
      label: "Gestion des Rôles & Accès",
      desc: "Attribuer les permissions de sécurité",
      icon: <UserCheck className="h-5 w-5 text-emerald-500" />,
      allowed: role === ROLES.DIRECTEUR
    },
    {
      to: "/activities",
      label: "Journal d'Activité global",
      desc: "Historique des mouvements opérationnels",
      icon: <Activity className="h-5 w-5 text-rose-500" />,
      allowed: role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR || role === ROLES.SUPERVISEUR || role === ROLES.CHEF_AGENCE
    }
  ];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
          Plus de modules & Thèmes
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Configuration de l'application et navigation secondaire
        </p>
      </div>

      {/* --- PREFERENCE DESIGN & THEME --- */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Préférences d'affichage
        </h3>

        <div className="flex items-center justify-between font-bold text-xs">
          <div className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-300">
            {isDarkMode ? <Moon className="h-5 w-5 text-amber-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
            <div>
              <span>Mode Nuit / Sombre</span>
              <p className="text-[10px] text-slate-400 font-semibold">Réduit la fatigue oculaire en faible luminosité</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
              isDarkMode ? 'bg-brand' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* --- MENU COMPLEMENTAIRE DE CONFIGURATION --- */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Administration & Outils
        </h3>

        <div className="divide-y divide-brand-border dark:divide-slate-800">
          {menuItems.filter(item => item.allowed).map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex w-full items-center justify-between py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                  {item.icon}
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {item.desc}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* --- SE DECONNECTER --- */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center space-x-2 rounded-[14px] bg-red-50 hover:bg-red-100/60 p-4 text-sm font-black text-red-600 dark:bg-red-950/10 dark:hover:bg-red-950/20 transition"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Déconnexion de mon compte</span>
        </button>
      </div>

    </div>
  );
};

export default SettingsPage;

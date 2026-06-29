import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { agenciesService } from '../services/dataService';
import Toast from '../components/UI/Toast';
import { User, Mail, Shield, Building2, MapPin, Check } from 'lucide-react';

export const ProfilePage = () => {
  const { currentUser, forceRefreshProfile } = useAuth();
  const role = currentUser?.role;

  const [agencies, setAgencies] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const list = await agenciesService.getAll();
        setAgencies(list);
      } catch (e) {
        console.error(e);
      }
    };
    loadAgencies();
  }, []);

  const handleRefresh = async () => {
    try {
      await forceRefreshProfile();
      showToast("Profil rafraîchi avec les dernières données serveur.");
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du rafraîchissement.", "error");
    }
  };

  const userAgency = agencies.find(a => a.id === currentUser?.agencyId);
  const supervisedAgencies = currentUser?.assignedAgencyIds
    ? currentUser.assignedAgencyIds.map(id => agencies.find(a => a.id === id)?.name).filter(Boolean).join(', ')
    : '';

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
          Mon Profil
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Informations de votre compte et périmètre d'accès opérationnel
        </p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        
        {/* Avatar & DisplayName */}
        <div className="flex items-center space-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white font-extrabold text-2xl shadow-md">
            {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'US'}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              {currentUser?.displayName || 'Collaborateur Bit'}
            </h2>
            <p className="text-xs text-slate-400 font-bold">{currentUser?.email}</p>
          </div>
        </div>

        {/* Détails de rôle et agences */}
        <div className="border-t border-brand-border dark:border-slate-800 pt-5 space-y-4 text-xs font-semibold">
          
          <div className="flex items-start space-x-3">
            <div className="rounded-lg bg-blue-50 p-2 text-brand dark:bg-slate-800 dark:text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Rôle opérationnel</span>
              <span className="text-slate-800 dark:text-slate-200 font-black text-sm uppercase">
                {role || 'EN ATTENTE D\'ATTRIBUTION'}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="rounded-lg bg-blue-50 p-2 text-brand dark:bg-slate-800 dark:text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Agence Principale</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                {role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR 
                  ? 'Accès Multi-Agences Global' 
                  : (userAgency ? userAgency.name : 'Non assignée')}
              </span>
            </div>
          </div>

          {role === ROLES.SUPERVISEUR && (
            <div className="flex items-start space-x-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-slate-800 dark:text-purple-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider">Périmètres sous Supervision</span>
                <span className="text-purple-700 dark:text-purple-300 font-bold">
                  {supervisedAgencies || 'Aucun raccordement sous supervision'}
                </span>
              </div>
            </div>
          )}

        </div>

        <div className="pt-4 border-t border-brand-border dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl bg-brand-light text-brand px-4 py-2.5 text-xs font-black hover:bg-brand-light/70 dark:bg-slate-800 dark:text-blue-300"
          >
            Rafraîchir mon profil
          </button>
        </div>

      </div>

    </div>
  );
};

export default ProfilePage;

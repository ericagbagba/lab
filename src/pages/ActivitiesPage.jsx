import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getActivities } from '../services/activities';
import { agenciesService } from '../services/dataService';
import { ROLES } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import { Activity, Search, Building2, User, Calendar } from 'lucide-react';

export const ActivitiesPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [activities, setActivities] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        const allAgencies = await agenciesService.getAll();
        setAgencies(allAgencies);

        // Déterminer les droits d'accès aux activités
        const isGlobal = role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR;
        const filterContext = {
          global: isGlobal,
          agencyId: currentUser?.agencyId
        };

        const logs = await getActivities(filterContext);
        setActivities(logs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (role) {
      loadActivities();
    }
  }, [role, currentUser]);

  const filteredLogs = activities.filter(log => 
    log.userDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
          Journal des Activités
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Traçabilité complète des actions métiers et mouvements de stocks
        </p>
      </div>

      {/* Recherche */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Filtrer par action, nom de collaborateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
          />
        </div>
      </div>

      {/* Liste des logs */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flow-root">
          <ul className="-mb-8">
            {filteredLogs.map((log, logIdx) => {
              const logAgency = agencies.find(a => a.id === log.agencyId);
              return (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== filteredLogs.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-brand ring-8 ring-white dark:bg-slate-800 dark:ring-slate-900 dark:text-blue-300">
                          <Activity className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {log.action}{' '}
                            <span className="font-medium text-slate-400">par</span>{' '}
                            <strong className="text-brand dark:text-blue-400 font-extrabold">{log.userDisplayName}</strong>
                          </p>
                          {log.details && (
                            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {log.details}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center">
                              <Building2 className="h-3 w-3 mr-0.5" />
                              Agence : {logAgency ? logAgency.name : 'Globale / Centrale'}
                            </span>
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-0.5" />
                              Entité : {log.entity} | ID: {log.entityId}
                            </span>
                          </div>
                        </div>
                        <div className="whitespace-nowrap text-right text-[10px] font-bold text-slate-400">
                          <time className="flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-0.5" />
                            {formatDate(log.createdAt)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {filteredLogs.length === 0 && (
              <p className="text-xs text-center text-slate-400 py-6">Aucune activité enregistrée.</p>
            )}
          </ul>
        </div>
      </div>

    </div>
  );
};

export default ActivitiesPage;

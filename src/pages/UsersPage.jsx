import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { usersService, agenciesService } from '../services/dataService';
import Toast from '../components/UI/Toast';
import { UserCheck, Shield, Building, Mail, CheckSquare, Square, Save, X, Search } from 'lucide-react';

export const UsersPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [users, setUsers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Séléctions d'édition
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Formulaire d'édition rôle/agences
  const [formRole, setFormRole] = useState(null);
  const [formAgencyId, setFormAgencyId] = useState('');
  const [formAssignedAgencies, setFormAssignedAgencies] = useState([]);

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const allAgencies = await agenciesService.getAll();
      setAgencies(allAgencies);

      const allUsers = await usersService.getAllUsers();
      setUsers(allUsers);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la récupération des utilisateurs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === ROLES.DIRECTEUR) {
      loadAll();
    }
  }, [role]);

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormRole(user.role);
    setFormAgencyId(user.agencyId || '');
    setFormAssignedAgencies(user.assignedAgencyIds || []);
    setShowEditModal(true);
  };

  // Toggle multi-sélection d'agences assignées pour superviseur
  const handleToggleAssignedAgency = (agencyId) => {
    if (formAssignedAgencies.includes(agencyId)) {
      setFormAssignedAgencies(formAssignedAgencies.filter(id => id !== agencyId));
    } else {
      setFormAssignedAgencies([...formAssignedAgencies, agencyId]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!canDo(role, 'assign_role')) {
      showToast("Seul le Directeur peut attribuer des rôles.", "error");
      return;
    }

    try {
      const updatedUser = {
        ...selectedUser,
        role: formRole,
        agencyId: formRole === ROLES.DIRECTEUR || formRole === ROLES.CONTROLEUR ? null : (formAgencyId || null),
        assignedAgencyIds: formRole === ROLES.SUPERVISEUR ? formAssignedAgencies : [],
        updatedAt: new Date().toISOString()
      };

      await usersService.saveUser(updatedUser);
      showToast(`Rôle et agences mis à jour pour ${selectedUser.displayName} !`);
      
      await loadAll();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la modification de l'utilisateur.", "error");
    }
  };

  if (role !== ROLES.DIRECTEUR) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center border shadow-sm max-w-md mx-auto mt-12 dark:bg-slate-900 dark:border-slate-800">
        <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-800 dark:text-white">Accès Non Autorisé</h2>
        <p className="text-xs font-semibold text-slate-400 mt-2">
          Seul le Directeur de l'entreprise peut accéder à la gestion des rôles et des utilisateurs.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
          Contrôle des Accès & Rôles
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Attribution des rôles et délimitation du périmètre des agences pour vos collaborateurs
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Rechercher un collaborateur par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
          />
        </div>
      </div>

      {/* Tableau utilisateurs */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                <th className="pb-3 pl-2">Collaborateur</th>
                <th className="pb-3">Rôle attribué</th>
                <th className="pb-3">Agence Principale</th>
                <th className="pb-3">Agences Assignées (Superviseur)</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const userAgency = agencies.find(a => a.id === u.agencyId);
                const assignedAgencyNames = u.assignedAgencyIds
                  ? u.assignedAgencyIds.map(id => agencies.find(a => a.id === id)?.name).filter(Boolean).join(', ')
                  : '';

                return (
                  <tr key={u.uid} className="text-slate-700 hover:bg-slate-50/50 dark:text-slate-300 dark:hover:bg-slate-800/10">
                    <td className="py-3.5 pl-2">
                      <span className="font-extrabold text-slate-800 dark:text-white block">{u.displayName}</span>
                      <span className="text-[10px] text-slate-400 flex items-center font-bold mt-0.5">
                        <Mail className="h-3 w-3 mr-0.5" /> {u.email}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        u.role 
                          ? 'bg-blue-100 text-brand dark:bg-slate-800' 
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {u.role || 'En attente'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {u.role === ROLES.DIRECTEUR || u.role === ROLES.CONTROLEUR
                        ? 'Accès Global de Direction' 
                        : (userAgency ? userAgency.name : 'Aucune')}
                    </td>
                    <td className="py-3.5 text-[11px] text-slate-400 font-medium">
                      {u.role === ROLES.SUPERVISEUR 
                        ? (assignedAgencyNames || 'Aucune agence assignée') 
                        : '-'}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="rounded-xl border border-brand-border px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Configurer l'accès
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL CONFIGURATION ACCES --- */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center">
                <UserCheck className="mr-2 h-5 w-5 text-brand" />
                Accès de : {selectedUser.displayName}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              
              {/* Choix du Rôle */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Attribuer un rôle métier
                </label>
                <select
                  value={formRole || ''}
                  onChange={(e) => setFormRole(e.target.value || null)}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold outline-none"
                >
                  <option value="">-- En attente d'attribution --</option>
                  <option value="directeur">Directeur</option>
                  <option value="contrôleur">Contrôleur</option>
                  <option value="superviseur">Superviseur</option>
                  <option value="chef_agence">Chef d'agence</option>
                  <option value="opérateur">Opérateur</option>
                  <option value="technicien">Technicien</option>
                </select>
              </div>

              {/* Choix Agence Principale (non applicable pour Directeur et Contrôleur) */}
              {formRole && formRole !== ROLES.DIRECTEUR && formRole !== ROLES.CONTROLEUR && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Agence de rattachement principale
                  </label>
                  <select
                    value={formAgencyId}
                    onChange={(e) => setFormAgencyId(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold outline-none"
                  >
                    <option value="">-- Aucune agence affectée --</option>
                    {agencies.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Choix des multi-agences assignées (uniquement pour Superviseur) */}
              {formRole === ROLES.SUPERVISEUR && (
                <div className="border-t pt-3">
                  <span className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                    Affecter les agences sous supervision *
                  </span>
                  <div className="grid gap-2 grid-cols-2 max-h-32 overflow-y-auto border p-2 rounded-xl bg-slate-50/50">
                    {agencies.map(agency => {
                      const checked = formAssignedAgencies.includes(agency.id);
                      return (
                        <button
                          key={agency.id}
                          type="button"
                          onClick={() => handleToggleAssignedAgency(agency.id)}
                          className="flex items-center space-x-2 text-left font-bold text-slate-700 py-1"
                        >
                          {checked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-brand" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-300" />
                          )}
                          <span>{agency.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border-2 px-4 py-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-2.5 text-white font-bold flex items-center space-x-1"
                >
                  <Save className="h-4 w-4" />
                  <span>Enregistrer l'accès</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersPage;

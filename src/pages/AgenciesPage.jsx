import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { agenciesService } from '../services/dataService';
import Toast from '../components/UI/Toast';
import { Building2, MapPin, Plus, Search, Trash2, Edit, X, Calendar } from 'lucide-react';

export const AgenciesPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals / Form
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState(null);
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadAgencies = async () => {
    setLoading(true);
    try {
      const list = await agenciesService.getAll();
      setAgencies(list);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du chargement des agences.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      loadAgencies();
    }
  }, [role]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !location) {
      showToast("Le nom et la localisation sont requis.", "warning");
      return;
    }

    const action = isEditing ? 'edit_agency' : 'create_agency';
    if (!canDo(role, action)) {
      showToast("Seul le Directeur peut modifier ou créer une agence.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      const payload = { name, location };

      if (isEditing) {
        await agenciesService.update(editingAgencyId, payload, userContext);
        showToast("L'agence a été mise à jour !");
      } else {
        const id = `agency_${Date.now()}`;
        await agenciesService.create({ id, ...payload }, userContext);
        showToast("Nouvelle agence créée !");
      }

      await loadAgencies();
      handleCloseForm();
    } catch (e) {
      console.error(e);
      showToast("Erreur de sauvegarde.", "error");
    }
  };

  const handleEditClick = (agency) => {
    setName(agency.name);
    setLocation(agency.location);
    setEditingAgencyId(agency.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (agency) => {
    if (!window.confirm(`Supprimer définitivement l'agence "${agency.name}" ?`)) return;

    if (!canDo(role, 'delete_agency')) {
      showToast("Seul le Directeur peut supprimer des agences.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };
      await agenciesService.delete(agency.id, userContext);
      showToast("Agence supprimée.");
      await loadAgencies();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseForm = () => {
    setName('');
    setLocation('');
    setIsEditing(false);
    setEditingAgencyId(null);
    setShowModal(false);
  };

  const filteredAgencies = agencies.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
            Nos Agences
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Périmètres géographiques, raccordements et management d'agences
          </p>
        </div>

        {canDo(role, 'create_agency') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center space-x-2 rounded-[14px] bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand/95"
          >
            <Plus className="h-4 w-4" />
            <span>Créer une agence</span>
          </button>
        )}
      </div>

      {/* Recherche */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom d'agence, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
          />
        </div>
      </div>

      {/* Liste des agences */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgencies.map((agency) => (
          <div 
            key={agency.id} 
            className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="rounded-xl bg-blue-50 p-3 text-brand dark:bg-slate-800 dark:text-blue-400">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {agency.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center font-bold">
                    <MapPin className="h-3 w-3 mr-0.5" /> {agency.location}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-brand-border dark:border-slate-800 flex items-center justify-between">
              <div className="text-[10px] text-slate-400 font-bold flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                ID: {agency.id}
              </div>

              {canDo(role, 'edit_agency') && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEditClick(agency)}
                    className="rounded-lg p-1.5 text-brand hover:bg-brand-light dark:hover:bg-slate-800"
                    title="Modifier"
                  >
                    <Edit className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(agency)}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL FORMULAIRE --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 mb-4">
              {isEditing ? "Modifier l'agence" : "Créer une agence"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Nom de l'agence *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Agence de Kara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Ville / Localisation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Kara, Togo"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-xl border-2 px-4 py-2"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-2.5 text-white font-bold"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgenciesPage;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { basesService, agenciesService } from '../services/dataService';
import Toast from '../components/UI/Toast';
import { Plus, Search, Trash2, Edit2, X, Warehouse, MapPin, Building } from 'lucide-react';

export const BasesPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [bases, setBases] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Formulaire modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBaseId, setEditingBaseId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    agencyId: currentUser?.agencyId || '',
    quartier: '',
    description: ''
  });

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allAgencies = await agenciesService.getAll();
      setAgencies(allAgencies);

      const allBases = await basesService.getAll();
      let visibleBases = allBases;
      
      // Filtrer pour les rôles agence locaux
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        visibleBases = allBases.filter(b => b.agencyId === currentUser?.agencyId);
      }
      setBases(visibleBases);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du chargement des bases.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      loadData();
    }
  }, [role, currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.agencyId || !formData.quartier) {
      showToast("Veuillez remplir tous les champs obligatoires.", "error");
      return;
    }

    const action = isEditing ? 'edit_base' : 'create_base';
    if (!canDo(role, action, { agencyId: formData.agencyId, currentUser })) {
      showToast("Permissions insuffisantes pour cette opération.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      if (isEditing) {
        await basesService.update(editingBaseId, formData, userContext);
        showToast("La base a été modifiée !");
      } else {
        const id = `base_${Date.now()}`;
        await basesService.create({ id, ...formData }, userContext);
        showToast("Nouvelle base créée avec succès !");
      }

      await loadData();
      handleCloseModal();
    } catch (e) {
      console.error(e);
      showToast("Une erreur est survenue lors de la sauvegarde.", "error");
    }
  };

  const handleDelete = async (base) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la base "${base.name}" ?`)) return;

    if (!canDo(role, 'delete_base', { agencyId: base.agencyId, currentUser })) {
      showToast("Seul le directeur peut supprimer une base.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };
      await basesService.delete(base.id, userContext);
      showToast("Base supprimée.");
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Erreur de suppression.", "error");
    }
  };

  const handleOpenEdit = (base) => {
    if (!canDo(role, 'edit_base', { agencyId: base.agencyId, currentUser })) {
      showToast("Permissions insuffisantes pour modifier cette base.", "error");
      return;
    }
    setFormData({
      name: base.name,
      agencyId: base.agencyId,
      quartier: base.quartier,
      description: base.description || ''
    });
    setEditingBaseId(base.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setFormData({
      name: '',
      agencyId: currentUser?.agencyId || '',
      quartier: '',
      description: ''
    });
    setIsEditing(false);
    setEditingBaseId(null);
    setShowModal(false);
  };

  const filteredBases = bases.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.quartier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
            Bases Techniques
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gestion des points de présence réseau et d'interconnexion client
          </p>
        </div>

        {canDo(role, 'create_base', { agencyId: currentUser.agencyId, currentUser }) && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center space-x-2 rounded-[14px] bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand/95"
          >
            <Plus className="h-4 w-4" />
            <span>Créer une base</span>
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
            placeholder="Rechercher par nom de base, quartier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Grid de Bases */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBases.map((base) => {
          const baseAgency = agencies.find(a => a.id === base.agencyId);
          return (
            <div 
              key={base.id} 
              className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="rounded-lg bg-violetSec/10 p-2.5 text-violetSec dark:bg-violetSec/20">
                    <Warehouse className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                      {base.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 flex items-center font-bold">
                      <MapPin className="h-3 w-3 mr-0.5" /> {base.quartier}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-semibold line-clamp-3">
                  {base.description || "Aucune description fournie pour cette base technique."}
                </p>

                <div className="pt-2 text-[10px] font-bold text-slate-400 flex items-center">
                  <Building className="h-3.5 w-3.5 mr-1" />
                  Agence : {baseAgency ? baseAgency.name : 'Non définie'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-border dark:border-slate-800 flex items-center justify-end space-x-2">
                {canDo(role, 'edit_base', { agencyId: base.agencyId, currentUser }) && (
                  <button
                    onClick={() => handleOpenEdit(base)}
                    className="rounded-lg p-1.5 text-brand hover:bg-brand-light dark:hover:bg-slate-800"
                    title="Modifier"
                  >
                    <Edit2 className="h-4.5 w-4.5" />
                  </button>
                )}
                {canDo(role, 'delete_base', { agencyId: base.agencyId, currentUser }) && (
                  <button
                    onClick={() => handleDelete(base)}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredBases.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            Aucune base technique trouvée.
          </div>
        )}
      </div>

      {/* --- MODAL FORMULAIRE --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                {isEditing ? "Modifier la base technique" : "Créer une base technique"}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Nom de la base *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Base de Tokoin"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* Sélection d'agence si Directeur / Contrôleur */}
              {(role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) ? (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Agence de rattachement *
                  </label>
                  <select
                    required
                    value={formData.agencyId}
                    onChange={(e) => setFormData(prev => ({ ...prev, agencyId: e.target.value }))}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="">-- Sélectionner l'agence --</option>
                    {agencies.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="hidden">
                  <input type="hidden" value={formData.agencyId} />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Quartier / Emplacement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Adidogomé, près du château"
                  value={formData.quartier}
                  onChange={(e) => setFormData(prev => ({ ...prev, quartier: e.target.value }))}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Description détaillée
                </label>
                <textarea
                  rows="3"
                  placeholder="Equipements présents, coordonnées..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-brand-border dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border-2 border-brand-border px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-white hover:bg-brand/90 transition shadow"
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

export default BasesPage;

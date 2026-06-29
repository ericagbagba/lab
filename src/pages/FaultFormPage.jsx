import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { faultsService, basesService, clientsService, stocksService } from '../services/dataService';
import Toast from '../components/UI/Toast';
import { AlertTriangle, ChevronLeft, Save, Plus, Trash2, User } from 'lucide-react';

export const FaultFormPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Listes de sélection
  const [bases, setBases] = useState([]);
  const [clients, setClients] = useState([]);
  const [agencyStocks, setAgencyStocks] = useState([]);

  // Formulaire state
  const [baseId, setBaseId] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ouverte');
  
  // Matériaux utilisés initialement
  const [materialsUsed, setMaterialsUsed] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    const loadSelectionData = async () => {
      try {
        const allBases = await basesService.getAll();
        const userAgencyId = currentUser?.agencyId;

        // Filtrer les bases par agence
        let filteredBases = allBases;
        if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
          filteredBases = allBases.filter(b => b.agencyId === userAgencyId);
        }
        setBases(filteredBases);

        // Charger tout le stock d'agence pour pouvoir préparer les pièces
        if (userAgencyId) {
          const stocks = await stocksService.getAll([
            { field: 'agencyId', op: '==', value: userAgencyId }
          ]);
          setAgencyStocks(stocks);
        }

        // Si on est en mode modification, charger la panne
        if (editId) {
          setLoading(true);
          const fault = await faultsService.getById(editId);
          if (fault) {
            setBaseId(fault.baseId || '');
            setClientId(fault.clientId || '');
            setDescription(fault.description || '');
            setStatus(fault.status || 'ouverte');
            setMaterialsUsed(fault.materialsUsed || []);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        showToast("Erreur de chargement des données de configuration.", "error");
      }
    };

    if (role) {
      loadSelectionData();
    }
  }, [role, currentUser, editId]);

  // Charger les clients de la base sélectionnée
  useEffect(() => {
    const loadClientsOfBase = async () => {
      if (!baseId) {
        setClients([]);
        return;
      }
      try {
        const baseClients = await clientsService.getAll([
          { field: 'baseId', op: '==', value: baseId }
        ]);
        setClients(baseClients);
      } catch (e) {
        console.error(e);
      }
    };
    loadClientsOfBase();
  }, [baseId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Ajouter un matériau de stock
  const handleAddMaterial = () => {
    if (!selectedStockId) return;
    const stockItem = agencyStocks.find(s => s.id === selectedStockId);
    if (!stockItem) return;

    if (selectedQty <= 0) {
      showToast("La quantité doit être supérieure à 0.", "warning");
      return;
    }

    if (stockItem.quantity < selectedQty) {
      showToast(`Quantité insuffisante en stock (${stockItem.quantity} dispo).`, "warning");
      return;
    }

    // Vérifier si déjà présent
    const existingIdx = materialsUsed.findIndex(m => m.stockItemId === selectedStockId);
    if (existingIdx > -1) {
      const updated = [...materialsUsed];
      const newQty = updated[existingIdx].quantity + Number(selectedQty);
      if (stockItem.quantity < newQty) {
        showToast(`Quantité cumulée dépasse le stock disponible.`, "warning");
        return;
      }
      updated[existingIdx].quantity = newQty;
      setMaterialsUsed(updated);
    } else {
      setMaterialsUsed([
        ...materialsUsed,
        {
          stockItemId: selectedStockId,
          name: stockItem.name,
          quantity: Number(selectedQty),
          unit: stockItem.unit
        }
      ]);
    }

    setSelectedStockId('');
    setSelectedQty(1);
  };

  const handleRemoveMaterial = (idx) => {
    setMaterialsUsed(materialsUsed.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!baseId || !description) {
      showToast("Veuillez remplir tous les champs obligatoires (*).", "error");
      return;
    }

    const agencyId = currentUser.agencyId || bases.find(b => b.id === baseId)?.agencyId;
    if (!agencyId) {
      showToast("Impossible de rattacher la panne à une agence.", "error");
      return;
    }

    // Check permissions
    const action = editId ? 'edit_fault' : 'signal_fault';
    if (!canDo(role, action, { agencyId, currentUser })) {
      showToast("Permissions insuffisantes.", "error");
      return;
    }

    setLoading(true);
    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      const faultData = {
        agencyId,
        baseId,
        clientId: clientId || null,
        description: description.trim(),
        status,
        materialsUsed
      };

      if (editId) {
        // Enregistrer modifications
        await faultsService.update(editId, faultData, userContext);
        showToast("Panne modifiée avec succès !");
      } else {
        // Nouvelle panne
        const faultId = `fault_${Date.now()}`;
        const newFault = {
          id: faultId,
          ...faultData,
          signaleurId: currentUser.uid,
          comments: [],
          resolvedAt: null,
          resolvedBy: null,
          resolutionDurationMinutes: null
        };
        await faultsService.create(newFault, userContext);
        showToast("Nouvelle panne signalée !");
      }

      setTimeout(() => {
        navigate('/faults');
      }, 1000);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'enregistrement de la panne.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigate('/faults')}
          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">
            {editId ? "Modifier la panne" : "Signaler une panne"}
          </h1>
          <p className="text-[11px] text-slate-500 font-semibold">
            Formulaire de diagnostic et d'affectation
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* Base obligatoire */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Base de raccordement *
          </label>
          <select
            required
            value={baseId}
            onChange={(e) => {
              setBaseId(e.target.value);
              setClientId(''); // reset client
            }}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">-- Choisir la base touchée --</option>
            {bases.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Client optionnel mais rattachable */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Client impacté (Optionnel)
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={!baseId}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brand disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">-- Aucun client spécifique (Panne générale de base) --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.nom} (Case {c.numero} - {c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Description détaillée du problème *
          </label>
          <textarea
            required
            rows="4"
            placeholder="Décrire les symptômes, les tests effectués, l'impact sur le client..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          ></textarea>
        </div>

        {/* Statut si modif */}
        {editId && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Statut de la panne
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="ouverte">Ouverte</option>
              <option value="en_cours">En cours</option>
              <option value="résolue">Résolue</option>
              <option value="annulée">Annulée</option>
            </select>
          </div>
        )}

        {/* --- PRÉPARATION DES MATÉRIAUX (OPTIONNELS À CE STADE) --- */}
        <div className="border-t border-brand-border pt-4 dark:border-slate-800">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-violetSec mb-3">
            Matériels requis ou consommés
          </h3>
          
          <div className="flex gap-2 items-end mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Article du stock
              </label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full rounded-xl border-2 border-brand-border bg-white p-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">-- Choisir un matériel --</option>
                {agencyStocks.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.quantity} {s.unit} dispo)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-24">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Quantité
              </label>
              <input
                type="number"
                min="1"
                value={selectedQty}
                onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border-2 border-brand-border bg-white p-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={handleAddMaterial}
              className="rounded-xl bg-violetSec/10 p-2.5 text-violetSec hover:bg-violetSec/20 font-black flex items-center justify-center dark:bg-violetSec/20 dark:text-violet-400"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Liste des matériels ajoutés */}
          {materialsUsed.length > 0 ? (
            <div className="rounded-xl bg-slate-50 p-3 space-y-2 dark:bg-slate-950 border border-brand-border dark:border-slate-800">
              {materialsUsed.map((mat, index) => (
                <div key={index} className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">
                    {mat.name} x {mat.quantity} {mat.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(index)}
                    className="text-red-500 hover:bg-red-50 rounded p-1 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-bold text-slate-400 italic">Aucun matériel listé pour l'instant.</p>
          )}
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end space-x-2 border-t border-brand-border pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/faults')}
            className="rounded-xl border-2 border-brand-border px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand/90"
          >
            <Save className="h-4 w-4" />
            <span>{editId ? "Sauvegarder" : "Signaler"}</span>
          </button>
        </div>

      </form>
    </div>
  );
};

export default FaultFormPage;

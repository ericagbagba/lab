import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { faultsService, basesService, clientsService, stocksService } from '../services/dataService';
import { FAULT_STATUSES } from '../utils/constants';
import { formatDate, formatDuration } from '../utils/helpers';
import Toast from '../components/UI/Toast';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  User, 
  Edit, 
  FileText,
  Hammer,
  RotateCcw
} from 'lucide-react';

export const FaultsPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const navigate = useNavigate();

  const [faults, setFaults] = useState([]);
  const [bases, setBases] = useState([]);
  const [clients, setClients] = useState([]);
  const [stocks, setStocks] = useState([]);

  // States filtres
  const [filterBaseId, setFilterBaseId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals / Actions
  const [selectedFault, setSelectedFault] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Résolution details
  const [newComment, setNewComment] = useState('');
  const [resMaterials, setResMaterials] = useState([]); // stock consumptions
  const [selectedStockId, setSelectedStockId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  // Toasts
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const allBases = await basesService.getAll();
      const allClients = await clientsService.getAll();
      
      let filteredBases = allBases;
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        filteredBases = allBases.filter(b => b.agencyId === currentUser?.agencyId);
      }
      setBases(filteredBases);
      setClients(allClients);

      // Charger le stock de l'agence courante (pour consommation)
      if (currentUser?.agencyId) {
        const agencyStocks = await stocksService.getAll([
          { field: 'agencyId', op: '==', value: currentUser.agencyId }
        ]);
        setStocks(agencyStocks);
      }

      const allFaults = await faultsService.getAll();
      let visibleFaults = allFaults;
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        visibleFaults = allFaults.filter(f => f.agencyId === currentUser?.agencyId);
      }
      setFaults(visibleFaults);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du chargement des données.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      loadAllData();
    }
  }, [role, currentUser]);

  // Ajouter un commentaire à la panne sélectionnée
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedFault) return;

    try {
      const updatedComments = [
        ...(selectedFault.comments || []),
        `[${formatDate(new Date())}] ${currentUser.displayName} : ${newComment.trim()}`
      ];

      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      await faultsService.update(selectedFault.id, {
        comments: updatedComments
      }, userContext);

      showToast("Commentaire ajouté !");
      setNewComment('');
      
      // Update local states
      const refreshedFault = await faultsService.getById(selectedFault.id);
      setSelectedFault(refreshedFault);
      await loadAllData();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'ajout du commentaire.", "error");
    }
  };

  // Annuler la panne
  const handleCancelFault = async (fault) => {
    if (!window.confirm("Voulez-vous vraiment annuler cette panne ?")) return;

    if (!canDo(role, 'cancel_fault', { signaleurId: fault.signaleurId, userId: currentUser.uid })) {
      showToast("Seul le signaleur d'origine de cette panne peut l'annuler.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      await faultsService.update(fault.id, {
        status: FAULT_STATUSES.ANNULEE
      }, userContext);

      showToast("Panne annulée.");
      await loadAllData();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de l'annulation.", "error");
    }
  };

  // Matériaux de résolution temporaires
  const handleAddResMaterial = () => {
    if (!selectedStockId) return;
    const stockItem = stocks.find(s => s.id === selectedStockId);
    if (!stockItem) return;

    if (selectedQty <= 0) return;
    if (stockItem.quantity < selectedQty) {
      showToast(`Stock insuffisant (${stockItem.quantity} dispo).`, "warning");
      return;
    }

    const existingIdx = resMaterials.findIndex(m => m.stockItemId === selectedStockId);
    if (existingIdx > -1) {
      const updated = [...resMaterials];
      const newQty = updated[existingIdx].quantity + selectedQty;
      if (stockItem.quantity < newQty) {
        showToast("Quantité cumulée insuffisante.", "warning");
        return;
      }
      updated[existingIdx].quantity = newQty;
      setResMaterials(updated);
    } else {
      setResMaterials([
        ...resMaterials,
        {
          stockItemId: selectedStockId,
          name: stockItem.name,
          quantity: selectedQty,
          unit: stockItem.unit
        }
      ]);
    }
    setSelectedStockId('');
    setSelectedQty(1);
  };

  const handleRemoveResMaterial = (idx) => {
    setResMaterials(resMaterials.filter((_, i) => i !== idx));
  };

  // Résoudre la panne
  const handleResolveFault = async () => {
    if (!selectedFault) return;

    if (!canDo(role, 'resolve_fault', { agencyId: selectedFault.agencyId, currentUser })) {
      showToast("Vous n'êtes pas autorisé à résoudre cette panne.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      const resolvedAt = new Date().toISOString();
      const createdDate = new Date(selectedFault.createdAt);
      const resDate = new Date(resolvedAt);
      
      // Calculer resolutionDurationMinutes
      const resolutionDurationMinutes = Math.max(1, Math.round((resDate.getTime() - createdDate.getTime()) / 60000));

      // Consommer réellement les stocks d'agence
      for (const mat of resMaterials) {
        const stockItem = await stocksService.getById(mat.stockItemId);
        if (stockItem) {
          const newQty = Math.max(0, stockItem.quantity - mat.quantity);
          await stocksService.update(mat.stockItemId, {
            quantity: newQty
          }, userContext);
        }
      }

      const updatedComments = [
        ...(selectedFault.comments || []),
        `[${formatDate(resolvedAt)}] Résolue par ${currentUser.displayName}. Durée : ${formatDuration(resolutionDurationMinutes)}`
      ];

      await faultsService.update(selectedFault.id, {
        status: FAULT_STATUSES.RESOLUE,
        resolvedAt,
        resolvedBy: currentUser.uid,
        resolutionDurationMinutes,
        materialsUsed: resMaterials,
        comments: updatedComments
      }, userContext);

      showToast("Panne résolue et stocks de l'agence décrémentés !");
      setShowResolveModal(false);
      setResMaterials([]);
      await loadAllData();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la résolution de la panne.", "error");
    }
  };

  // Filtrer
  const filteredFaults = faults.filter(f => {
    const matchesBase = filterBaseId ? f.baseId === filterBaseId : true;
    const matchesStatus = filterStatus ? f.status === filterStatus : true;
    
    const clientName = clients.find(c => c.id === f.clientId)?.nom || '';
    const baseName = bases.find(b => b.id === f.baseId)?.name || '';

    const matchesSearch = f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          baseName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesBase && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const styles = {
      ouverte: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
      en_cours: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30",
      résolue: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      annulée: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
    };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.ouverte}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
            Pannes Signalées
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Suivi des tickets d'incidents par base et diagnostic de résolution
          </p>
        </div>

        {canDo(role, 'signal_fault', { agencyId: currentUser.agencyId, currentUser }) && (
          <button
            onClick={() => navigate('/faults/form')}
            className="flex items-center justify-center space-x-2 rounded-[14px] bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            <span>Signaler un incident</span>
          </button>
        )}
      </div>

      {/* --- BARRE DE FILTRES --- */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Rechercher par symptôme, client ou base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterBaseId}
              onChange={(e) => setFilterBaseId(e.target.value)}
              className="rounded-lg border-2 border-brand-border bg-white py-1.5 px-3 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Toutes les bases</option>
              {bases.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border-2 border-brand-border bg-white py-1.5 px-3 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Tous les statuts</option>
              <option value="ouverte">Ouverte</option>
              <option value="en_cours">En cours</option>
              <option value="résolue">Résolue</option>
              <option value="annulée">Annulée</option>
            </select>

            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {filteredFaults.length} tickets
            </span>
          </div>

        </div>
      </div>

      {/* --- GRID DE TICKETS --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFaults.map((fault) => {
          const faultBase = bases.find(b => b.id === fault.baseId);
          const faultClient = clients.find(c => c.id === fault.clientId);
          
          return (
            <div 
              key={fault.id} 
              className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm hover:shadow-md transition dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {getStatusBadge(fault.status)}
                  <span className="text-[10px] font-bold text-slate-400">
                    {formatDate(fault.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand dark:text-blue-400 block">
                    Base : {faultBase ? faultBase.name : 'Inconnue'}
                  </span>
                  
                  {faultClient ? (
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white mt-1 block">
                      Client : {faultClient.nom} (Case {faultClient.numero} - {faultClient.code})
                    </span>
                  ) : (
                    <span className="text-xs font-black text-violetSec mt-1 block">
                      Panne générale de base / multiplexeur
                    </span>
                  )}
                  
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 font-medium">
                    {fault.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-border dark:border-slate-800 flex items-center justify-between">
                
                {/* Durée si résolu */}
                {fault.status === FAULT_STATUSES.RESOLUE ? (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded dark:bg-emerald-950/20">
                    <Clock className="h-3 w-3 mr-1" />
                    R : {formatDuration(fault.resolutionDurationMinutes)}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Ouvert depuis : {formatDuration((new Date() - new Date(fault.createdAt)) / 60000)}
                  </span>
                )}

                <div className="flex space-x-1">
                  
                  {/* Consulter les détails/commentaires */}
                  <button
                    onClick={() => {
                      setSelectedFault(fault);
                      setShowDetailModal(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    title="Détails & Commentaires"
                  >
                    <MessageSquare className="h-4.5 w-4.5" />
                  </button>

                  {/* Bouton modifier */}
                  {canDo(role, 'edit_fault', { agencyId: fault.agencyId, currentUser }) && (
                    <button
                      onClick={() => navigate(`/faults/form?edit=${fault.id}`)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      title="Modifier la description"
                    >
                      <Edit className="h-4.5 w-4.5" />
                    </button>
                  )}

                  {/* Résoudre */}
                  {fault.status !== FAULT_STATUSES.RESOLUE && fault.status !== FAULT_STATUSES.ANNULEE && 
                   canDo(role, 'resolve_fault', { agencyId: fault.agencyId, currentUser }) && (
                    <button
                      onClick={() => {
                        setSelectedFault(fault);
                        setResMaterials(fault.materialsUsed || []);
                        setShowResolveModal(true);
                      }}
                      className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                      title="Marquer comme résolue"
                    >
                      <Check className="h-4.5 w-4.5 font-bold" />
                    </button>
                  )}

                  {/* Annuler par le signaleur */}
                  {fault.status !== FAULT_STATUSES.RESOLUE && fault.status !== FAULT_STATUSES.ANNULEE && 
                   canDo(role, 'cancel_fault', { signaleurId: fault.signaleurId, currentUser }) && (
                    <button
                      onClick={() => handleCancelFault(fault)}
                      className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100 dark:bg-red-950/20"
                      title="Annuler le ticket"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  )}

                </div>
              </div>
            </div>
          );
        })}

        {filteredFaults.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            Aucun incident ne correspond aux filtres de recherche.
          </div>
        )}
      </div>

      {/* --- MODAL DETAILED COMMENTS & HISTORY --- */}
      {showDetailModal && selectedFault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                Historique & Commentaires du Ticket
              </h3>
              <button 
                onClick={() => {
                  setSelectedFault(null);
                  setShowDetailModal(false);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950 text-xs font-semibold">
                <span className="text-[10px] font-extrabold text-brand uppercase block mb-1">Incident</span>
                <p className="text-slate-800 dark:text-slate-100 font-medium mb-2">{selectedFault.description}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <span>Créé le : {formatDate(selectedFault.createdAt)}</span>
                  <span>Statut : <strong className="text-slate-700 dark:text-slate-200">{selectedFault.status}</strong></span>
                </div>
              </div>

              {/* Matériels utilisés si résolue */}
              {selectedFault.materialsUsed && selectedFault.materialsUsed.length > 0 && (
                <div className="rounded-xl bg-violetSec/5 p-4 border border-violetSec/10 text-xs font-semibold">
                  <span className="text-[10px] font-extrabold text-violetSec uppercase block mb-1">Matériels Consommés</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                    {selectedFault.materialsUsed.map((m, i) => (
                      <li key={i}>{m.name} x {m.quantity} {m.unit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Liste des commentaires */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Commentaires</span>
                {selectedFault.comments && selectedFault.comments.length > 0 ? (
                  selectedFault.comments.map((comm, idx) => (
                    <div key={idx} className="rounded-lg bg-blue-50/50 p-3 text-xs font-semibold text-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                      {comm}
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic font-bold">Aucun commentaire de diagnostic pour le moment.</p>
                )}
              </div>

              {/* Saisie nouveau commentaire */}
              {selectedFault.status !== FAULT_STATUSES.RESOLUE && selectedFault.status !== FAULT_STATUSES.ANNULEE && (
                <div className="space-y-2 pt-2 border-t border-brand-border dark:border-slate-800">
                  <textarea
                    rows="2"
                    placeholder="Saisir une note de diagnostic ou une mise à jour terrain..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full rounded-xl border-2 border-brand-border bg-white p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  ></textarea>
                  <button
                    onClick={handleAddComment}
                    className="rounded-xl bg-brand py-2 px-4 text-xs font-bold text-white hover:bg-brand/90 transition shadow float-right"
                  >
                    Ajouter le commentaire
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* --- MODAL RESOLUTION AVEC CHOIX STOCKS --- */}
      {showResolveModal && selectedFault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center">
                <Hammer className="mr-2 h-5 w-5 text-emerald-500" />
                Résolution de l'incident
              </h3>
              <button 
                onClick={() => {
                  setSelectedFault(null);
                  setShowResolveModal(false);
                  setResMaterials([]);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              <div className="text-xs font-semibold text-slate-500">
                L'action marquera la panne comme résolue, calculera la durée de résolution et décrémentera automatiquement les stocks consommés ci-dessous.
              </div>

              {/* Choix des consommations de stock de l'agence */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">
                  Matériels consommés lors de la résolution
                </label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <select
                      value={selectedStockId}
                      onChange={(e) => setSelectedStockId(e.target.value)}
                      className="w-full rounded-xl border-2 border-brand-border bg-white p-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <option value="">-- Choisir un matériel --</option>
                      {stocks.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.quantity} {s.unit} dispo)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border-2 border-brand-border bg-white p-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddResMaterial}
                    className="rounded-xl bg-violetSec/10 p-2.5 text-violetSec hover:bg-violetSec/20 dark:bg-violetSec/20"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Matériels listés */}
              {resMaterials.length > 0 ? (
                <div className="rounded-xl bg-slate-50 p-3 space-y-2 dark:bg-slate-950 border border-brand-border dark:border-slate-800 max-h-32 overflow-y-auto">
                  {resMaterials.map((mat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">
                        {mat.name} x {mat.quantity} {mat.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveResMaterial(idx)}
                        className="text-red-500 hover:bg-red-50 rounded p-1 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 italic">Aucun équipement consommé déclaré.</p>
              )}

              <div className="pt-4 border-t border-brand-border dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFault(null);
                    setShowResolveModal(false);
                    setResMaterials([]);
                  }}
                  className="rounded-xl border-2 border-brand-border px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleResolveFault}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow"
                >
                  Marquer comme résolue ✓
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FaultsPage;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { 
  stocksService, 
  stockGlobalService, 
  stockRequestsService, 
  agenciesService 
} from '../services/dataService';
import { 
  AGENCY_STOCK_CATEGORIES, 
  GLOBAL_STOCK_CATEGORIES, 
  STOCK_REQUEST_STATUSES 
} from '../utils/constants';
import Toast from '../components/UI/Toast';
import { 
  Database, 
  Plus, 
  AlertTriangle, 
  ArrowUpRight, 
  Check, 
  X, 
  ShoppingCart, 
  TrendingDown, 
  ListOrdered, 
  Cpu, 
  RefreshCw,
  Trash2,
  Edit
} from 'lucide-react';

export const StocksPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  // Onglets : 'agency' | 'global' | 'requests'
  const [activeTab, setActiveTab] = useState('agency');

  const [agencyStocks, setAgencyStocks] = useState([]);
  const [globalStocks, setGlobalStocks] = useState([]);
  const [stockRequests, setStockRequests] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire Stock d'Agence / Central
  const [showStockModal, setShowStockModal] = useState(false);
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [editingStockId, setEditingStockId] = useState(null);
  const [stockFormData, setStockFormData] = useState({
    name: '',
    category: 'switch',
    quantity: 0,
    minThreshold: 5,
    unit: 'pièces',
    agencyId: currentUser?.agencyId || ''
  });

  // Formulaire Demande d'Approvisionnement
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqItemName, setReqItemName] = useState('');
  const [reqQty, setReqQty] = useState(1);
  const [reqUnit, setReqUnit] = useState('pièces');
  
  // Note de revue
  const [reviewNote, setReviewNote] = useState('');
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allAgencies = await agenciesService.getAll();
      setAgencies(allAgencies);

      // 1. Stock d'agence
      if (currentUser?.agencyId) {
        const myAgencyStock = await stocksService.getAll([
          { field: 'agencyId', op: '==', value: currentUser.agencyId }
        ]);
        setAgencyStocks(myAgencyStock);
      } else if (role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) {
        // Directeur/Contrôleur voient tout le stock d'agence agrégé
        const allAgencyStocks = await stocksService.getAll();
        setAgencyStocks(allAgencyStocks);
      }

      // 2. Stock global (contrôleur et directeur uniquement)
      if (role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) {
        const globalStk = await stockGlobalService.getAll();
        setGlobalStocks(globalStk);
      }

      // 3. Requêtes d'approvisionnement
      const reqs = await stockRequestsService.getAll();
      let filteredReqs = reqs;
      
      // Filtrer les requêtes selon le rôle
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        filteredReqs = reqs.filter(r => r.agencyId === currentUser?.agencyId);
      }
      setStockRequests(filteredReqs);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du chargement des stocks.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      loadData();
      // Ajuster l'onglet par défaut si contrôleur
      if (role === ROLES.CONTROLEUR) {
        setActiveTab('global');
      }
    }
  }, [role, currentUser]);

  // Consommer stock d'agence (décrémenter de 1)
  const handleConsume = async (item) => {
    if (item.quantity <= 0) {
      showToast("Le stock est déjà épuisé !", "error");
      return;
    }

    if (!canDo(role, 'consume_stock', { agencyId: item.agencyId, currentUser })) {
      showToast("Vous n'êtes pas autorisé à consommer le stock.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };
      const newQty = item.quantity - 1;
      await stocksService.update(item.id, {
        quantity: newQty
      }, userContext);

      showToast(`Consommé 1 ${item.unit} de ${item.name}. Restant : ${newQty}`);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la consommation.", "error");
    }
  };

  // Enregistrer ou modifier un produit du stock d'agence ou global
  const handleSaveStock = async (e) => {
    e.preventDefault();
    const isGlobalProduct = activeTab === 'global';

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      if (isGlobalProduct) {
        // Enregistrer dans stock global
        if (!canDo(role, 'manage_stock')) {
          showToast("Non autorisé.", "error");
          return;
        }

        const payload = {
          name: stockFormData.name,
          category: stockFormData.category,
          quantity: Number(stockFormData.quantity),
          minThreshold: Number(stockFormData.minThreshold),
          unit: stockFormData.unit
        };

        if (isEditingStock) {
          await stockGlobalService.update(editingStockId, payload, userContext);
          showToast("Produit global modifié.");
        } else {
          const id = `globalstk_${Date.now()}`;
          await stockGlobalService.create({ id, ...payload }, userContext);
          showToast("Nouveau produit global créé.");
        }
      } else {
        // Enregistrer dans stock d'agence
        const targetAgencyId = currentUser.agencyId || stockFormData.agencyId;
        if (!canDo(role, 'manage_stock', { agencyId: targetAgencyId, currentUser })) {
          showToast("Seul le chef d'agence peut modifier le stock de l'agence.", "error");
          return;
        }

        const payload = {
          name: stockFormData.name,
          category: stockFormData.category,
          quantity: Number(stockFormData.quantity),
          minThreshold: Number(stockFormData.minThreshold),
          unit: stockFormData.unit,
          agencyId: targetAgencyId
        };

        if (isEditingStock) {
          await stocksService.update(editingStockId, payload, userContext);
          showToast("Stock agence mis à jour.");
        } else {
          const id = `agencystk_${Date.now()}`;
          await stocksService.create({ id, ...payload }, userContext);
          showToast("Nouveau matériel d'agence créé.");
        }
      }

      await loadData();
      handleCloseStockModal();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la sauvegarde.", "error");
    }
  };

  const handleEditStockClick = (item, isGlobal) => {
    setStockFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      minThreshold: item.minThreshold,
      unit: item.unit,
      agencyId: item.agencyId || ''
    });
    setEditingStockId(item.id);
    setIsEditingStock(true);
    setShowStockModal(true);
  };

  const handleDeleteStockClick = async (item, isGlobal) => {
    if (!window.confirm(`Supprimer "${item.name}" du stock ?`)) return;

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      if (isGlobal) {
        await stockGlobalService.delete(item.id, userContext);
      } else {
        await stocksService.delete(item.id, userContext);
      }
      showToast("Article supprimé.");
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Créer une requête d'approvisionnement (Chef d'agence)
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reqItemName || reqQty <= 0) return;

    if (!canDo(role, 'request_stock', { agencyId: currentUser.agencyId, currentUser })) {
      showToast("Seul le chef d'agence peut effectuer des demandes d'approvisionnement.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      const reqId = `req_${Date.now()}`;
      const payload = {
        id: reqId,
        agencyId: currentUser.agencyId,
        requestedBy: currentUser.uid,
        items: [{ name: reqItemName, quantity: Number(reqQty), unit: reqUnit }],
        status: STOCK_REQUEST_STATUSES.EN_ATTENTE,
        reviewedBy: null,
        reviewNote: ''
      };

      await stockRequestsService.create(payload, userContext);
      showToast("Demande d'approvisionnement envoyée au contrôleur.");
      
      setReqItemName('');
      setReqQty(1);
      setShowReqModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Erreur d'envoi.", "error");
    }
  };

  // Valider / Refuser une requête (Contrôleur)
  const handleReviewRequest = async (approved) => {
    if (!selectedRequestForReview) return;

    if (!canDo(role, 'review_stock_request')) {
      showToast("Action réservée au contrôleur.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      const status = approved ? STOCK_REQUEST_STATUSES.APPROUVEE : STOCK_REQUEST_STATUSES.REFUSEE;
      
      // Mettre à jour la requête
      await stockRequestsService.update(selectedRequestForReview.id, {
        status,
        reviewedBy: currentUser.uid,
        reviewNote: reviewNote.trim()
      }, userContext);

      // Si APPROUVÉE, on injecte automatiquement les items dans le stock d'agence de l'agence concernée!
      if (approved) {
        const requestedItem = selectedRequestForReview.items[0];
        
        // Chercher si l'article existe déjà dans le stock d'agence
        const currentAgencyStocks = await stocksService.getAll([
          { field: 'agencyId', op: '==', value: selectedRequestForReview.agencyId }
        ]);

        const existingItem = currentAgencyStocks.find(s => s.name.toLowerCase() === requestedItem.name.toLowerCase());

        if (existingItem) {
          // On incrémente
          await stocksService.update(existingItem.id, {
            quantity: existingItem.quantity + requestedItem.quantity
          }, userContext);
        } else {
          // On crée une nouvelle entrée
          const newStockId = `agencystk_${Date.now()}`;
          await stocksService.create({
            id: newStockId,
            agencyId: selectedRequestForReview.agencyId,
            name: requestedItem.name,
            category: 'autre', // par défaut
            quantity: requestedItem.quantity,
            minThreshold: 5,
            unit: requestedItem.unit || 'pièces'
          }, userContext);
        }
      }

      showToast(approved ? "Demande approuvée. Le stock de l'agence a été approvisionné !" : "Demande refusée.");
      setShowReviewModal(false);
      setSelectedRequestForReview(null);
      setReviewNote('');
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Erreur d'enregistrement.", "error");
    }
  };

  const handleCloseStockModal = () => {
    setStockFormData({
      name: '',
      category: 'switch',
      quantity: 0,
      minThreshold: 5,
      unit: 'pièces',
      agencyId: currentUser?.agencyId || ''
    });
    setEditingStockId(null);
    setIsEditingStock(false);
    setShowStockModal(false);
  };

  const getRequestStatusBadge = (status) => {
    const styles = {
      en_attente: "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400",
      approuvée: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400",
      refusée: "bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400"
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${styles[status]}`}>
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
            Gestion des Stocks
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Équipements d'agences, stock central et requêtes d'approvisionnement
          </p>
        </div>

        {/* Boutons contextuels */}
        <div className="flex space-x-2">
          {activeTab === 'requests' && canDo(role, 'request_stock', { agencyId: currentUser.agencyId, currentUser }) && (
            <button
              onClick={() => setShowReqModal(true)}
              className="flex items-center justify-center space-x-2 rounded-[14px] bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-lg"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Demander du matériel</span>
            </button>
          )}

          {activeTab === 'agency' && canDo(role, 'manage_stock', { agencyId: currentUser.agencyId, currentUser }) && (
            <button
              onClick={() => {
                resetStockForm();
                setShowStockModal(true);
              }}
              className="flex items-center justify-center space-x-2 rounded-[14px] bg-violetSec px-4 py-2.5 text-xs font-bold text-white shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter matériel agence</span>
            </button>
          )}

          {activeTab === 'global' && canDo(role, 'manage_stock') && (
            <button
              onClick={() => {
                resetStockForm();
                setShowStockModal(true);
              }}
              className="flex items-center justify-center space-x-2 rounded-[14px] bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>Créer produit central</span>
            </button>
          )}
        </div>
      </div>

      {/* --- ONGLET NAVIGATION --- */}
      <div className="flex border-b border-brand-border dark:border-slate-800">
        
        {/* Onglet Agence visible pour tous sauf contrôleur par défaut */}
        <button
          onClick={() => setActiveTab('agency')}
          className={`py-3 px-6 text-xs font-extrabold tracking-wider transition-colors border-b-2 ${
            activeTab === 'agency' 
              ? 'border-brand text-brand dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR ? 'Stocks des agences' : 'Mon stock agence'}
        </button>

        {/* Stock central : uniquement Directeur / Contrôleur */}
        {(role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) && (
          <button
            onClick={() => setActiveTab('global')}
            className={`py-3 px-6 text-xs font-extrabold tracking-wider transition-colors border-b-2 ${
              activeTab === 'global' 
                ? 'border-brand text-brand dark:text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Stock global central (MikroTik)
          </button>
        )}

        <button
          onClick={() => setActiveTab('requests')}
          className={`py-3 px-6 text-xs font-extrabold tracking-wider transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === 'requests' 
              ? 'border-brand text-brand dark:text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>Approvisionnements</span>
          {role === ROLES.CONTROLEUR && stockRequests.filter(r => r.status === STOCK_REQUEST_STATUSES.EN_ATTENTE).length > 0 && (
            <span className="bg-amber-500 text-white rounded-full h-4.5 w-4.5 flex items-center justify-center text-[9px] font-black">
              {stockRequests.filter(r => r.status === STOCK_REQUEST_STATUSES.EN_ATTENTE).length}
            </span>
          )}
        </button>

      </div>

      {/* --- CONTENU ONGLET 1: STOCK AGENCE --- */}
      {activeTab === 'agency' && (
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                  <th className="pb-3 pl-2">Matériel</th>
                  <th className="pb-3">Catégorie</th>
                  {role === ROLES.DIRECTEUR && <th className="pb-3">Agence</th>}
                  <th className="pb-3 text-right">Quantité</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-slate-800">
                {agencyStocks.map((item) => {
                  const isLow = item.quantity <= item.minThreshold;
                  const itemAgency = agencies.find(a => a.id === item.agencyId);
                  
                  return (
                    <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 pl-2">
                        <span className="font-extrabold text-slate-800 dark:text-white block">{item.name}</span>
                        {isLow && (
                          <span className="inline-flex items-center text-[9px] font-bold text-amber-600 uppercase mt-0.5">
                            <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-500" />
                            Seuil critique atteint ({item.minThreshold})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 uppercase text-slate-400 text-[10px] tracking-wider">{item.category}</td>
                      {role === ROLES.DIRECTEUR && <td className="py-3.5 text-slate-500">{itemAgency ? itemAgency.name : 'N/A'}</td>}
                      <td className="py-3.5 text-right font-black">
                        <span className={isLow ? 'text-red-500 font-extrabold' : 'text-slate-800 dark:text-slate-100'}>
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="inline-flex space-x-1">
                          
                          {/* Décrémentation rapide */}
                          {canDo(role, 'consume_stock', { agencyId: item.agencyId, currentUser }) && (
                            <button
                              onClick={() => handleConsume(item)}
                              disabled={item.quantity <= 0}
                              className="rounded-lg bg-violetSec/10 px-2.5 py-1 text-[10px] font-bold text-violetSec hover:bg-violetSec/20 disabled:opacity-40"
                              title="Décrémenter (Consommer 1)"
                            >
                              Consommer -1
                            </button>
                          )}

                          {/* Edition chef de gare */}
                          {canDo(role, 'manage_stock', { agencyId: item.agencyId, currentUser }) && (
                            <>
                              <button
                                onClick={() => handleEditStockClick(item, false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStockClick(item, false)}
                                className="rounded-lg p-1 text-red-400 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
                {agencyStocks.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Aucun article répertorié dans ce stock d'agence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CONTENU ONGLET 2: STOCK CENTRAL (DIRECTEUR / CONTROLEUR) --- */}
      {activeTab === 'global' && (role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) && (
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                  <th className="pb-3 pl-2">Matériel</th>
                  <th className="pb-3">Catégorie</th>
                  <th className="pb-3 text-right">Seuil Alerte</th>
                  <th className="pb-3 text-right">Quantité Centrale</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-slate-800">
                {globalStocks.map((item) => (
                  <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-3.5 pl-2">
                      <span className="font-extrabold text-slate-800 dark:text-white block">{item.name}</span>
                    </td>
                    <td className="py-3.5 uppercase text-[10px] tracking-wider text-slate-400">{item.category}</td>
                    <td className="py-3.5 text-right text-slate-500 font-medium">{item.minThreshold} {item.unit}</td>
                    <td className="py-3.5 text-right font-black text-brand dark:text-blue-400">{item.quantity} {item.unit}</td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="inline-flex space-x-1">
                        {canDo(role, 'manage_stock') && (
                          <>
                            <button
                              onClick={() => handleEditStockClick(item, true)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStockClick(item, true)}
                              className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CONTENU ONGLET 3: APPROVISIONNEMENTS --- */}
      {activeTab === 'requests' && (
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                  <th className="pb-3 pl-2">Date Demande</th>
                  <th className="pb-3">Agence</th>
                  <th className="pb-3">Matériel demandé</th>
                  <th className="pb-3">Note du contrôleur</th>
                  <th className="pb-3 text-center">Statut</th>
                  <th className="pb-3 text-right pr-2">Revue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border dark:divide-slate-800">
                {stockRequests.map((req) => {
                  const reqAgency = agencies.find(a => a.id === req.agencyId);
                  const firstItem = req.items?.[0] || { name: 'Inconnu', quantity: 0, unit: 'pièces' };
                  
                  return (
                    <tr key={req.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 pl-2">{formatDate(req.createdAt)}</td>
                      <td className="py-3.5 text-slate-500">{reqAgency ? reqAgency.name : 'Inconnue'}</td>
                      <td className="py-3.5">
                        <span className="font-extrabold text-slate-800 dark:text-white">
                          {firstItem.name} x {firstItem.quantity} {firstItem.unit}
                        </span>
                      </td>
                      <td className="py-3.5 text-[11px] text-slate-400 italic">
                        {req.reviewNote || 'En attente de traitement.'}
                      </td>
                      <td className="py-3.5 text-center">{getRequestStatusBadge(req.status)}</td>
                      <td className="py-3.5 text-right pr-2">
                        {role === ROLES.CONTROLEUR && req.status === STOCK_REQUEST_STATUSES.EN_ATTENTE ? (
                          <button
                            onClick={() => {
                              setSelectedRequestForReview(req);
                              setShowReviewModal(true);
                            }}
                            className="rounded-lg bg-brand px-2.5 py-1 text-[10px] font-black text-white hover:bg-brand/90"
                          >
                            Traiter
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">Verrouillé</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {stockRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Aucune demande d'approvisionnement répertoriée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL TRAITEMENT DEMANDE (CONTRÔLEUR) --- */}
      {showReviewModal && selectedRequestForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 mb-4">
              Traitement de la demande de réapprovisionnement
            </h3>

            <div className="space-y-4 text-xs font-semibold">
              <div className="rounded-xl bg-brand-light p-3.5 dark:bg-slate-800">
                <p>Demandeur : <strong className="text-brand dark:text-blue-300">Agence {agencies.find(a => a.id === selectedRequestForReview.agencyId)?.name}</strong></p>
                <p className="mt-1">Article demandé : <strong className="text-brand dark:text-blue-300">{selectedRequestForReview.items[0]?.name} x {selectedRequestForReview.items[0]?.quantity} {selectedRequestForReview.items[0]?.unit}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Note de validation / Motif de refus
                </label>
                <textarea
                  rows="3"
                  placeholder="Ex : Validé, expédié par colis de transport ou quantité ramenée à 5..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full rounded-[14px] border-2 border-brand-border p-3 text-xs outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequestForReview(null);
                    setShowReviewModal(false);
                    setReviewNote('');
                  }}
                  className="rounded-xl border-2 px-4 py-2"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewRequest(false)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700 font-bold"
                >
                  Refuser ✗
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewRequest(true)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 font-bold"
                >
                  Approuver ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CRÉATION DEMANDE (CHEF AGENCE) --- */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 mb-4">
              Nouvelle demande d'approvisionnement
            </h3>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Matériel requis (Nom exact ou modèle)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Câble FTP Cat6 ou Switch 8 ports"
                  value={reqItemName}
                  onChange={(e) => setReqItemName(e.target.value)}
                  className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Quantité requise
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={reqQty}
                    onChange={(e) => setReqQty(Number(e.target.value))}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Unité
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="pièces, cartons, mètres..."
                    value={reqUnit}
                    onChange={(e) => setReqUnit(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="rounded-xl border-2 px-4 py-2"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-2.5 text-white font-bold"
                >
                  Envoyer la requête
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CRÉATION / ÉDITION STOCK AGENCE OU GLOBAL --- */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-800 dark:text-white border-b pb-3 mb-4">
              {isEditingStock ? "Modifier l'article stock" : "Ajouter un article au stock"}
            </h3>

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Nom exact du matériel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MikroTik hEX lite RB750r2"
                  value={stockFormData.name}
                  onChange={(e) => setStockFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={stockFormData.category}
                    onChange={(e) => setStockFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  >
                    {(activeTab === 'global' ? GLOBAL_STOCK_CATEGORIES : AGENCY_STOCK_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Unité de mesure
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="pièces, mètres, cartons..."
                    value={stockFormData.unit}
                    onChange={(e) => setStockFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Quantité initiale
                  </label>
                  <input
                    type="number"
                    required
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Seuil critique d'alerte *
                  </label>
                  <input
                    type="number"
                    required
                    value={stockFormData.minThreshold}
                    onChange={(e) => setStockFormData(prev => ({ ...prev, minThreshold: Number(e.target.value) }))}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  />
                </div>
              </div>

              {role === ROLES.DIRECTEUR && activeTab === 'agency' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Pour quelle agence ?
                  </label>
                  <select
                    value={stockFormData.agencyId}
                    onChange={(e) => setStockFormData(prev => ({ ...prev, agencyId: e.target.value }))}
                    className="w-full rounded-[14px] border-2 border-[#dce6f0] p-3 text-xs"
                  >
                    <option value="">-- Choisir l'agence --</option>
                    {agencies.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCloseStockModal}
                  className="rounded-xl border-2 px-4 py-2"
                >
                  Annuler
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

  function resetStockForm() {
    setStockFormData({
      name: '',
      category: 'switch',
      quantity: 0,
      minThreshold: 5,
      unit: 'pièces',
      agencyId: currentUser?.agencyId || ''
    });
    setEditingStockId(null);
    setIsEditingStock(false);
  }
};

export default StocksPage;

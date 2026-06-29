import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { clientsService, basesService, agenciesService } from '../services/dataService';
import { CODES, MAX_CASES } from '../utils/constants';
import { calculateClientIp } from '../utils/helpers';
import CaseGrid from '../components/UI/CaseGrid';
import Toast from '../components/UI/Toast';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  MapPin, 
  Phone, 
  Cpu, 
  Info,
  Building2,
  X,
  FileCheck
} from 'lucide-react';

export const ClientsPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [clients, setClients] = useState([]);
  const [bases, setBases] = useState([]);
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [filterBaseId, setFilterBaseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout / modification (Wizard 5 étapes)
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  
  const [step, setStep] = useState(1); // 1 à 5

  // Données du formulaire
  const [formData, setFormData] = useState({
    agencyId: currentUser?.agencyId || '',
    baseId: '',
    numero: null,
    code: '',
    ip: '',
    nom: '',
    telephone: '',
    mac: '',
    localisation: ''
  });

  // Toasts
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Charger les bases et les clients
  const loadData = async () => {
    setLoading(true);
    try {
      const allBases = await basesService.getAll();
      
      // Filtrer les bases selon l'agence de l'utilisateur (sauf directeur / contrôleur)
      let filteredBases = allBases;
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        filteredBases = allBases.filter(b => b.agencyId === currentUser?.agencyId);
      }
      setBases(filteredBases);
      
      if (filteredBases.length > 0) {
        setSelectedBaseId(filteredBases[0].id);
        setFilterBaseId(filteredBases[0].id);
        setFormData(prev => ({ ...prev, baseId: filteredBases[0].id }));
      }

      const allClients = await clientsService.getAll();
      let agencyClients = allClients;
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        agencyClients = allClients.filter(c => c.agencyId === currentUser?.agencyId);
      }
      setClients(agencyClients);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du chargement des données.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      loadData();
    }
  }, [role, currentUser]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Sélection d'une case dans le CaseGrid
  const handleCaseSelect = (numero, code) => {
    const ip = calculateClientIp(numero);
    setFormData(prev => ({
      ...prev,
      numero,
      code,
      ip
    }));
  };

  // Validation des étapes
  const canGoToNextStep = () => {
    switch (step) {
      case 1:
        return formData.numero !== null && formData.baseId;
      case 2:
        return formData.nom.trim().length >= 2;
      case 3:
        return formData.telephone.trim().length >= 4;
      case 4:
        return formData.mac.trim().length === 4 && formData.localisation.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (canGoToNextStep()) {
      setStep(prev => prev + 1);
    } else {
      showToast("Veuillez remplir correctement les champs de cette étape.", "error");
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleSaveClient = async () => {
    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      const finalClientData = {
        ...formData,
        nom: formData.nom.trim(),
        telephone: formData.telephone.trim(),
        mac: formData.mac.trim().toUpperCase(),
        localisation: formData.localisation.trim(),
        agencyId: currentUser.agencyId || formData.agencyId // Par défaut l'agence de l'utilisateur
      };

      if (isEditing) {
        // Double check permissions
        if (!canDo(role, 'edit_client', { agencyId: finalClientData.agencyId, currentUser })) {
          showToast("Vous n'avez pas l'autorisation de modifier ce client.", "error");
          return;
        }
        await clientsService.update(editingClientId, finalClientData, userContext);
        showToast("Fiche client mise à jour avec succès !");
      } else {
        // Enregistrement
        if (!canDo(role, 'create_client', { agencyId: finalClientData.agencyId, currentUser })) {
          showToast("Vous n'avez pas l'autorisation de créer un client.", "error");
          return;
        }
        const newClientId = `client_${Date.now()}`;
        await clientsService.create({ id: newClientId, ...finalClientData }, userContext);
        showToast("Nouveau client enregistré avec succès !");
      }

      // Recharger la liste locale
      await loadData();
      resetForm();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la sauvegarde.", "error");
    }
  };

  const handleDeleteClient = async (id, clientAgencyId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

    if (!canDo(role, 'delete_client', { agencyId: clientAgencyId, currentUser })) {
      showToast("Vous n'avez pas l'autorisation de supprimer ce client.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };
      await clientsService.delete(id, userContext);
      showToast("Client supprimé.");
      await loadData();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la suppression.", "error");
    }
  };

  const handleEditClick = (client) => {
    if (!canDo(role, 'edit_client', { agencyId: client.agencyId, currentUser })) {
      showToast("Seul l'opérateur de l'agence peut modifier un client.", "error");
      return;
    }
    
    setFormData({
      agencyId: client.agencyId,
      baseId: client.baseId,
      numero: client.numero,
      code: client.code,
      ip: client.ip,
      nom: client.nom,
      telephone: client.telephone,
      mac: client.mac,
      localisation: client.localisation
    });
    setEditingClientId(client.id);
    setIsEditing(true);
    setShowForm(true);
    setStep(1);
  };

  const resetForm = () => {
    setFormData({
      agencyId: currentUser?.agencyId || '',
      baseId: bases[0]?.id || '',
      numero: null,
      code: '',
      ip: '',
      nom: '',
      telephone: '',
      mac: '',
      localisation: ''
    });
    setIsEditing(false);
    setEditingClientId(null);
    setShowForm(false);
    setStep(1);
  };

  // Filtrer la liste des clients
  const filteredClients = clients.filter(c => {
    const matchesBase = filterBaseId ? c.baseId === filterBaseId : true;
    const matchesSearch = c.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.telephone.includes(searchTerm) ||
                          (c.numero && c.numero.toString() === searchTerm);
    return matchesBase && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
            Gestion des Clients
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Enregistrement étape par étape et suivi des raccordements
          </p>
        </div>

        {/* Afficher le bouton Ajouter uniquement si le rôle est autorisé */}
        {!showForm && canDo(role, 'create_client', { agencyId: currentUser.agencyId, currentUser }) && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center justify-center space-x-2 rounded-[14px] bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand/95"
          >
            <Plus className="h-4 w-4" />
            <span>Enregistrer un client</span>
          </button>
        )}
      </div>

      {/* --- WIZARD FORMULAIRE (5 ÉTAPES) --- */}
      {showForm && (
        <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          
          <div className="flex items-center justify-between border-b border-brand-border pb-4 dark:border-slate-800">
            <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center">
              <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-light text-brand text-xs dark:bg-slate-800 dark:text-blue-400 font-extrabold">
                {step}
              </span>
              {isEditing ? "Modification Client" : "Enregistrement Client"} — Étape {step} / 5
            </h2>
            <button 
              onClick={resetForm}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Indicateur de progression visuel */}
          <div className="mt-4 flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="flex-1">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    num <= step ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                ></div>
              </div>
            ))}
          </div>

          <div className="mt-6 py-4">

            {/* ÉTAPE 1: Numéro & Code & Base (CaseGrid) */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Base de rattachement
                    </label>
                    <select
                      value={formData.baseId}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          baseId: e.target.value,
                          numero: null,
                          code: '',
                          ip: ''
                        }));
                      }}
                      className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="">-- Choisir une base --</option>
                      {bases.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.quartier})</option>
                      ))}
                    </select>
                  </div>

                  {formData.numero && (
                    <div className="rounded-[14px] bg-brand-light p-4 dark:bg-slate-800 flex flex-col justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand dark:text-blue-400 block mb-1">
                        Infos Raccordement calculées
                      </span>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                        Case : <strong className="text-brand dark:text-blue-300">N° {formData.numero}</strong> | Code : <strong className="text-brand dark:text-blue-300">{formData.code}</strong>
                      </p>
                      <p className="text-xs text-brand font-mono mt-0.5 dark:text-blue-300">IP générée : {formData.ip}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-border pt-4 dark:border-slate-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Sélectionnez la case du boîtier client
                  </label>
                  <CaseGrid 
                    baseId={formData.baseId} 
                    selectedNumero={formData.numero} 
                    onSelect={handleCaseSelect}
                    currentClientId={editingClientId}
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 2: Nom */}
            {step === 2 && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Infos Automatiques (Générées)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`Case N° ${formData.numero} | Code ${formData.code} | IP ${formData.ip}`}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-brand-light p-3.5 text-sm font-black text-brand outline-none dark:bg-slate-800 dark:text-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Nom complet du client
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Prénom et nom de famille"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* ÉTAPE 3: Téléphone */}
            {step === 3 && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Numéro de téléphone
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      inputMode="tel"
                      required
                      placeholder="Ex: +228 90 00 00 00"
                      value={formData.telephone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full rounded-[14px] border-2 border-brand-border bg-white py-3.5 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 4: MAC & Localisation */}
            {step === 4 && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Adresse MAC (4 caractères finaux)
                  </label>
                  <p className="text-[10px] font-semibold text-slate-400 mb-2">Saisir les 4 derniers caractères de l'adresse MAC (ex : A3F8)</p>
                  <input
                    type="text"
                    maxLength="4"
                    required
                    placeholder="A1B2"
                    value={formData.mac}
                    onChange={(e) => setFormData(prev => ({ ...prev, mac: e.target.value.toUpperCase().slice(0, 4) }))}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-3.5 text-sm font-mono font-bold uppercase tracking-widest text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Localisation (Coordonnées GPS / Code Plus)
                  </label>
                  <p className="text-[10px] font-semibold text-slate-400 mb-2">Exemple : 6.1345, 1.2345 ou Code Plus : 865H+M</p>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="865H+M9 Lomé"
                      value={formData.localisation}
                      onChange={(e) => setFormData(prev => ({ ...prev, localisation: e.target.value }))}
                      className="w-full rounded-[14px] border-2 border-brand-border bg-white py-3.5 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 5: Récapitulatif & Confirmation */}
            {step === 5 && (
              <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-950 border border-brand-border dark:border-slate-800 max-w-xl">
                <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center">
                  <FileCheck className="mr-2 h-5 w-5 text-emerald-500" />
                  Récapitulatif des informations saisies
                </h3>
                
                <div className="divide-y divide-brand-border dark:divide-slate-800 text-xs font-semibold">
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">Base</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {bases.find(b => b.id === formData.baseId)?.name || 'Inconnue'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">Boîtier & Case</span>
                    <span className="text-brand font-bold dark:text-blue-400">
                      Case N° {formData.numero} (Code : {formData.code})
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">IP Client</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono">{formData.ip}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">Nom Complet</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{formData.nom}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">Téléphone</span>
                    <span className="text-slate-800 dark:text-slate-200">{formData.telephone}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">MAC (4 caractères)</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono tracking-widest">{formData.mac}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-slate-400">Localisation</span>
                    <span className="text-slate-800 dark:text-slate-200">{formData.localisation}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Boutons de contrôle du Wizard */}
          <div className="flex items-center justify-between border-t border-brand-border pt-4 mt-6 dark:border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center space-x-1.5 rounded-xl border-2 border-brand-border px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Retour</span>
              </button>
            ) : (
              <div></div> // Empty placeholder to keep next aligned right
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!canGoToNextStep()}
                className="flex items-center space-x-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand/90 disabled:opacity-50"
              >
                <span>Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveClient}
                className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow"
              >
                <Check className="h-4 w-4" />
                <span>Confirmer et enregistrer</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* --- RECHERCHE ET LISTE DES CLIENTS --- */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* Filtres */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, code, case ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400">Base :</span>
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
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              {filteredClients.length} clients
            </span>
          </div>
        </div>

        {/* Tableau de liste */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                <th className="pb-3 pl-2">Case</th>
                <th className="pb-3">Client</th>
                <th className="pb-3">Base</th>
                <th className="pb-3">Téléphone</th>
                <th className="pb-3 font-mono">MAC</th>
                <th className="pb-3 font-mono">IP</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border dark:divide-slate-800">
              {filteredClients.map((client) => {
                const clientBase = bases.find(b => b.id === client.baseId);
                return (
                  <tr key={client.id} className="text-slate-700 hover:bg-slate-50/40 dark:text-slate-300 dark:hover:bg-slate-800/20">
                    <td className="py-3.5 pl-2">
                      <div className="inline-flex flex-col items-center justify-center h-10 w-11 rounded-lg bg-brand-light text-brand dark:bg-slate-800 dark:text-blue-400 font-extrabold text-[11px] leading-tight">
                        <span>{client.numero}</span>
                        <span className="text-[8px] tracking-wide text-slate-500 font-bold dark:text-slate-400">{client.code}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-extrabold text-slate-800 dark:text-white block">{client.nom}</span>
                      <span className="text-[10px] text-slate-400 flex items-center font-medium mt-0.5">
                        <MapPin className="h-3 w-3 mr-0.5" /> {client.localisation}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">{clientBase ? clientBase.name : 'Inconnue'}</td>
                    <td className="py-3.5 font-mono">{client.telephone}</td>
                    <td className="py-3.5 font-mono tracking-wider font-extrabold text-violetSec">{client.mac}</td>
                    <td className="py-3.5 font-mono font-medium text-slate-600 dark:text-slate-400">{client.ip}</td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="inline-flex space-x-1">
                        {canDo(role, 'edit_client', { agencyId: client.agencyId, currentUser }) && (
                          <button
                            onClick={() => handleEditClick(client)}
                            className="rounded-lg p-1.5 text-brand hover:bg-brand-light dark:hover:bg-slate-800"
                            title="Modifier la fiche"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDo(role, 'delete_client', { agencyId: client.agencyId, currentUser }) && (
                          <button
                            onClick={() => handleDeleteClient(client.id, client.agencyId)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Aucun client ne correspond aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default ClientsPage;

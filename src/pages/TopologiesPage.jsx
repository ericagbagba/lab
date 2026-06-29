import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canDo, ROLES } from '../utils/roles';
import { topologiesService, basesService, clientsService } from '../services/dataService';
import { generateId } from '../utils/helpers';
import Toast from '../components/UI/Toast';
import { 
  Network, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Search, 
  Cpu, 
  Info, 
  Layers, 
  MapPin, 
  ExternalLink 
} from 'lucide-react';

export const TopologiesPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [topologies, setTopologies] = useState([]);
  const [bases, setBases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals / forms
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTopoId, setEditingTopoId] = useState(null);
  const [selectedTopo, setSelectedTopo] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [baseId, setBaseId] = useState('');
  const [type, setType] = useState('fibre');
  const [ipAddressing, setIpAddressing] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState(6.12);
  const [lng, setLng] = useState(1.22);
  const [equipments, setEquipments] = useState([]);

  // Subform equipment states
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('router');
  const [eqIp, setEqIp] = useState('');
  const [eqMac, setEqMac] = useState('');
  const [eqClientId, setEqClientId] = useState('');
  const [eqStatus, setEqStatus] = useState('active');
  const [eqNotes, setEqNotes] = useState('');

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allBases = await basesService.getAll();
      const allClients = await clientsService.getAll();
      setClients(allClients);

      let filteredBases = allBases;
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        filteredBases = allBases.filter(b => b.agencyId === currentUser?.agencyId);
      }
      setBases(filteredBases);

      const allTopos = await topologiesService.getAll();
      let visibleTopos = allTopos;
      if (role !== ROLES.DIRECTEUR && role !== ROLES.CONTROLEUR) {
        visibleTopos = allTopos.filter(t => t.agencyId === currentUser?.agencyId);
      }
      setTopologies(visibleTopos);
    } catch (e) {
      console.error(e);
      showToast("Erreur lors du chargement des topologies.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      loadData();
    }
  }, [role, currentUser]);

  const handleAddEquipment = () => {
    if (!eqName) {
      showToast("Le nom de l'équipement est requis.", "warning");
      return;
    }
    const newEq = {
      id: generateId(),
      name: eqName,
      type: eqType,
      ip: eqIp,
      mac: eqMac.toUpperCase(),
      clientId: eqClientId || null,
      status: eqStatus,
      notes: eqNotes
    };
    setEquipments([...equipments, newEq]);
    // Reset inputs
    setEqName('');
    setEqIp('');
    setEqMac('');
    setEqClientId('');
    setEqNotes('');
  };

  const handleRemoveEquipment = (id) => {
    setEquipments(equipments.filter(eq => eq.id !== id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !baseId) {
      showToast("Le nom et la base sont obligatoires.", "error");
      return;
    }

    const topoAgencyId = currentUser.agencyId || bases.find(b => b.id === baseId)?.agencyId;
    const action = isEditing ? 'edit_topology' : 'create_topology';

    if (!canDo(role, action, { agencyId: topoAgencyId, currentUser })) {
      showToast("Seul l'opérateur de l'agence peut créer ou modifier des topologies.", "error");
      return;
    }

    const payload = {
      baseId,
      agencyId: topoAgencyId,
      name,
      type,
      equipments,
      ipAddressing,
      diagrams: [],
      notes,
      location: { lat: Number(lat), lng: Number(lng) }
    };

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };

      if (isEditing) {
        await topologiesService.update(editingTopoId, payload, userContext);
        showToast("Topologie modifiée.");
      } else {
        const id = `topo_${Date.now()}`;
        await topologiesService.create({ id, ...payload }, userContext);
        showToast("Nouvelle topologie créée.");
      }

      await loadData();
      handleCloseForm();
    } catch (e) {
      console.error(e);
      showToast("Erreur lors de la sauvegarde.", "error");
    }
  };

  const handleEditClick = (topo) => {
    if (!canDo(role, 'edit_topology', { agencyId: topo.agencyId, currentUser })) {
      showToast("Seul l'opérateur peut modifier la topologie.", "error");
      return;
    }
    setName(topo.name);
    setBaseId(topo.baseId);
    setType(topo.type);
    setIpAddressing(topo.ipAddressing || '');
    setNotes(topo.notes || '');
    setLat(topo.location?.lat || 6.12);
    setLng(topo.location?.lng || 1.22);
    setEquipments(topo.equipments || []);
    setEditingTopoId(topo.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (topo) => {
    if (!window.confirm("Supprimer cette topologie ?")) return;
    
    // Check permission - although not explicitly detailed in prompt, let's keep delete aligned with operator or directeur
    if (role !== ROLES.DIRECTEUR && role !== ROLES.OPERATEUR) {
      showToast("Vous n'avez pas l'autorisation de supprimer une topologie.", "error");
      return;
    }

    try {
      const userContext = {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        agencyId: currentUser.agencyId,
        role: currentUser.role
      };
      await topologiesService.delete(topo.id, userContext);
      showToast("Topologie supprimée.");
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseForm = () => {
    setName('');
    setBaseId('');
    setType('fibre');
    setIpAddressing('');
    setNotes('');
    setLat(6.12);
    setLng(1.22);
    setEquipments([]);
    setEditingTopoId(null);
    setIsEditing(false);
    setShowModal(false);
  };

  const filteredTopos = topologies.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
            Topologies Réseau
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Schémas, adressage IP et équipements matériels actifs par base
          </p>
        </div>

        {canDo(role, 'create_topology', { agencyId: currentUser.agencyId, currentUser }) && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center space-x-2 rounded-[14px] bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand/95"
          >
            <Plus className="h-4 w-4" />
            <span>Créer une topologie</span>
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom de topologie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[14px] border-2 border-brand-border bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Liste des Topologies */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredTopos.map((topo) => {
          const topoBase = bases.find(b => b.id === topo.baseId);
          return (
            <div 
              key={topo.id} 
              className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400">
                      <Network className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white">
                        {topo.name}
                      </h3>
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-slate-800">
                        Type : {topo.type}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-black text-brand uppercase dark:text-blue-400 bg-brand-light px-2.5 py-1 rounded-lg dark:bg-slate-800">
                    Base : {topoBase ? topoBase.name : 'Inconnue'}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950 space-y-2 text-xs font-semibold">
                  <p className="text-slate-400 uppercase tracking-wider text-[9px] font-extrabold">Adressage IP planifié</p>
                  <p className="text-slate-700 dark:text-slate-300 font-mono">{topo.ipAddressing || 'Non défini'}</p>
                </div>

                {/* Résumé des équipements */}
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Équipements actifs ({topo.equipments?.length || 0})</span>
                  <div className="flex flex-wrap gap-1.5">
                    {topo.equipments?.map((eq, i) => (
                      <span 
                        key={i} 
                        className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold ${
                          eq.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                        title={`IP: ${eq.ip} | MAC: ${eq.mac}`}
                      >
                        <Cpu className="h-3 w-3 mr-1" />
                        {eq.name} ({eq.type})
                      </span>
                    ))}
                    {(!topo.equipments || topo.equipments.length === 0) && (
                      <p className="text-[10px] font-bold text-slate-400 italic">Aucun matériel configuré dans cette topologie.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-brand-border dark:border-slate-800 flex items-center justify-between">
                <div className="text-[10px] text-slate-400 font-bold flex items-center">
                  <MapPin className="h-3 w-3 mr-0.5" /> Lat : {topo.location?.lat} | Lng : {topo.location?.lng}
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setSelectedTopo(topo);
                    }}
                    className="flex items-center space-x-1 rounded-lg border border-brand-border px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>Détails</span>
                  </button>
                  {canDo(role, 'edit_topology', { agencyId: topo.agencyId, currentUser }) && (
                    <button
                      onClick={() => handleEditClick(topo)}
                      className="rounded-lg p-1.5 text-brand hover:bg-brand-light dark:hover:bg-slate-800"
                      title="Modifier"
                    >
                      <Edit className="h-4.5 w-4.5" />
                    </button>
                  )}
                  {role === ROLES.DIRECTEUR && (
                    <button
                      onClick={() => handleDelete(topo)}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTopos.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            Aucune topologie réseau active déclarée.
          </div>
        )}
      </div>

      {/* --- MODAL INFOS DÉTAILS --- */}
      {selectedTopo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                Détail Topologique : {selectedTopo.name}
              </h3>
              <button 
                onClick={() => setSelectedTopo(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-widest block mb-1">Renseignements généraux</span>
                <p className="text-slate-700 dark:text-slate-200">Rattachement : <strong>{bases.find(b => b.id === selectedTopo.baseId)?.name || 'Inconnue'}</strong></p>
                <p className="text-slate-700 dark:text-slate-200">Technologie : <strong className="uppercase">{selectedTopo.type}</strong></p>
                <p className="text-slate-500 font-medium mt-1">{selectedTopo.notes || 'Aucune note sur ce schéma.'}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-400 font-extrabold tracking-widest block mb-2">Equipements Matériels Configurés ({selectedTopo.equipments?.length || 0})</span>
                <div className="space-y-2.5">
                  {selectedTopo.equipments?.map((eq, idx) => (
                    <div key={idx} className="rounded-xl border border-brand-border p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-slate-800 dark:text-white">{eq.name} ({eq.type})</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${eq.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                          {eq.status}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 flex flex-wrap gap-x-4">
                        <span>IP : <strong className="text-slate-700 dark:text-slate-300">{eq.ip || 'N/A'}</strong></span>
                        <span>MAC : <strong className="text-slate-700 dark:text-slate-300">{eq.mac || 'N/A'}</strong></span>
                      </div>
                      {eq.notes && <p className="text-[10px] text-slate-400 font-medium italic mt-1">{eq.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- FORMULAIRE CRÉATION/MODIF MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-65 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-brand-border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                {isEditing ? "Modifier le schéma topologique" : "Créer un schéma topologique"}
              </h3>
              <button 
                onClick={handleCloseForm}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Nom du schéma *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Topo Base Centrale"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Base de rattachement *
                  </label>
                  <select
                    required
                    value={baseId}
                    onChange={(e) => setBaseId(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="">-- Choisir la base --</option>
                    {bases.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Technologie *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="fibre">Fibre</option>
                    <option value="cuivre">Cuivre</option>
                    <option value="radio">Radio</option>
                    <option value="mixte">Mixte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Plan d'adressage IP (Plages, Passerelles)
                </label>
                <input
                  type="text"
                  placeholder="Ex : 10.50.1.0/24 (VLAN 100)"
                  value={ipAddressing}
                  onChange={(e) => setIpAddressing(e.target.value)}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              {/* --- SECTION MATERIELS --- */}
              <div className="border-t border-brand-border pt-3 dark:border-slate-800">
                <span className="block text-[10px] font-black uppercase text-violetSec mb-2">Ajouter des équipements matériels</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nom de l'équipement (ex: Switch Cisco 2960)"
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    className="rounded-xl border-2 border-brand-border p-2 text-xs font-bold outline-none"
                  />
                  <select
                    value={eqType}
                    onChange={(e) => setEqType(e.target.value)}
                    className="rounded-xl border-2 border-brand-border p-2 text-xs font-bold outline-none"
                  >
                    <option value="router">Routeur</option>
                    <option value="switch">Switch</option>
                    <option value="antenne">Antenne</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                
                <div className="grid gap-2 sm:grid-cols-2 mt-2">
                  <input
                    type="text"
                    placeholder="Adresse IP (ex: 10.50.1.254)"
                    value={eqIp}
                    onChange={(e) => setEqIp(e.target.value)}
                    className="rounded-xl border-2 border-brand-border p-2 text-xs font-bold outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Adresse MAC (ex: E0:4F:D3:11)"
                    value={eqMac}
                    onChange={(e) => setEqMac(e.target.value)}
                    className="rounded-xl border-2 border-brand-border p-2 text-xs font-bold outline-none"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Notes (ex: Rack principal)"
                    value={eqNotes}
                    onChange={(e) => setEqNotes(e.target.value)}
                    className="flex-1 rounded-xl border-2 border-brand-border p-2 text-xs font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEquipment}
                    className="rounded-xl bg-violetSec/10 text-violetSec px-3 font-extrabold hover:bg-violetSec/20"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Liste des équipements temporaires */}
                {equipments.length > 0 && (
                  <div className="rounded-xl bg-slate-50 border p-2 mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {equipments.map((eq) => (
                      <div key={eq.id} className="flex items-center justify-between text-[11px] font-bold">
                        <span>{eq.name} ({eq.type}) — {eq.ip}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipment(eq.id)}
                          className="text-red-500 hover:bg-red-50 p-0.5 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Notes / Remarques générales
                </label>
                <textarea
                  rows="2"
                  placeholder="Informations d'accès, câblage, raccordement..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-[14px] border-2 border-brand-border bg-white p-2.5 text-xs font-bold outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-950"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-brand-border dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-xl border-2 border-brand-border px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-white hover:bg-brand/90 transition shadow"
                >
                  Enregistrer la topologie
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default TopologiesPage;

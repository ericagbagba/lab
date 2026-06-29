import Dexie from 'dexie';

export const localDb = new Dexie('BitLocalDb');

// Définir le schéma de base de données Dexie
localDb.version(1).stores({
  clients: 'id, agencyId, baseId, numero, code, _pendingSync',
  faults: 'id, agencyId, baseId, clientId, status, _pendingSync',
  bases: 'id, agencyId, _pendingSync',
  stocks: 'id, agencyId, category, _pendingSync',
  stockRequests: 'id, agencyId, status, _pendingSync',
  topologies: 'id, baseId, agencyId, _pendingSync',
  agencies: 'id, _pendingSync',
  activities: 'id, agencyId, userId, _pendingSync'
});

export default localDb;

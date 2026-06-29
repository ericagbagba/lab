import { ROLES } from './constants';

export { ROLES };

/**
 * Vérifie si l'utilisateur courant a le droit d'effectuer l'action demandée.
 * 
 * @param {string} role - Le rôle de l'utilisateur (directeur, contrôleur, etc.)
 * @param {string} action - L'action souhaitée (ex: 'create_client', 'edit_client')
 * @param {object} context - Contexte pour vérifier les scopes
 * @param {string} [context.agencyId] - L'ID de l'agence concernée par l'action
 * @param {string} [context.userAgencyId] - L'ID de l'agence d'appartenance de l'utilisateur
 * @param {string} [context.signaleurId] - L'ID du créateur de la panne (pour l'annulation)
 * @param {string} [context.userId] - L'ID de l'utilisateur actuel
 * @param {string[]} [context.assignedAgencyIds] - Les agences assignées au superviseur
 * @returns {boolean} true si autorisé, false sinon
 */
export const canDo = (role, action, context = {}) => {
  if (!role) return false;

  const agencyId = context.agencyId;
  const userAgencyId = context.userAgencyId || context.currentUser?.agencyId;
  const assignedAgencyIds = context.assignedAgencyIds || context.currentUser?.assignedAgencyIds || [];
  const signaleurId = context.signaleurId;
  const userId = context.userId || context.currentUser?.uid;

  // Le directeur a tous les droits d'administration globale
  if (role === ROLES.DIRECTEUR) {
    if (action === 'cancel_fault') {
      return signaleurId === userId;
    }
    // Ne peut pas faire des requêtes de stock (réservé au chef d'agence)
    if (action === 'request_stock') return false;
    // Ne gère pas directement le stock global (c'est le contrôleur, mais on peut lui accorder l'accès en lecture)
    return true;
  }

  // Helper pour vérifier si l'utilisateur est dans la bonne agence
  const isUserAgency = () => {
    if (!agencyId) return false;
    
    // Si c'est un superviseur, vérifier dans ses agences assignées
    if (role === ROLES.SUPERVISEUR) {
      return assignedAgencyIds.includes(agencyId);
    }
    
    // Pour chef_agence, opérateur, technicien, vérifier l'agencyId de son profil
    return userAgencyId === agencyId;
  };

  switch (action) {
    // ---------------- UTILISATEURS & ROLES ----------------
    case 'create_user':
    case 'assign_role':
    case 'create_agency':
    case 'edit_agency':
    case 'delete_agency':
      return role === ROLES.DIRECTEUR;

    // ---------------- BASES ----------------
    case 'create_base':
    case 'edit_base':
      if (role === ROLES.DIRECTEUR) return true;
      if (role === ROLES.CHEF_AGENCE || role === ROLES.SUPERVISEUR) {
        return isUserAgency();
      }
      return false;
    case 'delete_base':
      return role === ROLES.DIRECTEUR;

    // ---------------- TOPOLOGIES ----------------
    case 'create_topology':
    case 'edit_topology':
      return role === ROLES.OPERATEUR && isUserAgency();

    // ---------------- CLIENTS ----------------
    case 'create_client':
      // Tous les membres actifs de l'agence peuvent enregistrer
      return (
        role === ROLES.CHEF_AGENCE ||
        role === ROLES.OPERATEUR ||
        role === ROLES.TECHNICIEN ||
        (role === ROLES.SUPERVISEUR && isUserAgency())
      );
    case 'edit_client':
    case 'delete_client':
      // Seul l'opérateur de l'agence peut modifier/supprimer
      return role === ROLES.OPERATEUR && isUserAgency();

    // ---------------- PANNES ----------------
    case 'signal_fault':
    case 'edit_fault':
      // Tout agent d'agence sur son périmètre + Directeur + Contrôleur (global)
      if (role === ROLES.CONTROLEUR) return true;
      return (
        role === ROLES.CHEF_AGENCE ||
        role === ROLES.OPERATEUR ||
        role === ROLES.TECHNICIEN ||
        (role === ROLES.SUPERVISEUR && isUserAgency())
      );
    case 'resolve_fault':
      // Tout agent d'agence sur son périmètre. Le contrôleur ne peut PAS résoudre.
      return (
        role === ROLES.CHEF_AGENCE ||
        role === ROLES.OPERATEUR ||
        role === ROLES.TECHNICIEN ||
        (role === ROLES.SUPERVISEUR && isUserAgency())
      );
    case 'cancel_fault':
      // Seul le signaleur d'origine peut annuler
      if (!signaleurId || !userId) return false;
      return signaleurId === userId;
    case 'delete_fault':
      return role === ROLES.DIRECTEUR;

    // ---------------- STOCKS ----------------
    case 'manage_stock':
      // Le contrôleur gère le stockGlobal
      // Le chef_agence gère le stock d'agence
      if (role === ROLES.CONTROLEUR) return true; // (il gère le global, l'UI doit filtrer pour le central)
      if (role === ROLES.CHEF_AGENCE) return isUserAgency();
      return false;
    case 'consume_stock':
      // Tous les membres de l'agence peuvent décrémenter
      return (
        role === ROLES.CHEF_AGENCE ||
        role === ROLES.OPERATEUR ||
        role === ROLES.TECHNICIEN ||
        (role === ROLES.SUPERVISEUR && isUserAgency())
      );
    case 'request_stock':
      // Demande d'approvisionnement : réservée au chef_agence
      return role === ROLES.CHEF_AGENCE && isUserAgency();
    case 'review_stock_request':
      // Approbation/refus des demandes : réservé au contrôleur
      return role === ROLES.CONTROLEUR;

    // ---------------- HISTORIQUE / ACTIVITES ----------------
    case 'view_activities_global':
      return role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR;
    case 'view_activities_agency':
      if (role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) return true;
      if (role === ROLES.SUPERVISEUR) return isUserAgency();
      return role === ROLES.CHEF_AGENCE && isUserAgency();

    default:
      return false;
  }
};

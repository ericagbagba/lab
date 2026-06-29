/**
 * Helper functions
 */

import { CODES } from './constants';

/**
 * Calculer l'IP du client à partir du numéro de case
 * @param {number} numero - Numéro de case
 * @returns {string} IP générée
 */
export const calculateClientIp = (numero) => {
  if (!numero) return '';
  return `10.50.1.${numero}`;
};

/**
 * Formater un timestamp ou une date
 * @param {any} timestamp - Firebase timestamp, Date, ou chaine
 * @returns {string} Date formatée
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Non défini';
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) return 'Date invalide';
  
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Générer un ID unique
 * @returns {string}
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Formater la durée en minutes en jours/heures/minutes
 * @param {number} minutes 
 * @returns {string}
 */
export const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return 'N/A';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${remainingMins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}j ${remainingHours}h`;
};

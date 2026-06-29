import React, { useState, useEffect } from 'react';
import { CODES, MAX_CASES } from '../../utils/constants';
import { clientsService } from '../../services/dataService';
import { Check } from 'lucide-react';

/**
 * Grille de sélection des cases clients pour une base donnée.
 * 
 * @param {object} props
 * @param {string} props.baseId - ID de la base sélectionnée
 * @param {number|null} props.selectedNumero - Numéro de case actuellement sélectionné
 * @param {function} props.onSelect - Callback appelé lors de la sélection d'une case: (numero, code) => void
 * @param {number|null} [props.currentClientId] - ID du client en cours d'édition (permet de libérer sa propre case)
 */
export const CaseGrid = ({ baseId, selectedNumero, onSelect, currentClientId = null }) => {
  const [occupiedCases, setOccupiedCases] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOccupiedCases = async () => {
      if (!baseId) return;
      setLoading(true);
      try {
        // Récupérer les clients de cette base
        const clients = await clientsService.getAll([
          { field: 'baseId', op: '==', value: baseId }
        ]);

        const occupied = {};
        clients.forEach(client => {
          // Si on édite un client, on ne considère pas sa propre case comme occupée par un autre
          if (client.numero && (!currentClientId || client.id !== currentClientId)) {
            occupied[client.numero] = {
              clientName: client.nom,
              clientCode: client.code
            };
          }
        });
        setOccupiedCases(occupied);
      } catch (e) {
        console.error('Erreur chargement des cases occupées:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchOccupiedCases();
  }, [baseId, currentClientId]);

  if (!baseId) {
    return (
      <div className="rounded-xl border-2 border-dashed border-brand-border bg-brand-light/30 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
        Veuillez d'abord sélectionner une base pour afficher la grille des cases.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand border-t-transparent"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Calcul des cases disponibles...</p>
      </div>
    );
  }

  // Générer un tableau d'index de 1 à MAX_CASES
  const caseNumbers = Array.from({ length: MAX_CASES }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <div className="h-4.5 w-4.5 rounded border-2 border-brand bg-white dark:bg-slate-900"></div>
            <span className="text-slate-600 dark:text-slate-300">Disponible</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              <Check className="h-3 w-3" />
            </div>
            <span className="text-slate-500 dark:text-slate-400">Occupé</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-4.5 w-4.5 rounded bg-brand"></div>
            <span className="text-slate-600 dark:text-slate-300">Sélectionné</span>
          </div>
        </div>
        <div className="text-slate-500 font-medium">
          Total : {MAX_CASES} cases définies
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
        {caseNumbers.map(num => {
          const code = CODES[num] || 'N/A';
          const isOccupied = !!occupiedCases[num];
          const isSelected = selectedNumero === num;
          
          let btnClass = "flex flex-col items-center justify-center py-2 px-1 rounded-[14px] border-2 transition-all duration-200 h-16 ";
          
          if (isSelected) {
            btnClass += "bg-brand text-white border-brand shadow-lg scale-105 ring-2 ring-offset-2 ring-brand dark:ring-offset-slate-900";
          } else if (isOccupied) {
            btnClass += "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600";
          } else {
            btnClass += "bg-white text-slate-800 border-brand-border hover:border-brand hover:bg-brand-light/40 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800";
          }

          return (
            <button
              key={num}
              type="button"
              disabled={isOccupied}
              onClick={() => onSelect(num, code)}
              className={btnClass}
              title={isOccupied ? `Occupé par : ${occupiedCases[num].clientName}` : `Case libre ${num} (Code: ${code})`}
            >
              <div className="flex items-center space-x-1">
                <span className="text-base font-extrabold">{num}</span>
                {isOccupied && <Check className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />}
              </div>
              <span className={`text-[10px] font-semibold tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CaseGrid;

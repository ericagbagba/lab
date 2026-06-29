import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES, FAULT_STATUSES } from '../utils/constants';
import { 
  faultsService, 
  agenciesService, 
  basesService, 
  clientsService,
  stocksService 
} from '../services/dataService';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Percent, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  PlusCircle, 
  Users, 
  Warehouse,
  FileSpreadsheet
} from 'lucide-react';
import Loading from '../components/UI/Loading';

export const DashboardPage = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  // Sélecteur de mois/année pour le directeur/contrôleur
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12

  const [loading, setLoading] = useState(true);
  
  // States pour Directeur/Contrôleur
  const [stats, setStats] = useState({
    totalFaultsThisMonth: 0,
    totalFaultsPrevMonth: 0,
    faultsPctChange: 0,
    avgResolutionTimeThisMonth: 0, // en heures
    avgResolutionTimePrevMonth: 0,
    resTimePctChange: 0,
    resolutionRate: 0, // %
    unresolvedCounts: { gt24h: 0, gt48h: 0, gt7d: 0 },
    pannesParAgence: [], // list of { agencyName, count }
    pannesParBase: [], // list of { baseName, count }
    weeklyCounts: [0, 0, 0, 0], // pannes par semaine du mois
    cumulativeCurrent: [], // pannes cumulées par jour
    cumulativePrev: []
  });

  // States pour les autres rôles
  const [agencyStats, setAgencyStats] = useState({
    totalClients: 0,
    activeFaults: 0,
    resolvedFaults: 0,
    lowStockItems: []
  });

  const [allAgencies, setAllAgencies] = useState([]);
  const [allBases, setAllBases] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Charger d'abord les agences et bases
        const agencies = await agenciesService.getAll();
        const bases = await basesService.getAll();
        setAllAgencies(agencies);
        setAllBases(bases);

        if (role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) {
          // --- CALCULS POUR LE RAPPORT MENSUEL GLOBAL (DIRECTEUR / CONTROLEUR) ---
          
          // Récupérer toutes les pannes (on filtre localement pour la comparaison complète)
          const allFaults = await faultsService.getAll();

          // Calculer les bornes de dates du mois en cours et du mois précédent
          const startOfCurrentMonth = new Date(selectedYear, selectedMonth - 1, 1);
          const endOfCurrentMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

          const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
          const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
          const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1);
          const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59);

          // Filtrer les pannes par date de création
          const currentMonthFaults = allFaults.filter(f => {
            const date = new Date(f.createdAt);
            return date >= startOfCurrentMonth && date <= endOfCurrentMonth;
          });

          const prevMonthFaults = allFaults.filter(f => {
            const date = new Date(f.createdAt);
            return date >= startOfPrevMonth && date <= endOfPrevMonth;
          });

          // 1. Nombre total de pannes
          const totalThis = currentMonthFaults.length;
          const totalPrev = prevMonthFaults.length;
          let faultsPct = 0;
          if (totalPrev > 0) {
            faultsPct = ((totalThis - totalPrev) / totalPrev) * 100;
          } else if (totalThis > 0) {
            faultsPct = 100;
          }

          // 2. Temps moyen de résolution (minutes -> heures)
          const resolvedThis = currentMonthFaults.filter(f => f.status === FAULT_STATUSES.RESOLUE && f.resolutionDurationMinutes);
          const resolvedPrev = prevMonthFaults.filter(f => f.status === FAULT_STATUSES.RESOLUE && f.resolutionDurationMinutes);

          const avgResThis = resolvedThis.length > 0 
            ? (resolvedThis.reduce((acc, curr) => acc + curr.resolutionDurationMinutes, 0) / resolvedThis.length) / 60 
            : 0;

          const avgResPrev = resolvedPrev.length > 0 
            ? (resolvedPrev.reduce((acc, curr) => acc + curr.resolutionDurationMinutes, 0) / resolvedPrev.length) / 60 
            : 0;

          let resTimePct = 0;
          if (avgResPrev > 0) {
            resTimePct = ((avgResThis - avgResPrev) / avgResPrev) * 100;
          } else if (avgResThis > 0) {
            resTimePct = 100;
          }

          // 3. Taux de résolution
          const resRate = totalThis > 0 
            ? (resolvedThis.length / totalThis) * 100 
            : 0;

          // 4. Pannes encore ouvertes et leur ancienneté (sur TOUTES les pannes globales)
          const now = new Date();
          const openFaults = allFaults.filter(f => f.status === FAULT_STATUSES.OUVERTE || f.status === FAULT_STATUSES.EN_COURS);
          
          let gt24h = 0;
          let gt48h = 0;
          let gt7d = 0;

          openFaults.forEach(f => {
            const created = new Date(f.createdAt);
            const diffHours = (now - created) / (1000 * 60 * 60);
            if (diffHours > 168) {
              gt7d++;
            } else if (diffHours > 48) {
              gt48h++;
            } else if (diffHours > 24) {
              gt24h++;
            }
          });

          // 5. Pannes par Agence (mois en cours)
          const agencyCounts = {};
          agencies.forEach(a => { agencyCounts[a.id] = { name: a.name, count: 0 }; });
          
          currentMonthFaults.forEach(f => {
            if (f.agencyId && agencyCounts[f.agencyId]) {
              agencyCounts[f.agencyId].count++;
            }
          });
          const pannesParAgence = Object.values(agencyCounts).sort((a, b) => b.count - a.count);

          // 6. Pannes par Base (mois en cours) - top 5
          const baseCounts = {};
          bases.forEach(b => { baseCounts[b.id] = { name: b.name, count: 0 }; });
          
          currentMonthFaults.forEach(f => {
            if (f.baseId && baseCounts[f.baseId]) {
              baseCounts[f.baseId].count++;
            }
          });
          const pannesParBase = Object.values(baseCounts)
            .filter(b => b.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          // 7. Graphique en barres : pannes par semaine du mois (4 semaines)
          const weeklyCounts = [0, 0, 0, 0];
          currentMonthFaults.forEach(f => {
            const date = new Date(f.createdAt);
            const day = date.getDate();
            if (day <= 7) weeklyCounts[0]++;
            else if (day <= 14) weeklyCounts[1]++;
            else if (day <= 21) weeklyCounts[2]++;
            else weeklyCounts[3]++;
          });

          // 8. Graphique comparatif : cumulées par jour
          const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
          const cumulativeCurrent = [];
          const cumulativePrev = [];

          let currSum = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const countForDay = currentMonthFaults.filter(f => new Date(f.createdAt).getDate() === d).length;
            currSum += countForDay;
            cumulativeCurrent.push(currSum);
          }

          const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
          let prevSum = 0;
          for (let d = 1; d <= daysInPrevMonth; d++) {
            const countForDay = prevMonthFaults.filter(f => new Date(f.createdAt).getDate() === d).length;
            prevSum += countForDay;
            cumulativePrev.push(prevSum);
          }

          setStats({
            totalFaultsThisMonth: totalThis,
            totalFaultsPrevMonth: totalPrev,
            faultsPctChange: faultsPct,
            avgResolutionTimeThisMonth: avgResThis,
            avgResolutionTimePrevMonth: avgResPrev,
            resTimePctChange: resTimePct,
            resolutionRate: resRate,
            unresolvedCounts: { gt24h, gt48h, gt7d },
            pannesParAgence,
            pannesParBase,
            weeklyCounts,
            cumulativeCurrent,
            cumulativePrev
          });

        } else {
          // --- STATS SIMPLIFIEES POUR LES MEMBRES D'AGENCE ---
          const userAgencyId = currentUser?.agencyId;
          if (userAgencyId) {
            // Clients agence
            const clients = await clientsService.getAll([
              { field: 'agencyId', op: '==', value: userAgencyId }
            ]);
            
            // Pannes agence
            const faults = await faultsService.getAll([
              { field: 'agencyId', op: '==', value: userAgencyId }
            ]);

            // Stocks agence
            const stocks = await stocksService.getAll([
              { field: 'agencyId', op: '==', value: userAgencyId }
            ]);

            const active = faults.filter(f => f.status === FAULT_STATUSES.OUVERTE || f.status === FAULT_STATUSES.EN_COURS).length;
            const resolved = faults.filter(f => f.status === FAULT_STATUSES.RESOLUE).length;
            const lowStock = stocks.filter(s => s.quantity <= s.minThreshold);

            setAgencyStats({
              totalClients: clients.length,
              activeFaults: active,
              resolvedFaults: resolved,
              lowStockItems: lowStock
            });
          }
        }
      } catch (e) {
        console.error('Erreur chargement dashboard:', e);
      } finally {
        setLoading(false);
      }
    };

    if (role) {
      loadDashboardData();
    }
  }, [role, selectedMonth, selectedYear, currentUser]);

  if (loading) {
    return <Loading />;
  }

  // Si l'utilisateur est Directeur ou Contrôleur, on lui affiche le super tableau de bord statistique
  if (role === ROLES.DIRECTEUR || role === ROLES.CONTROLEUR) {
    return (
      <div className="space-y-6">
        
        {/* En-tête + sélecteur de mois */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
              Tableau de bord
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Analyses des performances opérationnelles et pannes
            </p>
          </div>

          <div className="flex items-center space-x-2 rounded-xl bg-white p-2 shadow-sm border border-brand-border dark:bg-slate-900 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 pl-1">Rapport :</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border-none bg-slate-50 py-1.5 px-3 text-xs font-bold text-brand outline-none dark:bg-slate-800 dark:text-blue-400"
            >
              <option value={1}>Janvier</option>
              <option value={2}>Février</option>
              <option value={3}>Mars</option>
              <option value={4}>Avril</option>
              <option value={5}>Mai</option>
              <option value={6}>Juin</option>
              <option value={7}>Juillet</option>
              <option value={8}>Août</option>
              <option value={9}>Septembre</option>
              <option value={10}>Octobre</option>
              <option value={11}>Novembre</option>
              <option value={12}>Décembre</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border-none bg-slate-50 py-1.5 px-3 text-xs font-bold text-brand outline-none dark:bg-slate-800 dark:text-blue-400"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {/* --- SECTION CARTES DE METRIQUES --- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Carte 1 : Nombre total de pannes */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Pannes Signalées
              </span>
              <div className="rounded-lg bg-rose-50 p-2 text-rose-500 dark:bg-rose-950/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-800 dark:text-white">
                {stats.totalFaultsThisMonth}
              </span>
              <span className={`flex items-center text-xs font-bold ${stats.faultsPctChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {stats.faultsPctChange > 0 ? <TrendingUp className="mr-0.5 h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 h-3.5 w-3.5" />}
                {Math.abs(stats.faultsPctChange).toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              vs {stats.totalFaultsPrevMonth} le mois précédent
            </p>
          </div>

          {/* Carte 2 : Temps moyen de résolution */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Temps Moyen Résolution
              </span>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-500 dark:bg-amber-950/20">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-800 dark:text-white">
                {stats.avgResolutionTimeThisMonth.toFixed(1)}h
              </span>
              <span className={`flex items-center text-xs font-bold ${stats.resTimePctChange > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {stats.resTimePctChange > 0 ? <TrendingUp className="mr-0.5 h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 h-3.5 w-3.5" />}
                {Math.abs(stats.resTimePctChange).toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              vs {stats.avgResolutionTimePrevMonth.toFixed(1)}h le mois précédent
            </p>
          </div>

          {/* Carte 3 : Taux de résolution */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Taux de Résolution
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-500 dark:bg-emerald-950/20">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-800 dark:text-white">
                {stats.resolutionRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
              <div 
                className="h-1.5 rounded-full bg-emerald-500" 
                style={{ width: `${stats.resolutionRate}%` }}
              ></div>
            </div>
          </div>

          {/* Carte 4 : Pannes en souffrance */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Encours et Vieillissement
              </span>
              <div className="rounded-lg bg-violetSec/10 p-2 text-violetSec dark:bg-violetSec/20">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center">
              <div>
                <span className="text-lg font-black text-amber-600">{stats.unresolvedCounts.gt24h}</span>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">&gt;24h</p>
              </div>
              <div>
                <span className="text-lg font-black text-orange-600">{stats.unresolvedCounts.gt48h}</span>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">&gt;48h</p>
              </div>
              <div>
                <span className="text-lg font-black text-red-600">{stats.unresolvedCounts.gt7d}</span>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">&gt;7j</p>
              </div>
            </div>
          </div>

        </div>

        {/* --- GRAPHIQUES INLINE --- */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Graphique 1 : Pannes par semaine */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-6">
              Pannes par semaine (Mois en cours)
            </h3>
            <div className="flex h-48 items-end justify-between px-4 pb-2">
              {stats.weeklyCounts.map((val, idx) => {
                const max = Math.max(...stats.weeklyCounts, 1);
                const heightPct = (val / max) * 100;
                return (
                  <div key={idx} className="flex flex-col items-center space-y-2 w-1/5">
                    <span className="text-xs font-bold text-brand dark:text-blue-400">{val}</span>
                    <div 
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand to-violetSec dark:from-brand dark:to-purple-500 transition-all duration-500"
                      style={{ height: `${Math.max(heightPct, 5)}%` }}
                    ></div>
                    <span className="text-[10px] font-bold text-slate-400">Sem {idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Graphique 2 : Cumul par jour vs mois précédent */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-3">
              Évolution cumulative quotidienne
            </h3>
            <div className="flex items-center space-x-4 mb-4 text-[10px] font-semibold">
              <div className="flex items-center space-x-1">
                <span className="h-2 w-4 rounded bg-brand"></span>
                <span className="text-slate-500">Mois en cours ({stats.totalFaultsThisMonth})</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2 w-4 rounded bg-slate-300 dark:bg-slate-700"></span>
                <span className="text-slate-500">Mois précédent ({stats.totalFaultsPrevMonth})</span>
              </div>
            </div>
            
            {/* SVG line chart */}
            <div className="relative h-40 w-full">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3" className="dark:stroke-slate-800" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3" className="dark:stroke-slate-800" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3" className="dark:stroke-slate-800" />

                {/* Path line previous month (gray) */}
                {stats.cumulativePrev.length > 0 && (
                  <path
                    d={`M ${stats.cumulativePrev.map((v, i) => {
                      const maxVal = Math.max(...stats.cumulativePrev, ...stats.cumulativeCurrent, 1);
                      const x = (i / (stats.cumulativePrev.length - 1)) * 100;
                      const y = 100 - (v / maxVal) * 100;
                      return `${x},${y}`;
                    }).join(' L ')}`}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    className="dark:stroke-slate-700"
                  />
                )}

                {/* Path line current month (blue) */}
                {stats.cumulativeCurrent.length > 0 && (
                  <path
                    d={`M ${stats.cumulativeCurrent.map((v, i) => {
                      const maxVal = Math.max(...stats.cumulativePrev, ...stats.cumulativeCurrent, 1);
                      const x = (i / (stats.cumulativeCurrent.length - 1)) * 100;
                      const y = 100 - (v / maxVal) * 100;
                      return `${x},${y}`;
                    }).join(' L ')}`}
                    fill="none"
                    stroke="#1a56a0"
                    strokeWidth="3.5"
                  />
                )}
              </svg>
              <div className="absolute bottom-0 left-0 text-[8px] font-bold text-slate-400">Jour 1</div>
              <div className="absolute bottom-0 right-0 text-[8px] font-bold text-slate-400">Fin du mois</div>
            </div>
          </div>

        </div>

        {/* --- PERFORMANCE PAR AGENCES ET PAR BASES --- */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Tableau Agences */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
              <Building2 className="mr-2 h-4 w-4 text-brand" />
              Classement des agences (pannes du mois)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                    <th className="pb-2">Agence</th>
                    <th className="pb-2 text-right">Pannes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-slate-800">
                  {stats.pannesParAgence.map((item, idx) => (
                    <tr key={idx} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5">{item.name}</td>
                      <td className="py-2.5 text-right font-black text-brand dark:text-blue-400">{item.count}</td>
                    </tr>
                  ))}
                  {stats.pannesParAgence.length === 0 && (
                    <tr>
                      <td colSpan="2" className="py-4 text-center text-slate-400">Aucune agence active</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau Top 5 Bases */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
              <Warehouse className="mr-2 h-4 w-4 text-violetSec" />
              Top 5 des bases les plus impactées
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-brand-border text-slate-400 dark:border-slate-800">
                    <th className="pb-2">Base</th>
                    <th className="pb-2 text-right">Pannes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border dark:divide-slate-800">
                  {stats.pannesParBase.map((item, idx) => (
                    <tr key={idx} className="text-slate-700 dark:text-slate-300">
                      <td className="py-2.5">{item.name}</td>
                      <td className="py-2.5 text-right font-black text-violetSec">{item.count}</td>
                    </tr>
                  ))}
                  {stats.pannesParBase.length === 0 && (
                    <tr>
                      <td colSpan="2" className="py-4 text-center text-slate-400">Aucune panne enregistrée ce mois-ci</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // --- DASHBOARD DES RÔLES TERRAINS (CHEF_AGENCE, OPERATEUR, TECHNICIEN, SUPERVISEUR) ---
  const userAgency = allAgencies.find(a => a.id === currentUser?.agencyId);

  return (
    <div className="space-y-6">
      
      {/* En-tête agence */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white sm:text-3xl">
          Espace opérationnel
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Agence : <strong className="text-brand dark:text-blue-400">{userAgency ? userAgency.name : 'Non assignée'}</strong> — Rôle : <strong className="text-violetSec uppercase">{role}</strong>
        </p>
      </div>

      {/* Cartes métriques */}
      <div className="grid gap-4 sm:grid-cols-3">
        
        {/* Clients */}
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center space-x-4">
          <div className="rounded-xl bg-blue-50 p-3.5 text-brand dark:bg-slate-800 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">Total Clients</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{agencyStats.totalClients}</span>
          </div>
        </div>

        {/* Pannes actives */}
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center space-x-4">
          <div className="rounded-xl bg-red-50 p-3.5 text-red-500 dark:bg-red-950/20">
            <AlertTriangle className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">Pannes Actives</span>
            <span className="text-2xl font-black text-red-600">{agencyStats.activeFaults}</span>
          </div>
        </div>

        {/* Pannes résolues */}
        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center space-x-4">
          <div className="rounded-xl bg-emerald-50 p-3.5 text-emerald-600 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">Résolues</span>
            <span className="text-2xl font-black text-emerald-600">{agencyStats.resolvedFaults}</span>
          </div>
        </div>

      </div>

      {/* Alertes stocks critiques agence */}
      {agencyStats.lowStockItems.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-5 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40">
          <h3 className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />
            Alerte stock bas ! {agencyStats.lowStockItems.length} article(s) sous le seuil critique
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {agencyStats.lowStockItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between rounded-xl bg-white/60 p-3 border border-amber-100 dark:bg-slate-900/60 dark:border-slate-800 text-xs font-bold"
              >
                <span className="text-slate-700 dark:text-slate-300">{item.name} ({item.category})</span>
                <span className="text-red-600 font-extrabold">{item.quantity} / {item.minThreshold} {item.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boutons d'actions rapides */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4">
          Raccourcis rapides
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          
          <Link 
            to="/clients" 
            className="flex items-center space-x-3 rounded-[14px] border border-brand-border p-4 hover:border-brand hover:bg-brand-light/30 transition-all text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-blue-500"
          >
            <div className="rounded-lg bg-blue-100 p-2 text-brand">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <span>Enregistrer un Client</span>
              <p className="text-[10px] text-slate-400 font-semibold">Grille de cases & formulaire</p>
            </div>
          </Link>

          <Link 
            to="/faults/form" 
            className="flex items-center space-x-3 rounded-[14px] border border-brand-border p-4 hover:border-brand hover:bg-brand-light/30 transition-all text-sm font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-blue-500"
          >
            <div className="rounded-lg bg-red-100 p-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span>Signaler une Panne</span>
              <p className="text-[10px] text-slate-400 font-semibold">Diagnostic & matériels</p>
            </div>
          </Link>

        </div>
      </div>

    </div>
  );
};

export default DashboardPage;

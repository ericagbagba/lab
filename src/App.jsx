import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import RoleRoute from './routes/RoleRoute';
import Layout from './components/Layout/Layout';

// Pages imports
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import FaultFormPage from './pages/FaultFormPage';
import FaultsPage from './pages/FaultsPage';
import BasesPage from './pages/BasesPage';
import TopologiesPage from './pages/TopologiesPage';
import StocksPage from './pages/StocksPage';
import AgenciesPage from './pages/AgenciesPage';
import UsersPage from './pages/UsersPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Routes Publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Routes Privées sous Authentification */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              {/* Accueil redirige vers Dashboard */}
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              
              {/* Pannes */}
              <Route path="/faults" element={<FaultsPage />} />
              <Route path="/faults/form" element={<FaultFormPage />} />
              
              {/* Stocks */}
              <Route path="/stocks" element={<StocksPage />} />
              
              {/* Profil & Paramètres */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Agences, Bases & Topologies */}
              <Route path="/agencies" element={<AgenciesPage />} />
              <Route path="/bases" element={<BasesPage />} />
              <Route path="/topologies" element={<TopologiesPage />} />

              {/* Gestion des Utilisateurs (Directeur Seul) */}
              <Route element={<RoleRoute allowedRoles={['directeur']} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>

              {/* Journal d'activité (Directeur, Contrôleur, Superviseur, Chef Agence) */}
              <Route element={<RoleRoute allowedRoles={['directeur', 'contrôleur', 'superviseur', 'chef_agence']} />}>
                <Route path="/activities" element={<ActivitiesPage />} />
              </Route>

              {/* Fallback 404 dans le Layout */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;

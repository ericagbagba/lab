import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Route sécurisée vérifiant si l'utilisateur possède l'un des rôles autorisés.
 * 
 * @param {object} props
 * @param {string[]} props.allowedRoles - Liste des rôles autorisés
 */
export const RoleRoute = ({ allowedRoles }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = currentUser.role;

  if (!allowedRoles.includes(role)) {
    // Si l'utilisateur n'a pas les droits, rediriger vers la page d'accueil opérationnelle
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { Role } from '@oomfy/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { useViewActive } from '../../contexts/ViewActivityContext.js';

interface Props {
  children: React.ReactNode;
  requiredRole?: Role | Role[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const isViewActive = useViewActive();
  const allowedRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : undefined;

  if (isLoading || (isAuthenticated && !user && allowedRoles)) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center font-mono text-xs text-brand-400">
        Verificando sesión...
      </div>
    );
  }

  if (!isAuthenticated) {
    return isViewActive ? <Navigate to="/signin" replace /> : null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return isViewActive ? <Navigate to="/" replace /> : null;
  }

  return <>{children}</>;
};

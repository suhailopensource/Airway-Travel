import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protected Route Component
 * Requires authentication
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

/**
 * Role-based Protected Route
 * Requires specific role
 */
export const RoleProtectedRoute = ({ children, allowedRoles = [] }: RoleProtectedRouteProps) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};


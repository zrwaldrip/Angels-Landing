import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, resolveRoleHome } from './roleRouting';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="container mt-4">Checking session...</div>;

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  const roleHome = resolveRoleHome(authSession);
  if (!roleHome) return <Navigate to="/unauthorized" replace />;

  if (allowedRoles && !hasAnyRole(authSession, allowedRoles)) {
    return <Navigate to={roleHome} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

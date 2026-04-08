import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveRoleHome } from './roleRouting';

interface GuestOnlyRouteProps {
  children: ReactNode;
}

function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { authSession, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="container mt-4">Checking session...</div>;
  if (!isAuthenticated) return <>{children}</>;

  const roleHome = resolveRoleHome(authSession);
  if (!roleHome) return <Navigate to="/unauthorized" replace />;

  return <Navigate to={roleHome} replace />;
}

export default GuestOnlyRoute;

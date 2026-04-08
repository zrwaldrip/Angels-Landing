import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole, resolveRoleHome } from './roleRouting';

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { authSession, isLoading } = useAuth();

  if (isLoading) return <div className="container mt-4">Checking session...</div>;

  const roleHome = resolveRoleHome(authSession);
  if (!roleHome) return <Navigate to="/unauthorized" replace />;
  if (!hasAnyRole(authSession, allowedRoles)) return <Navigate to={roleHome} replace />;

  return <>{children}</>;
}

export default RoleRoute;

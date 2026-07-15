import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: JSX.Element;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role) && user.role === 'CASHIER') return <Navigate to="/pos" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
}

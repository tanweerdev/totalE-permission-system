import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { PermissionFeature } from '../types';

interface Props {
  children: React.ReactNode;
  feature?: PermissionFeature;
}

export default function RequireAuth({ children, feature }: Props) {
  const { token, flags, bootstrapping } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (feature && (!flags || !flags[feature])) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

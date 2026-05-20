import { useAuth } from '../context/AuthContext';
import type { PermissionFeature } from '../types';

interface Props {
  feature: PermissionFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({ feature, children, fallback = null }: Props) {
  const { flags } = useAuth();
  return flags?.[feature] ? <>{children}</> : <>{fallback}</>;
}

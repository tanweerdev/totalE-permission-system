import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, FeatureFlags } from '../types';
import { getMyFlags } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  flags: FeatureFlags | null;
  bootstrapping: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [bootstrapping, setBootstrapping] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (token && user) {
      setBootstrapping(true);
      getMyFlags()
        .then(setFlags)
        .catch(() => setFlags(null))
        .finally(() => setBootstrapping(false));
    }
  }, []);

  function setSession(newToken: string, newUser: AuthUser) {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setFlags(null);
    setBootstrapping(true);
    getMyFlags()
      .then(setFlags)
      .catch(() => setFlags(null))
      .finally(() => setBootstrapping(false));
  }

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setFlags(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, flags, bootstrapping, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

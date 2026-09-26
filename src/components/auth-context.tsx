'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch } from '@/lib/api-client';
import { sessionFromToken } from '@/lib/jwt';
import { clearTokens, getAccessToken, setTokens } from '@/lib/token-store';
import type { AuthTokens, SessionUser } from '@/lib/types';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Al montar, rehidrata la sesión desde el token almacenado.
  useEffect(() => {
    const token = getAccessToken();
    if (token) setUser(sessionFromToken(token));
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setTokens(tokens);
    setUser(sessionFromToken(tokens.accessToken));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } catch {
      // aunque el backend falle, limpiamos la sesión local
    }
    clearTokens();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, hasPermission }),
    [user, loading, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

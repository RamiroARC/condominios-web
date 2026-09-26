'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

/**
 * Protege un árbol de rutas: si no hay sesión, redirige a /login.
 * Mientras se resuelve el estado de auth, muestra un placeholder.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p className="muted">Cargando…</p>
      </main>
    );
  }

  return <>{children}</>;
}

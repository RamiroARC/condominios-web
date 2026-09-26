'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';

/** Página raíz: redirige al panel si hay sesión, o al login si no. */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [user, loading, router]);

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <p className="muted">Cargando…</p>
    </main>
  );
}

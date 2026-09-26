'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión, no mostrar el login.
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesión';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form
        onSubmit={onSubmit}
        className="card"
        style={{ width: 360, display: 'grid', gap: 14 }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>CondoManager</h1>
          <p className="muted" style={{ margin: 0 }}>
            Panel de administración
          </p>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Contraseña</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error" style={{ margin: 0 }}>{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/components/auth-context';
import { CondominiumProvider } from '@/components/condominium-context';
import { NAV_ITEMS } from '@/components/nav-items';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <CondominiumProvider>
        <Shell>{children}</Shell>
      </CondominiumProvider>
    </RequireAuth>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === '' || hasPermission(item.permission),
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          borderRight: '1px solid var(--border)',
          background: 'var(--panel)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
          CondoManager
        </div>
        <nav style={{ display: 'grid', gap: 2 }}>
          {visibleItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  color: active ? 'var(--primary)' : 'var(--text)',
                  background: active ? '#eef2ff' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--panel)',
          }}
        >
          <span className="muted">{user?.email}</span>
          <button
            className="btn"
            style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--border)' }}
            onClick={() => logout()}
          >
            Salir
          </button>
        </header>
        <main style={{ padding: 20 }}>{children}</main>
      </div>
    </div>
  );
}

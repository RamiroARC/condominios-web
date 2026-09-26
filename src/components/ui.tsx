'use client';

/** Tarjeta de indicador (KPI) del dashboard. */
export function KpiCard({
  label,
  value,
  hint,
  accent = 'var(--primary)',
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: 6 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</span>
      {hint && <span className="muted" style={{ fontSize: 12 }}>{hint}</span>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  // finanzas
  PENDING: '#f59e0b',
  PARTIAL: '#3b82f6',
  PAID: '#16a34a',
  CANCELLED: '#6b7280',
  // mantenimiento
  OPEN: '#f59e0b',
  ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#8b5cf6',
  RESOLVED: '#16a34a',
  CLOSED: '#6b7280',
  // reservas / anuncios
  CONFIRMED: '#16a34a',
  DRAFT: '#6b7280',
  PUBLISHED: '#16a34a',
  ARCHIVED: '#9ca3af',
  // genéricos
  ACTIVE: '#16a34a',
  INACTIVE: '#9ca3af',
};

export function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6b7280';
}

/** Etiqueta coloreada según el estado. */
export function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      style={{
        fontSize: 12,
        padding: '2px 8px',
        borderRadius: 999,
        background: `${color}1a`,
        color,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

/** Encabezado de sección con título y acción opcional. */
export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

'use client';

/** Modal simple centrado con overlay. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 460, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'transparent', border: 'none', fontSize: 20, color: 'var(--muted)' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Campo de formulario etiquetado. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 4, marginBottom: 10 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      {children}
    </label>
  );
}

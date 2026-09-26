'use client';

import { useCondominium } from './condominium-context';

/** Selector de condominio por nombre, enlazado al contexto compartido. */
export function CondominiumPicker({ label = 'Condominio' }: { label?: string }) {
  const { condos, selectedId, setSelectedId } = useCondominium();

  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <select
        className="input"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        style={{ minWidth: 220 }}
      >
        {condos.length === 0 && <option value="">Sin condominios</option>}
        {condos.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

'use client';

import { useState } from 'react';
import { DataTable, Column } from '@/components/data-table';
import type { Building } from '@/lib/types';

const columns: Column<Building>[] = [
  { header: 'Código', render: (b) => b.code },
  { header: 'Nombre', render: (b) => b.name },
  { header: 'Pisos', render: (b) => b.floors ?? '—' },
  { header: 'Estado', render: (b) => b.status ?? '—' },
];

export default function BuildingsPage() {
  const [condominiumId, setCondominiumId] = useState('');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Edificios</h1>

      <label style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
        <span className="muted">Filtrar por ID de condominio</span>
        <input
          className="input"
          placeholder="condominiumId"
          value={condominiumId}
          onChange={(e) => setCondominiumId(e.target.value.trim())}
        />
      </label>

      {condominiumId ? (
        <DataTable<Building>
          path="/buildings"
          columns={columns}
          query={{ condominiumId }}
        />
      ) : (
        <p className="muted">Ingresa un ID de condominio para listar sus edificios.</p>
      )}
    </div>
  );
}

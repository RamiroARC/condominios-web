'use client';

import { useState } from 'react';
import { DataTable, Column } from '@/components/data-table';
import type { Apartment } from '@/lib/types';

const columns: Column<Apartment>[] = [
  { header: 'Código', render: (a) => a.code },
  { header: 'Piso', render: (a) => a.floor ?? '—' },
  { header: 'Área', render: (a) => a.area ?? '—' },
  {
    header: 'Coef. participación',
    render: (a) => a.participationCoefficient ?? '—',
  },
  { header: 'Estado', render: (a) => a.status ?? '—' },
];

export default function ApartmentsPage() {
  const [buildingId, setBuildingId] = useState('');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Departamentos</h1>

      <label style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
        <span className="muted">Filtrar por ID de edificio</span>
        <input
          className="input"
          placeholder="buildingId"
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value.trim())}
        />
      </label>

      {buildingId ? (
        <DataTable<Apartment>
          path="/apartments"
          columns={columns}
          query={{ buildingId }}
        />
      ) : (
        <p className="muted">Ingresa un ID de edificio para listar sus departamentos.</p>
      )}
    </div>
  );
}

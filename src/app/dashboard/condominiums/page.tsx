'use client';

import { DataTable, Column } from '@/components/data-table';
import type { Condominium } from '@/lib/types';

const columns: Column<Condominium>[] = [
  { header: 'Código', render: (c) => c.code },
  { header: 'Nombre', render: (c) => c.name },
  { header: 'Estado', render: (c) => c.status ?? '—' },
];

export default function CondominiumsPage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Condominios</h1>
      <DataTable<Condominium> path="/condominiums" columns={columns} />
    </div>
  );
}

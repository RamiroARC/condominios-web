'use client';

import { DataTable, Column } from '@/components/data-table';
import type { Person } from '@/lib/types';

const columns: Column<Person>[] = [
  {
    header: 'Nombre',
    render: (p) => `${p.firstName} ${p.lastName}`,
  },
  { header: 'Documento', render: (p) => `${p.documentType} ${p.documentNumber}` },
  { header: 'Email', render: (p) => p.email ?? '—' },
  { header: 'Teléfono', render: (p) => p.phone ?? '—' },
  { header: 'Estado', render: (p) => p.status ?? '—' },
];

export default function PersonsPage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Personas</h1>
      <DataTable<Person> path="/persons" columns={columns} />
    </div>
  );
}

'use client';

import { DataTable, Column } from '@/components/data-table';
import type { Organization } from '@/lib/types';

const columns: Column<Organization>[] = [
  { header: 'Nombre', render: (o) => o.name },
  { header: 'Razón social', render: (o) => o.legalName ?? '—' },
  { header: 'Email', render: (o) => o.email ?? '—' },
  { header: 'Estado', render: (o) => o.status ?? '—' },
];

export default function OrganizationsPage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Organizaciones</h1>
      <DataTable<Organization> path="/organizations" columns={columns} />
    </div>
  );
}

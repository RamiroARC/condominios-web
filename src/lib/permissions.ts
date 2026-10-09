/** Catálogo de permisos con etiqueta en español, agrupados por módulo. */
export const PERMISSION_GROUPS: { module: string; permissions: { key: string; label: string }[] }[] = [
  { module: 'Organizaciones', permissions: [
    { key: 'organizations:read', label: 'Ver' }, { key: 'organizations:write', label: 'Gestionar' },
  ]},
  { module: 'Condominios', permissions: [
    { key: 'condominiums:read', label: 'Ver' }, { key: 'condominiums:write', label: 'Gestionar' },
  ]},
  { module: 'Edificios', permissions: [
    { key: 'buildings:read', label: 'Ver' }, { key: 'buildings:write', label: 'Gestionar' },
  ]},
  { module: 'Departamentos', permissions: [
    { key: 'apartments:read', label: 'Ver' }, { key: 'apartments:write', label: 'Gestionar' },
  ]},
  { module: 'Personas', permissions: [
    { key: 'persons:read', label: 'Ver' }, { key: 'persons:write', label: 'Gestionar' },
  ]},
  { module: 'Ocupantes', permissions: [
    { key: 'occupants:read', label: 'Ver' }, { key: 'occupants:write', label: 'Gestionar' },
  ]},
  { module: 'Mantenimiento', permissions: [
    { key: 'maintenance:read', label: 'Ver' }, { key: 'maintenance:write', label: 'Gestionar' },
  ]},
  { module: 'Finanzas', permissions: [
    { key: 'finance:read', label: 'Ver' }, { key: 'finance:write', label: 'Gestionar' },
  ]},
  { module: 'Gastos', permissions: [
    { key: 'expenses:read', label: 'Ver' }, { key: 'expenses:write', label: 'Gestionar' },
  ]},
  { module: 'Servicios (agua)', permissions: [
    { key: 'utilities:read', label: 'Ver' }, { key: 'utilities:write', label: 'Gestionar' },
  ]},
  { module: 'Activos', permissions: [
    { key: 'assets:read', label: 'Ver' }, { key: 'assets:write', label: 'Gestionar' },
  ]},
  { module: 'Reservas', permissions: [
    { key: 'reservations:read', label: 'Ver' }, { key: 'reservations:write', label: 'Gestionar' },
  ]},
  { module: 'Comunicaciones', permissions: [
    { key: 'communications:read', label: 'Ver' }, { key: 'communications:write', label: 'Gestionar' },
  ]},
  { module: 'Panel', permissions: [
    { key: 'dashboard:read', label: 'Ver dashboard' },
  ]},
  { module: 'Usuarios y roles', permissions: [
    { key: 'users:read', label: 'Ver usuarios' }, { key: 'users:write', label: 'Gestionar usuarios' },
    { key: 'roles:read', label: 'Ver roles' }, { key: 'roles:write', label: 'Gestionar roles' },
  ]},
  { module: 'Auditoría', permissions: [
    { key: 'audit:read', label: 'Ver auditoría' },
  ]},
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

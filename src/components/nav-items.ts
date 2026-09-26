/** Ítems de navegación del panel, cada uno con el permiso que lo habilita. */
export interface NavItem {
  href: string;
  label: string;
  permission: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', permission: '' },
  { href: '/dashboard/organizations', label: 'Organizaciones', permission: 'organizations:read' },
  { href: '/dashboard/condominiums', label: 'Condominios', permission: 'condominiums:read' },
  { href: '/dashboard/buildings', label: 'Edificios', permission: 'buildings:read' },
  { href: '/dashboard/apartments', label: 'Departamentos', permission: 'apartments:read' },
  { href: '/dashboard/persons', label: 'Personas', permission: 'persons:read' },
  { href: '/dashboard/maintenance', label: 'Mantenimiento', permission: 'maintenance:read' },
  { href: '/dashboard/finance', label: 'Finanzas', permission: 'finance:read' },
  { href: '/dashboard/reservations', label: 'Reservas', permission: 'reservations:read' },
  { href: '/dashboard/communications', label: 'Comunicaciones', permission: 'communications:read' },
];

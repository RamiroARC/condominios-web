import { apiFetch } from './api-client';
import type { DashboardSummary } from './types';

/** Trae el resumen del panel para un condominio (periodo y edificio opcionales). */
export function fetchDashboardSummary(
  condominiumId: string,
  periodId?: string,
  buildingId?: string,
): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary', {
    query: { condominiumId, periodId, buildingId },
  });
}

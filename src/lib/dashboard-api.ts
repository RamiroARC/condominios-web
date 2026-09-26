import { apiFetch } from './api-client';
import type { DashboardSummary } from './types';

/** Trae el resumen del panel para un condominio (y periodo opcional). */
export function fetchDashboardSummary(
  condominiumId: string,
  periodId?: string,
): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard/summary', {
    query: { condominiumId, periodId },
  });
}

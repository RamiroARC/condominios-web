'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { fetchDashboardSummary } from '@/lib/dashboard-api';
import { money, monthName, dateTime, shortDate } from '@/lib/format';
import { KpiCard, SectionCard, StatusBadge } from '@/components/ui';
import {
  DonutChart,
  StatusBarChart,
  CategoryDonut,
  IncomeExpenseChart,
} from '@/components/charts';
import { CondominiumPicker } from '@/components/condominium-picker';
import { useCondominium } from '@/components/condominium-context';
import type { Building, DashboardSummary } from '@/lib/types';

export default function DashboardHome() {
  const { selectedId: condominiumId } = useCondominium();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edificios del condominio para el selector de alcance.
  useEffect(() => {
    if (!condominiumId) { setBuildings([]); setBuildingId(''); return; }
    apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => setBuildings(r.data))
      .catch(() => setBuildings([]));
    setBuildingId('');
  }, [condominiumId]);

  // Carga el resumen al cambiar el condominio o el edificio seleccionado.
  useEffect(() => {
    if (!condominiumId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboardSummary(condominiumId, undefined, buildingId || undefined)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Error al cargar el panel');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [condominiumId, buildingId]);

  const k = summary?.kpis;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>
            Panorama general de la administración
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <CondominiumPicker />
          <label style={{ display: 'grid', gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>Edificio</span>
            <select
              className="input"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">Todo el condominio</option>
              {buildings.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </label>
          {summary?.period && (
            <div style={{ display: 'grid', gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>Periodo</span>
              <div className="input" style={{ minWidth: 160, background: '#fff' }}>
                {monthName(summary.period.month)} {summary.period.year}
              </div>
            </div>
          )}
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Cargando panel…</p>}

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <KpiCard label="Cobranza del periodo" value={money(k?.charged ?? 0)} accent="#16a34a" />
        <KpiCard label="Recaudado" value={money(k?.collected ?? 0)} accent="#2563eb" />
        <KpiCard label="Pendiente de cobro" value={money(k?.pending ?? 0)} accent="#dc2626" />
        <KpiCard
          label="Morosidad"
          value={`${k?.delinquencyRate ?? 0}%`}
          accent="#f59e0b"
        />
        <KpiCard label="Departamentos" value={String(k?.apartments ?? 0)} accent="#8b5cf6" />
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard title="Cargos por estado">
          <DonutChart
            data={(summary?.chargesByStatus ?? []).map((c) => ({
              name: c.status,
              value: c.amount,
            }))}
          />
        </SectionCard>
        <SectionCard title="Mantenimiento por estado">
          <StatusBarChart
            data={(summary?.maintenanceByStatus ?? []).map((m) => ({
              name: m.status,
              value: m.count,
            }))}
          />
        </SectionCard>
      </div>

      {/* Tablas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard title="Próximas reservas">
          <table className="table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.upcomingReservations ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">Sin reservas próximas.</td>
                </tr>
              )}
              {summary?.upcomingReservations.map((r) => (
                <tr key={r.id}>
                  <td>{dateTime(r.startAt)}</td>
                  <td>{dateTime(r.endAt)}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Comunicados recientes">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Publicado</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.recentAnnouncements ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">Sin comunicados.</td>
                </tr>
              )}
              {summary?.recentAnnouncements.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{shortDate(a.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* Ingresos vs gastos + distribución de gastos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard title="Ingresos vs gastos (últimos 6 meses)">
          <IncomeExpenseChart
            data={(summary?.incomeVsExpenses ?? []).map((s) => ({
              label: `${monthName(s.month).slice(0, 3)} ${String(s.year).slice(2)}`,
              income: s.income,
              expenses: s.expenses,
            }))}
          />
        </SectionCard>
        <SectionCard title="Distribución de gastos">
          <CategoryDonut
            data={(summary?.expensesByCategory ?? []).map((e) => ({
              name: e.category,
              value: e.amount,
            }))}
          />
        </SectionCard>
      </div>

      {/* Consumo de agua + estado de activos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard title="Consumo de agua (departamento)">
          <table className="table">
            <thead>
              <tr>
                <th>Depto (ID)</th>
                <th>Lectura ant.</th>
                <th>Lectura act.</th>
                <th>Consumo (m³)</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.waterConsumption ?? []).length === 0 && (
                <tr><td colSpan={4} className="muted">Sin lecturas.</td></tr>
              )}
              {summary?.waterConsumption.map((w) => (
                <tr key={w.apartmentId}>
                  <td style={{ fontSize: 12 }}>{w.apartmentId.slice(-6)}</td>
                  <td>{w.previousReading}</td>
                  <td>{w.currentReading}</td>
                  <td>{w.consumption}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Estado de activos">
          <table className="table">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Próx. mantenimiento</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.assets ?? []).length === 0 && (
                <tr><td colSpan={4} className="muted">Sin activos registrados.</td></tr>
              )}
              {summary?.assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{shortDate(a.nextMaintenanceAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );
}

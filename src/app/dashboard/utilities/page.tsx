'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { monthName } from '@/lib/format';
import type { Apartment, Building, UtilityReading } from '@/lib/types';

const now = new Date();

export default function UtilitiesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('utilities:write');
  const { selectedId: condominiumId } = useCondominium();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UtilityReading | null>(null);

  // Departamentos del condominio (para nombre y para el formulario).
  useEffect(() => {
    if (!condominiumId) { setApartments([]); return; }
    (async () => {
      try {
        const b = await apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } });
        const lists = await Promise.all(
          b.data.map((bl) =>
            apiFetch<{ data: Apartment[] }>('/apartments', { query: { buildingId: bl._id, pageSize: 100 } })
              .then((r) => r.data)
              .catch(() => []),
          ),
        );
        setApartments(lists.flat());
      } catch {
        setApartments([]);
      }
    })();
  }, [condominiumId]);

  const aptCode = useMemo(() => {
    const m = new Map(apartments.map((a) => [a._id, a.code]));
    return (id: string) => m.get(id) ?? id.slice(-6);
  }, [apartments]);

  const load = useCallback(() => {
    if (!condominiumId) { setReadings([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<UtilityReading[]>('/utility-readings', { query: { condominiumId, year, month } })
      .then(setReadings)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar lecturas'))
      .finally(() => setLoading(false));
  }, [condominiumId, year, month]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Consumo de agua</h1>
        {canWrite && condominiumId && apartments.length > 0 && (
          <button className="btn" onClick={() => setCreating(true)}>Nueva lectura</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <CondominiumPicker />
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Año</span>
          <input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Mes</span>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {(creating || editing) && condominiumId && (
        <ReadingForm
          condominiumId={condominiumId}
          apartments={apartments}
          year={year}
          month={month}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {!condominiumId ? (
        <p className="muted">Selecciona un condominio.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Departamento</th><th>Lectura ant.</th><th>Lectura act.</th><th>Consumo (m³)</th>{canWrite && <th>Acciones</th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Cargando…</td></tr>}
            {!loading && readings.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin lecturas para este periodo.</td></tr>}
            {!loading && readings.map((r) => (
              <tr key={r._id}>
                <td>{aptCode(r.apartmentId)}</td>
                <td>{r.previousReading}</td>
                <td>{r.currentReading}</td>
                <td>{r.consumption}</td>
                {canWrite && (
                  <td>
                    <RowActions
                      onEdit={() => setEditing(r)}
                      deletePath={`/utility-readings/${r._id}`}
                      deleteMessage="¿Eliminar esta lectura?"
                      onDeleted={load}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReadingForm({
  condominiumId,
  apartments,
  year,
  month,
  initial,
  onClose,
  onSaved,
}: {
  condominiumId: string;
  apartments: Apartment[];
  year: number;
  month: number;
  initial: UtilityReading | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [apartmentId, setApartmentId] = useState(initial?.apartmentId ?? apartments[0]?._id ?? '');
  const [previousReading, setPreviousReading] = useState(
    initial?.previousReading != null ? String(initial.previousReading) : '',
  );
  const [currentReading, setCurrentReading] = useState(
    initial?.currentReading != null ? String(initial.currentReading) : '',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = {
        condominiumId,
        apartmentId,
        utilityType: 'WATER',
        year,
        month,
        previousReading: Number(previousReading),
        currentReading: Number(currentReading),
      };
      if (editing) {
        await apiFetch(`/utility-readings/${initial!._id}`, { method: 'PATCH', body });
      } else {
        await apiFetch('/utility-readings', { method: 'POST', body });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar la lectura');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar lectura' : 'Nueva lectura de agua'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label={`Periodo: ${monthName(month)} ${year}`}>
          <span className="muted" style={{ fontSize: 12 }}>Cambia año/mes en los filtros para otro periodo.</span>
        </Field>
        <Field label="Departamento">
          <select className="input" value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} disabled={editing} required>
            {apartments.length === 0 && <option value="">Sin departamentos</option>}
            {apartments.map((a) => <option key={a._id} value={a._id}>{a.code}</option>)}
          </select>
        </Field>
        <Field label="Lectura anterior">
          <input className="input" type="number" step="0.001" min="0" value={previousReading} onChange={(e) => setPreviousReading(e.target.value)} required />
        </Field>
        <Field label="Lectura actual">
          <input className="input" type="number" step="0.001" min="0" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} required />
        </Field>
        {err && <p className="error">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

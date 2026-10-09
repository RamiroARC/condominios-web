'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import type { Apartment, Building, PaginatedResult } from '@/lib/types';

export default function ApartmentsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('apartments:write');
  const { selectedId: condominiumId } = useCondominium();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [items, setItems] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);

  useEffect(() => {
    if (!condominiumId) { setBuildings([]); setBuildingId(''); return; }
    apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => { setBuildings(r.data); setBuildingId((c) => (r.data.find((b) => b._id === c) ? c : r.data[0]?._id ?? '')); })
      .catch(() => setBuildings([]));
  }, [condominiumId]);

  const load = useCallback(() => {
    if (!buildingId) { setItems([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<PaginatedResult<Apartment>>('/apartments', { query: { buildingId, pageSize: 100 } })
      .then((r) => setItems(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [buildingId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Departamentos</h1>
        {canWrite && buildingId && <button className="btn" onClick={() => setCreating(true)}>Nuevo departamento</button>}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <CondominiumPicker />
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Edificio</span>
          <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} style={{ minWidth: 200 }}>
            {buildings.length === 0 && <option value="">Sin edificios</option>}
            {buildings.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      {(creating || editing) && buildingId && (
        <ApartmentForm
          condominiumId={condominiumId}
          buildingId={buildingId}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {!buildingId ? (
        <p className="muted">Selecciona un edificio para ver sus departamentos.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Código</th><th>Piso</th><th>Área</th><th>Coef.</th><th>Estado</th>{canWrite && <th>Acciones</th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canWrite ? 6 : 5} className="muted">Cargando…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 6 : 5} className="muted">Sin departamentos.</td></tr>}
            {!loading && items.map((a) => (
              <tr key={a._id}>
                <td>{a.code}</td>
                <td>{a.floor ?? '—'}</td>
                <td>{a.area ?? '—'}</td>
                <td>{a.participationCoefficient ?? '—'}</td>
                <td>{a.status ?? '—'}</td>
                {canWrite && (
                  <td>
                    <RowActions
                      onEdit={() => setEditing(a)}
                      deletePath={`/apartments/${a._id}`}
                      deleteMessage={`¿Eliminar el departamento "${a.code}"?`}
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

function ApartmentForm({
  condominiumId,
  buildingId,
  initial,
  onClose,
  onSaved,
}: {
  condominiumId: string;
  buildingId: string;
  initial: Apartment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [code, setCode] = useState(initial?.code ?? '');
  const [floor, setFloor] = useState(initial?.floor != null ? String(initial.floor) : '');
  const [area, setArea] = useState(initial?.area != null ? String(initial.area) : '');
  const [coef, setCoef] = useState(
    initial?.participationCoefficient != null ? String(initial.participationCoefficient) : '',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = {
        floor: floor ? Number(floor) : undefined,
        area: area ? Number(area) : undefined,
        participationCoefficient: coef ? Number(coef) : undefined,
      };
      if (editing) {
        await apiFetch(`/apartments/${initial!._id}`, { method: 'PATCH', body });
      } else {
        await apiFetch('/apartments', { method: 'POST', body: { condominiumId, buildingId, code, ...body } });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar departamento' : 'Nuevo departamento'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Código">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required disabled={editing} />
        </Field>
        <Field label="Piso">
          <input className="input" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} />
        </Field>
        <Field label="Área (m²)">
          <input className="input" type="number" step="0.01" min="0" value={area} onChange={(e) => setArea(e.target.value)} />
        </Field>
        <Field label="Coeficiente de participación">
          <input className="input" type="number" step="0.0001" min="0" value={coef} onChange={(e) => setCoef(e.target.value)} />
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

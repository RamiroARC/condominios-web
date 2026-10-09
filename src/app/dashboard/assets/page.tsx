'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/ui';
import { shortDate } from '@/lib/format';
import type { Asset, Building } from '@/lib/types';

const TYPES = ['ELEVATOR', 'PUMP', 'GENERATOR', 'GATE', 'HVAC', 'OTHER'];
const STATUSES = ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE'];

export default function AssetsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('assets:write');
  const { selectedId: condominiumId } = useCondominium();

  const [items, setItems] = useState<Asset[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const load = useCallback(() => {
    if (!condominiumId) { setItems([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<Asset[]>('/assets', { query: { condominiumId } })
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar activos'))
      .finally(() => setLoading(false));
  }, [condominiumId]);

  useEffect(() => { load(); }, [load]);

  // Edificios del condominio (para el selector de alcance y el nombre en tabla).
  useEffect(() => {
    if (!condominiumId) { setBuildings([]); return; }
    apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => setBuildings(r.data))
      .catch(() => setBuildings([]));
  }, [condominiumId]);

  const scopeName = (id?: string | null) =>
    id ? buildings.find((b) => b._id === id)?.name ?? id.slice(-6) : 'Condominio';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Activos</h1>
        {canWrite && condominiumId && <button className="btn" onClick={() => setCreating(true)}>Nuevo activo</button>}
      </div>

      <CondominiumPicker />
      {error && <p className="error">{error}</p>}

      {(creating || editing) && condominiumId && (
        <AssetForm
          condominiumId={condominiumId}
          buildings={buildings}
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
            <tr><th>Activo</th><th>Alcance</th><th>Tipo</th><th>Estado</th><th>Próx. mant.</th><th>Ubicación</th>{canWrite && <th>Acciones</th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canWrite ? 7 : 6} className="muted">Cargando…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 7 : 6} className="muted">Sin activos.</td></tr>}
            {!loading && items.map((a) => (
              <tr key={a._id}>
                <td>{a.name}</td>
                <td>{scopeName(a.buildingId)}</td>
                <td>{a.type}</td>
                <td><StatusBadge status={a.status} /></td>
                <td>{shortDate(a.nextMaintenanceAt)}</td>
                <td>{a.location ?? '—'}</td>
                {canWrite && (
                  <td>
                    <RowActions
                      onEdit={() => setEditing(a)}
                      deletePath={`/assets/${a._id}`}
                      deleteMessage={`¿Eliminar el activo "${a.name}"?`}
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

function AssetForm({
  condominiumId,
  buildings,
  initial,
  onClose,
  onSaved,
}: {
  condominiumId: string;
  buildings: Building[];
  initial: Asset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? 'ELEVATOR');
  const [buildingId, setBuildingId] = useState(initial?.buildingId ?? ''); // '' = condominio
  const [status, setStatus] = useState(initial?.status ?? 'OPERATIONAL');
  const [nextMaintenanceAt, setNext] = useState(
    initial?.nextMaintenanceAt ? initial.nextMaintenanceAt.slice(0, 10) : '',
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/assets/${initial!._id}`, {
          method: 'PATCH',
          body: {
            name,
            status,
            location: location || undefined,
            nextMaintenanceAt: nextMaintenanceAt ? new Date(nextMaintenanceAt).toISOString() : undefined,
          },
        });
      } else {
        await apiFetch('/assets', {
          method: 'POST',
          body: {
            condominiumId,
            buildingId: buildingId || undefined,
            name,
            type,
            location: location || undefined,
            nextMaintenanceAt: nextMaintenanceAt ? new Date(nextMaintenanceAt).toISOString() : undefined,
          },
        });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar el activo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar activo' : 'Nuevo activo'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Alcance">
          <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} disabled={editing}>
            <option value="">Condominio (general)</option>
            {buildings.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} disabled={editing}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        {editing && (
          <Field label="Estado">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <Field label="Próximo mantenimiento">
          <input className="input" type="date" value={nextMaintenanceAt} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Ubicación">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import type { Building, PaginatedResult } from '@/lib/types';

export default function BuildingsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('buildings:write');
  const { selectedId: condominiumId } = useCondominium();
  const [items, setItems] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);

  const load = useCallback(() => {
    if (!condominiumId) { setItems([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<PaginatedResult<Building>>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => setItems(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [condominiumId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Edificios</h1>
        {canWrite && condominiumId && <button className="btn" onClick={() => setCreating(true)}>Nuevo edificio</button>}
      </div>

      <CondominiumPicker />
      {error && <p className="error">{error}</p>}

      {(creating || editing) && condominiumId && (
        <BuildingForm
          condominiumId={condominiumId}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {!condominiumId ? (
        <p className="muted">Selecciona un condominio para ver sus edificios.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Código</th><th>Nombre</th><th>Pisos</th><th>Estado</th>{canWrite && <th>Acciones</th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Cargando…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin edificios.</td></tr>}
            {!loading && items.map((b) => (
              <tr key={b._id}>
                <td>{b.code}</td>
                <td>{b.name}</td>
                <td>{b.floors ?? '—'}</td>
                <td>{b.status ?? '—'}</td>
                {canWrite && (
                  <td>
                    <RowActions
                      onEdit={() => setEditing(b)}
                      deletePath={`/buildings/${b._id}`}
                      deleteMessage={`¿Eliminar el edificio "${b.name}"?`}
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

function BuildingForm({
  condominiumId,
  initial,
  onClose,
  onSaved,
}: {
  condominiumId: string;
  initial: Building | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [floors, setFloors] = useState(initial?.floors != null ? String(initial.floors) : '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = { name, floors: floors ? Number(floors) : undefined };
      if (editing) {
        await apiFetch(`/buildings/${initial!._id}`, { method: 'PATCH', body });
      } else {
        await apiFetch('/buildings', { method: 'POST', body: { condominiumId, code, ...body } });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar edificio' : 'Nuevo edificio'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Código">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required disabled={editing} />
        </Field>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Pisos">
          <input className="input" type="number" min="0" value={floors} onChange={(e) => setFloors(e.target.value)} />
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

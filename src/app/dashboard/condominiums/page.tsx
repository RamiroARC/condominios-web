'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import type { Condominium, PaginatedResult } from '@/lib/types';

export default function CondominiumsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('condominiums:write');
  const [items, setItems] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Condominium | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<PaginatedResult<Condominium>>('/condominiums', { query: { pageSize: 100 } })
      .then((r) => setItems(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Condominios</h1>
        {canWrite && <button className="btn" onClick={() => setCreating(true)}>Nuevo condominio</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {(creating || editing) && (
        <CondominiumForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      <table className="table">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Estado</th>{canWrite && <th>Acciones</th>}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={canWrite ? 4 : 3} className="muted">Cargando…</td></tr>}
          {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 4 : 3} className="muted">Sin condominios.</td></tr>}
          {!loading && items.map((c) => (
            <tr key={c._id}>
              <td>{c.code}</td>
              <td>{c.name}</td>
              <td>{c.status ?? '—'}</td>
              {canWrite && (
                <td>
                  <RowActions
                    onEdit={() => setEditing(c)}
                    deletePath={`/condominiums/${c._id}`}
                    deleteMessage={`¿Eliminar el condominio "${c.name}"?`}
                    onDeleted={load}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CondominiumForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Condominium | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/condominiums/${initial!._id}`, { method: 'PATCH', body: { name } });
      } else {
        await apiFetch('/condominiums', { method: 'POST', body: { name, code } });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar condominio' : 'Nuevo condominio'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Código">
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required disabled={editing} />
        </Field>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
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

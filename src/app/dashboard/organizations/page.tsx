'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import type { Organization, PaginatedResult } from '@/lib/types';

export default function OrganizationsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('organizations:write');
  const [items, setItems] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<PaginatedResult<Organization>>('/organizations', { query: { pageSize: 100 } })
      .then((r) => setItems(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Organizaciones</h1>
        {canWrite && <button className="btn" onClick={() => setCreating(true)}>Nueva organización</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {(creating || editing) && (
        <OrganizationForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      <table className="table">
        <thead>
          <tr><th>Nombre</th><th>Razón social</th><th>Email</th><th>Estado</th>{canWrite && <th>Acciones</th>}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Cargando…</td></tr>}
          {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin organizaciones.</td></tr>}
          {!loading && items.map((o) => (
            <tr key={o._id}>
              <td>{o.name}</td>
              <td>{o.legalName ?? '—'}</td>
              <td>{o.email ?? '—'}</td>
              <td>{o.status ?? '—'}</td>
              {canWrite && (
                <td>
                  <RowActions onEdit={() => setEditing(o)} deleteMessage="" canWrite />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrganizationForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Organization | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [legalName, setLegalName] = useState(initial?.legalName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'ACTIVE');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        await apiFetch(`/organizations/${initial!._id}`, {
          method: 'PATCH',
          body: { name, legalName: legalName || undefined, email: email || undefined, status },
        });
      } else {
        await apiFetch('/organizations', {
          method: 'POST',
          body: { name, legalName: legalName || undefined, email: email || undefined },
        });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar la organización');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar organización' : 'Nueva organización'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Razón social">
          <input className="input" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {editing && (
          <Field label="Estado">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {['ACTIVE', 'SUSPENDED', 'INACTIVE'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        {err && <p className="error">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

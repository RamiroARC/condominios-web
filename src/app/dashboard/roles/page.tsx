'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import type { Role } from '@/lib/types';

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('roles:write');
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch<Role[]>('/roles')
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar roles'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Roles</h1>
        {canWrite && <button className="btn" onClick={() => setCreating(true)}>Nuevo rol</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {(creating || editing) && (
        <RoleForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      <table className="table">
        <thead>
          <tr><th>Rol</th><th>Permisos</th><th>Sistema</th>{canWrite && <th>Acciones</th>}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={canWrite ? 4 : 3} className="muted">Cargando…</td></tr>}
          {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 4 : 3} className="muted">Sin roles.</td></tr>}
          {!loading && items.map((r) => (
            <tr key={r._id}>
              <td>{r.name}</td>
              <td>{r.permissions.length} permisos</td>
              <td>{r.isSystem ? 'Sí' : 'No'}</td>
              {canWrite && (
                <td>
                  {r.isSystem ? (
                    <span className="muted">No editable</span>
                  ) : (
                    <RowActions
                      onEdit={() => setEditing(r)}
                      deletePath={`/roles/${r._id}`}
                      deleteMessage={`¿Eliminar el rol "${r.name}"?`}
                      onDeleted={load}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [key, setKey] = useState(initial?.key ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [permissions, setPermissions] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(perm: string) {
    setPermissions((cur) => {
      const next = new Set(cur);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const perms = [...permissions];
      if (editing) {
        await apiFetch(`/roles/${initial!._id}`, { method: 'PATCH', body: { name, permissions: perms } });
      } else {
        await apiFetch('/roles', { method: 'POST', body: { key, name, permissions: perms } });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar el rol');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar rol' : 'Nuevo rol'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Clave (identificador)">
          <input className="input" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} required disabled={editing} placeholder="EJ: CONSERJE" />
        </Field>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <div style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 12 }}>Permisos</span>
          <div style={{ display: 'grid', gap: 8, marginTop: 6, maxHeight: 300, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
            {PERMISSION_GROUPS.map((g) => (
              <div key={g.module}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{g.module}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {g.permissions.map((p) => (
                    <label key={p.key} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                      <input type="checkbox" checked={permissions.has(p.key)} onChange={() => toggle(p.key)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {err && <p className="error">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

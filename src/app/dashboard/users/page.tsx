'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { Modal, Field } from '@/components/modal';
import { StatusBadge } from '@/components/ui';
import type { AdminUser, Role } from '@/lib/types';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('users:write');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([
        apiFetch<AdminUser[]>('/users'),
        apiFetch<Role[]>('/roles').catch(() => [] as Role[]),
      ]);
      setUsers(u);
      setRoles(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleName = useMemo(() => {
    const m = new Map(roles.map((r) => [r._id, r.name]));
    return (ids: string[]) => ids.map((id) => m.get(id) ?? '—').join(', ') || '—';
  }, [roles]);

  async function toggleStatus(u: AdminUser) {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/users/${u._id}`, { method: 'PATCH', body: { status: next } });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Usuarios</h1>
        {canWrite && <button className="btn" onClick={() => setCreating(true)}>Nuevo usuario</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {creating && (
        <NewUserForm
          roles={roles}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}

      {managing && (
        <ManageRolesForm
          user={managing}
          roles={roles}
          onClose={() => setManaging(null)}
          onSaved={() => { setManaging(null); load(); }}
        />
      )}

      <table className="table">
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Roles</th><th>Estado</th>{canWrite && <th>Acciones</th>}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Cargando…</td></tr>}
          {!loading && users.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin usuarios.</td></tr>}
          {!loading && users.map((u) => (
            <tr key={u._id}>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.email}</td>
              <td>{roleName(u.roleIds)}</td>
              <td><StatusBadge status={u.status} /></td>
              {canWrite && (
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn" style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--border)', padding: '4px 10px' }} onClick={() => setManaging(u)}>
                      Roles
                    </button>
                    <button className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '4px 10px' }} onClick={() => toggleStatus(u)}>
                      {u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewUserForm({
  roles,
  onClose,
  onCreated,
}: {
  roles: Role[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: { email, password, firstName, lastName, roleIds: [...roleIds] },
      });
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo crear el usuario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Contraseña (mín. 8)"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></Field>
        <Field label="Nombres"><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></Field>
        <Field label="Apellidos"><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></Field>
        <div style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 12 }}>Roles</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {roles.map((r) => (
              <label key={r._id} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={roleIds.has(r._id)}
                  onChange={() => setRoleIds((cur) => {
                    const next = new Set(cur);
                    if (next.has(r._id)) next.delete(r._id); else next.add(r._id);
                    return next;
                  })}
                />
                {r.name}
              </label>
            ))}
          </div>
        </div>
        {err && <p className="error">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Crear'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ManageRolesForm({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set(user.roleIds));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiFetch(`/users/${user._id}/roles`, { method: 'PUT', body: { roleIds: [...roleIds] } });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudieron actualizar los roles');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Roles de ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {roles.map((r) => (
            <label key={r._id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={roleIds.has(r._id)}
                onChange={() => setRoleIds((cur) => {
                  const next = new Set(cur);
                  if (next.has(r._id)) next.delete(r._id); else next.add(r._id);
                  return next;
                })}
              />
              {r.name}
            </label>
          ))}
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

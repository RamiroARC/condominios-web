'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { StatusBadge } from '@/components/ui';
import { shortDate } from '@/lib/format';
import type { MaintenanceTicket, PaginatedResult } from '@/lib/types';

const TICKET_STATUSES = [
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED',
];
const TICKET_CATEGORIES = [
  'PLUMBING', 'ELECTRICAL', 'ELEVATOR', 'CLEANING', 'SECURITY', 'STRUCTURAL', 'OTHER',
];
const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('maintenance:write');
  const { selectedId: condominiumId } = useCondominium();

  const [statusFilter, setStatusFilter] = useState('');
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    if (!condominiumId) {
      setTickets([]);
      return;
    }
    setLoading(true);
    setError(null);
    apiFetch<PaginatedResult<MaintenanceTicket>>('/maintenance-tickets', {
      query: {
        condominiumId,
        status: statusFilter || undefined,
        pageSize: 50,
      },
    })
      .then((res) => setTickets(res.data))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar tickets'),
      )
      .finally(() => setLoading(false));
  }, [condominiumId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/maintenance-tickets/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Mantenimiento</h1>
        {canWrite && condominiumId && (
          <button className="btn" onClick={() => setShowForm(true)}>Nuevo ticket</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <CondominiumPicker />
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Estado</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {showForm && (
        <NewTicketForm
          condominiumId={condominiumId}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <p className="error">{error}</p>}
      {!condominiumId && (
        <p className="muted">Selecciona un condominio para ver sus tickets.</p>
      )}

      {condominiumId && (
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoría</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Creado</th>
              {canWrite && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={canWrite ? 6 : 5} className="muted">Cargando…</td></tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr><td colSpan={canWrite ? 6 : 5} className="muted">Sin tickets.</td></tr>
            )}
            {!loading && tickets.map((t) => (
              <tr key={t._id}>
                <td>{t.title}</td>
                <td>{t.category}</td>
                <td><StatusBadge status={t.priority} /></td>
                <td><StatusBadge status={t.status} /></td>
                <td>{shortDate(t.createdAt)}</td>
                {canWrite && (
                  <td>
                    <select
                      className="input"
                      disabled={busyId === t._id}
                      value=""
                      onChange={(e) => e.target.value && changeStatus(t._id, e.target.value)}
                      style={{ minWidth: 150 }}
                    >
                      <option value="">Cambiar estado…</option>
                      {TICKET_STATUSES.filter((s) => s !== t.status).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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

function NewTicketForm({
  condominiumId,
  onClose,
  onCreated,
}: {
  condominiumId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiFetch('/maintenance-tickets', {
        method: 'POST',
        body: { condominiumId, title, description: description || undefined, category, priority },
      });
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo crear el ticket');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo ticket" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Título">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Descripción">
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Categoría">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Prioridad">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        {err && <p className="error">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

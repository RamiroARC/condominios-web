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
import type { Building, MaintenanceTicket, PaginatedResult } from '@/lib/types';

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
  const [buildingFilter, setBuildingFilter] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceTicket | null>(null);

  // Edificios del condominio (para filtro, form y nombre en tabla).
  useEffect(() => {
    if (!condominiumId) { setBuildings([]); return; }
    apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => setBuildings(r.data))
      .catch(() => setBuildings([]));
  }, [condominiumId]);

  const buildingName = (id?: string | null) =>
    id ? buildings.find((b) => b._id === id)?.name ?? id.slice(-6) : 'Condominio';

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
        buildingId: buildingFilter || undefined,
        status: statusFilter || undefined,
        pageSize: 50,
      },
    })
      .then((res) => setTickets(res.data))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Error al cargar tickets'),
      )
      .finally(() => setLoading(false));
  }, [condominiumId, buildingFilter, statusFilter]);

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
          <span className="muted" style={{ fontSize: 12 }}>Edificio</span>
          <select className="input" value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}>
            <option value="">Todos</option>
            {buildings.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </label>
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

      {(showForm || editing) && (
        <TicketForm
          condominiumId={condominiumId}
          buildings={buildings}
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
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
              <th>Edificio</th>
              <th>Categoría</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Creado</th>
              {canWrite && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={canWrite ? 7 : 6} className="muted">Cargando…</td></tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr><td colSpan={canWrite ? 7 : 6} className="muted">Sin tickets.</td></tr>
            )}
            {!loading && tickets.map((t) => (
              <tr key={t._id}>
                <td>{t.title}</td>
                <td>{buildingName(t.buildingId)}</td>
                <td>{t.category}</td>
                <td><StatusBadge status={t.priority} /></td>
                <td><StatusBadge status={t.status} /></td>
                <td>{shortDate(t.createdAt)}</td>
                {canWrite && (
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        className="input"
                        disabled={busyId === t._id}
                        value=""
                        onChange={(e) => e.target.value && changeStatus(t._id, e.target.value)}
                        style={{ minWidth: 130 }}
                      >
                        <option value="">Estado…</option>
                        {TICKET_STATUSES.filter((s) => s !== t.status).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <RowActions
                        onEdit={() => setEditing(t)}
                        deletePath={`/maintenance-tickets/${t._id}`}
                        deleteMessage={`¿Eliminar el ticket "${t.title}"?`}
                        onDeleted={load}
                      />
                    </div>
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

function TicketForm({
  condominiumId,
  buildings,
  initial,
  onClose,
  onSaved,
}: {
  condominiumId: string;
  buildings: Building[];
  initial: MaintenanceTicket | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [buildingId, setBuildingId] = useState(initial?.buildingId ?? ''); // '' = condominio
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'OTHER');
  const [priority, setPriority] = useState(initial?.priority ?? 'MEDIUM');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = { title, description: description || undefined, category, priority };
      if (editing) {
        await apiFetch(`/maintenance-tickets/${initial!._id}`, { method: 'PATCH', body });
      } else {
        await apiFetch('/maintenance-tickets', {
          method: 'POST',
          body: { condominiumId, buildingId: buildingId || undefined, ...body },
        });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar el ticket');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar ticket' : 'Nuevo ticket'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Título">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Alcance">
          <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} disabled={editing}>
            <option value="">Condominio (general)</option>
            {buildings.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
          </select>
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
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

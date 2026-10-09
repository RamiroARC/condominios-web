'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import type { Apartment, Building, CommonArea, Occupant, PaginatedResult, Person, Reservation } from '@/lib/types';

/** Departamento con su propietario (para el selector de reserva). */
interface OwnedApartment {
  apartmentId: string;
  aptCode: string;
  ownerName: string;
}

export default function ReservationsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('reservations:write');
  const { selectedId: condominiumId } = useCondominium();

  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [owned, setOwned] = useState<OwnedApartment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);

  const loadAreas = useCallback(() => {
    if (!condominiumId) { setAreas([]); return; }
    apiFetch<CommonArea[]>('/reservations/areas', { query: { condominiumId } })
      .then(setAreas)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar áreas'));
  }, [condominiumId]);

  const loadReservations = useCallback(() => {
    if (!condominiumId) { setReservations([]); return; }
    apiFetch<PaginatedResult<Reservation>>('/reservations', {
      query: { pageSize: 50 },
    })
      .then((r) => setReservations(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar reservas'));
  }, [condominiumId]);

  // Departamentos del condominio con su PROPIETARIO (para el formulario de reserva).
  // Solo se listan departamentos que tienen un ocupante activo de rol OWNER.
  useEffect(() => {
    if (!condominiumId) { setOwned([]); return; }
    (async () => {
      try {
        // 1. Todos los departamentos del condominio (código por id).
        const b = await apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } });
        const aptLists = await Promise.all(
          b.data.map((bl) =>
            apiFetch<{ data: Apartment[] }>('/apartments', { query: { buildingId: bl._id, pageSize: 100 } })
              .then((r) => r.data)
              .catch(() => []),
          ),
        );
        const apartments = aptLists.flat();
        const aptCode = new Map(apartments.map((a) => [a._id, a.code]));

        // 2. Personas y sus ocupaciones; nos quedamos con las OWNER activas.
        const persons = await apiFetch<PaginatedResult<Person>>('/persons', { query: { pageSize: 100 } }).then((r) => r.data);
        const occLists = await Promise.all(
          persons.map((p) =>
            apiFetch<Occupant[]>('/occupants', { query: { personId: p._id } })
              .then((occ) => ({ p, occ }))
              .catch(() => ({ p, occ: [] as Occupant[] })),
          ),
        );

        const result: OwnedApartment[] = [];
        for (const { p, occ } of occLists) {
          for (const o of occ) {
            if (o.status === 'ACTIVE' && o.role === 'OWNER' && aptCode.has(o.apartmentId)) {
              result.push({
                apartmentId: o.apartmentId,
                aptCode: aptCode.get(o.apartmentId)!,
                ownerName: `${p.firstName} ${p.lastName}`,
              });
            }
          }
        }
        setOwned(result);
      } catch {
        setOwned([]);
      }
    })();
  }, [condominiumId]);

  useEffect(() => { loadAreas(); loadReservations(); }, [loadAreas, loadReservations]);

  async function cancel(id: string) {
    setBusy(id);
    setError(null);
    try {
      await apiFetch(`/reservations/${id}/cancel`, { method: 'PATCH', body: {} });
      loadReservations();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cancelar la reserva');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Reservas</h1>

      <CondominiumPicker />

      {error && <p className="error">{error}</p>}
      {!condominiumId && <p className="muted">Selecciona un condominio.</p>}

      {condominiumId && (
        <>
          <div className="card" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15 }}>Áreas comunes</h2>
              {canWrite && (
                <button className="btn" onClick={() => setShowAreaForm(true)}>Nueva área</button>
              )}
            </div>
            {showAreaForm && (
              <NewAreaForm
                condominiumId={condominiumId}
                onClose={() => setShowAreaForm(false)}
                onCreated={() => { setShowAreaForm(false); loadAreas(); }}
              />
            )}
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Capacidad</th>
                  <th>Tarifa</th>
                  <th>Activa</th>
                  {canWrite && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {areas.length === 0 && (
                  <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin áreas comunes.</td></tr>
                )}
                {areas.map((a) => (
                  <tr key={a._id}>
                    <td>{a.name}</td>
                    <td>{a.capacity}</td>
                    <td>{money(a.reservationFee)}</td>
                    <td>{a.isActive ? 'Sí' : 'No'}</td>
                    {canWrite && (
                      <td>
                        <RowActions
                          deletePath={`/reservations/areas/${a._id}`}
                          deleteMessage={`¿Eliminar el área común "${a.name}"?`}
                          onDeleted={loadAreas}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15 }}>Reservas</h2>
              {canWrite && areas.length > 0 && owned.length > 0 && (
                <button className="btn" onClick={() => setShowReservationForm(true)}>Nueva reserva</button>
              )}
            </div>
            {showReservationForm && (
              <NewReservationForm
                areas={areas}
                owned={owned}
                onClose={() => setShowReservationForm(false)}
                onCreated={() => { setShowReservationForm(false); loadReservations(); }}
              />
            )}
            <table className="table">
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Estado</th>
                  {canWrite && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 && (
                  <tr><td colSpan={canWrite ? 4 : 3} className="muted">Sin reservas.</td></tr>
                )}
                {reservations.map((r) => (
                  <tr key={r._id}>
                    <td>{dateTime(r.startAt)}</td>
                    <td>{dateTime(r.endAt)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    {canWrite && (
                      <td>
                        <button
                          className="btn"
                          style={{ background: 'var(--danger)' }}
                          disabled={busy === r._id || r.status === 'CANCELLED'}
                          onClick={() => cancel(r._id)}
                        >
                          Cancelar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function NewAreaForm({
  condominiumId,
  onClose,
  onCreated,
}: {
  condominiumId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [reservationFee, setReservationFee] = useState('');
  const [maxDurationMinutes, setMaxDurationMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiFetch('/reservations/areas', {
        method: 'POST',
        body: {
          condominiumId,
          name,
          capacity: capacity ? Number(capacity) : undefined,
          reservationFee: reservationFee ? Number(reservationFee) : undefined,
          maxDurationMinutes: maxDurationMinutes ? Number(maxDurationMinutes) : undefined,
        },
      });
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo crear el área');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nueva área común" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Capacidad">
          <input
            className="input"
            type="number"
            min="0"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </Field>
        <Field label="Tarifa de reserva">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={reservationFee}
            onChange={(e) => setReservationFee(e.target.value)}
          />
        </Field>
        <Field label="Duración máxima (minutos, 0 = sin límite)">
          <input
            className="input"
            type="number"
            min="0"
            value={maxDurationMinutes}
            onChange={(e) => setMaxDurationMinutes(e.target.value)}
          />
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

function NewReservationForm({
  areas,
  owned,
  onClose,
  onCreated,
}: {
  areas: CommonArea[];
  owned: OwnedApartment[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [commonAreaId, setCommonAreaId] = useState(areas[0]?._id ?? '');
  const [apartmentId, setApartmentId] = useState(owned[0]?.apartmentId ?? '');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiFetch('/reservations', {
        method: 'POST',
        body: {
          commonAreaId,
          apartmentId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          notes: notes || undefined,
        },
      });
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo crear la reserva');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nueva reserva" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Área común">
          <select className="input" value={commonAreaId} onChange={(e) => setCommonAreaId(e.target.value)} required>
            {areas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Propietario / Departamento">
          <select className="input" value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} required>
            {owned.map((o) => (
              <option key={o.apartmentId} value={o.apartmentId}>
                {o.ownerName} — Dpto. {o.aptCode}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Inicio">
          <input className="input" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </Field>
        <Field label="Fin">
          <input className="input" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
        </Field>
        <Field label="Notas">
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {err && <p className="error">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Reservar'}</button>
        </div>
      </form>
    </Modal>
  );
}

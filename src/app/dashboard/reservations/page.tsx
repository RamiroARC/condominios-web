'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { StatusBadge } from '@/components/ui';
import { dateTime, money } from '@/lib/format';
import type { CommonArea, PaginatedResult, Reservation } from '@/lib/types';

export default function ReservationsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('reservations:write');
  const { selectedId: condominiumId } = useCondominium();

  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAreaForm, setShowAreaForm] = useState(false);

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
                </tr>
              </thead>
              <tbody>
                {areas.length === 0 && (
                  <tr><td colSpan={4} className="muted">Sin áreas comunes.</td></tr>
                )}
                {areas.map((a) => (
                  <tr key={a._id}>
                    <td>{a.name}</td>
                    <td>{a.capacity}</td>
                    <td>{money(a.reservationFee)}</td>
                    <td>{a.isActive ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>Reservas</h2>
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { StatusBadge } from '@/components/ui';
import { money, monthName, shortDate } from '@/lib/format';
import type {
  Apartment,
  BillingPeriod,
  Building,
  Charge,
  FeeConcept,
  Occupant,
  PaginatedResult,
  Person,
} from '@/lib/types';

type Tab = 'concepts' | 'periods' | 'charges' | 'statement';

export default function FinancePage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('finance:write');
  const { selectedId: condominiumId } = useCondominium();

  const [tab, setTab] = useState<Tab>('periods');
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Finanzas</h1>

      <CondominiumPicker />

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
        {(['periods', 'concepts', 'charges', 'statement'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t ? 'var(--primary)' : 'var(--text)',
              padding: '8px 12px',
              fontWeight: 600,
            }}
          >
            {t === 'periods' ? 'Periodos' : t === 'concepts' ? 'Conceptos' : t === 'charges' ? 'Cargos' : 'Estado de cuenta'}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {!condominiumId && <p className="muted">Selecciona un condominio.</p>}

      {condominiumId && tab === 'periods' && (
        <Periods condominiumId={condominiumId} canWrite={canWrite} onError={setError} />
      )}
      {condominiumId && tab === 'concepts' && (
        <Concepts condominiumId={condominiumId} canWrite={canWrite} onError={setError} />
      )}
      {condominiumId && tab === 'charges' && (
        <Charges condominiumId={condominiumId} canWrite={canWrite} onError={setError} />
      )}
      {condominiumId && tab === 'statement' && (
        <Statement condominiumId={condominiumId} canWrite={canWrite} onError={setError} />
      )}
    </div>
  );
}

// ─── Periodos ──────────────────────────────────────────────────────────────

function Periods({
  condominiumId,
  canWrite,
  onError,
}: {
  condominiumId: string;
  canWrite: boolean;
  onError: (m: string | null) => void;
}) {
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    apiFetch<BillingPeriod[]>('/finance/periods', { query: { condominiumId } })
      .then(setPeriods)
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar periodos'));
  }, [condominiumId, onError]);

  useEffect(() => { load(); }, [load]);

  async function generate(id: string) {
    setBusy(id);
    onError(null);
    try {
      await apiFetch(`/finance/periods/${id}/generate-charges`, { method: 'POST', body: {} });
      load();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudieron generar cargos');
    } finally {
      setBusy(null);
    }
  }

  async function close(id: string) {
    setBusy(id);
    onError(null);
    try {
      await apiFetch(`/finance/periods/${id}/close`, { method: 'POST', body: {} });
      load();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo cerrar el periodo');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setShowForm(true)}>Nuevo periodo</button>
        </div>
      )}
      {showForm && (
        <NewPeriodForm
          condominiumId={condominiumId}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
          onError={onError}
        />
      )}
    <table className="table">
      <thead>
        <tr>
          <th>Periodo</th>
          <th>Vencimiento</th>
          <th>Estado</th>
          {canWrite && <th>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {periods.length === 0 && (
          <tr><td colSpan={canWrite ? 4 : 3} className="muted">Sin periodos.</td></tr>
        )}
        {periods.map((p) => (
          <tr key={p._id}>
            <td>{monthName(p.month)} {p.year}</td>
            <td>{shortDate(p.dueDate)}</td>
            <td><StatusBadge status={p.status} /></td>
            {canWrite && (
              <td style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  disabled={busy === p._id || p.status === 'CLOSED'}
                  onClick={() => generate(p._id)}
                >
                  Generar cargos
                </button>
                <button
                  className="btn"
                  disabled={busy === p._id || p.status === 'CLOSED'}
                  style={{ background: '#6b7280' }}
                  onClick={() => close(p._id)}
                >
                  Cerrar
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function NewPeriodForm({
  condominiumId,
  onClose,
  onCreated,
  onError,
}: {
  condominiumId: string;
  onClose: () => void;
  onCreated: () => void;
  onError: (m: string | null) => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      await apiFetch('/finance/periods', {
        method: 'POST',
        body: {
          condominiumId,
          year: Number(year),
          month: Number(month),
          dueDate: new Date(dueDate).toISOString(),
        },
      });
      onCreated();
    } catch (e2) {
      onError(e2 instanceof ApiError ? e2.message : 'No se pudo crear el periodo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo periodo" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Año">
          <input
            className="input"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Mes">
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{monthName(m)}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de vencimiento">
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </Field>
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

// ─── Conceptos ──────────────────────────────────────────────────────────────

const ALLOCATION_METHODS = ['COEFFICIENT', 'EQUAL', 'FIXED'];

function Concepts({
  condominiumId,
  canWrite,
  onError,
}: {
  condominiumId: string;
  canWrite: boolean;
  onError: (m: string | null) => void;
}) {
  const [concepts, setConcepts] = useState<FeeConcept[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FeeConcept | null>(null);

  const load = useCallback(() => {
    apiFetch<FeeConcept[]>('/finance/concepts', { query: { condominiumId } })
      .then(setConcepts)
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar conceptos'));
  }, [condominiumId, onError]);

  useEffect(() => { load(); }, [load]);

  // Edificios para el selector y para mostrar el nombre en la tabla.
  useEffect(() => {
    apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => setBuildings(r.data))
      .catch(() => setBuildings([]));
  }, [condominiumId]);

  const buildingName = (id?: string | null) =>
    id ? buildings.find((b) => b._id === id)?.name ?? id.slice(-6) : 'Todo el condominio';

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setShowForm(true)}>Nuevo concepto</button>
        </div>
      )}
      {(showForm || editing) && (
        <ConceptForm
          condominiumId={condominiumId}
          buildings={buildings}
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          onError={onError}
        />
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Alcance</th>
            <th>Método</th>
            <th>Monto base</th>
            <th>Activo</th>
            {canWrite && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {concepts.length === 0 && (
            <tr><td colSpan={canWrite ? 6 : 5} className="muted">Sin conceptos.</td></tr>
          )}
          {concepts.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{buildingName(c.buildingId)}</td>
              <td>{c.allocationMethod}</td>
              <td>{money(c.amount)}</td>
              <td>{c.isActive ? 'Sí' : 'No'}</td>
              {canWrite && (
                <td>
                  <RowActions
                    onEdit={() => setEditing(c)}
                    deletePath={`/finance/concepts/${c._id}`}
                    deleteMessage={`¿Eliminar el concepto "${c.name}"?`}
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

function ConceptForm({
  condominiumId,
  buildings,
  initial,
  onClose,
  onSaved,
  onError,
}: {
  condominiumId: string;
  buildings: Building[];
  initial: FeeConcept | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string | null) => void;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [buildingId, setBuildingId] = useState(initial?.buildingId ?? ''); // '' = todo el condominio
  const [allocationMethod, setAllocationMethod] = useState(initial?.allocationMethod ?? 'COEFFICIENT');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      if (editing) {
        // El alcance (buildingId) no se cambia en edición para no alterar cargos ya generados.
        await apiFetch(`/finance/concepts/${initial!._id}`, {
          method: 'PATCH',
          body: { name, allocationMethod, amount: Number(amount) },
        });
      } else {
        await apiFetch('/finance/concepts', {
          method: 'POST',
          body: {
            condominiumId,
            buildingId: buildingId || undefined,
            name,
            allocationMethod,
            amount: Number(amount),
          },
        });
      }
      onSaved();
    } catch (e2) {
      onError(e2 instanceof ApiError ? e2.message : 'No se pudo guardar el concepto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar concepto' : 'Nuevo concepto'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Alcance">
          <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)} disabled={editing}>
            <option value="">Todo el condominio</option>
            {buildings.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
          </select>
        </Field>
        <Field label="Método de reparto">
          <select
            className="input"
            value={allocationMethod}
            onChange={(e) => setAllocationMethod(e.target.value)}
          >
            {ALLOCATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Monto base">
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
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

// ─── Cargos ───────────────────────────────────────────────────────────────────

function Charges({
  condominiumId,
  canWrite,
  onError,
}: {
  condominiumId: string;
  canWrite: boolean;
  onError: (m: string | null) => void;
}) {
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Carga los periodos del condominio y preselecciona el primero.
  useEffect(() => {
    apiFetch<BillingPeriod[]>('/finance/periods', { query: { condominiumId } })
      .then((p) => { setPeriods(p); setPeriodId((c) => c || p[0]?._id || ''); })
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar periodos'));
  }, [condominiumId, onError]);

  const load = useCallback(() => {
    if (!periodId) { setCharges([]); return; }
    apiFetch<PaginatedResult<Charge>>('/finance/charges', {
      query: { periodId, pageSize: 100 },
    })
      .then((r) => setCharges(r.data))
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar cargos'));
  }, [periodId, onError]);

  useEffect(() => { load(); }, [load]);

  async function pay(charge: Charge) {
    const remaining = charge.amount - charge.paidAmount;
    setBusy(charge._id);
    onError(null);
    try {
      await apiFetch('/finance/payments', {
        method: 'POST',
        body: {
          chargeId: charge._id,
          amount: remaining,
          method: 'TRANSFER',
          paidAt: new Date().toISOString(),
        },
      });
      load();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo registrar el pago');
    } finally {
      setBusy(null);
    }
  }

  async function cancelCharge(id: string) {
    setBusy(id);
    onError(null);
    try {
      await apiFetch(`/finance/charges/${id}/cancel`, { method: 'PATCH', body: {} });
      load();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo cancelar el cargo');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 4, maxWidth: 300 }}>
        <span className="muted" style={{ fontSize: 12 }}>Periodo</span>
        <select className="input" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.length === 0 && <option value="">Sin periodos</option>}
          {periods.map((p) => <option key={p._id} value={p._id}>{monthName(p.month)} {p.year}</option>)}
        </select>
      </label>

      {periodId && (
        <table className="table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Monto</th>
              <th>Pagado</th>
              <th>Estado</th>
              {canWrite && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {charges.length === 0 && (
              <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin cargos.</td></tr>
            )}
            {charges.map((c) => (
              <tr key={c._id}>
                <td>{c.conceptSnapshot?.name ?? '—'}</td>
                <td>{money(c.amount)}</td>
                <td>{money(c.paidAmount)}</td>
                <td><StatusBadge status={c.status} /></td>
                {canWrite && (
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn"
                        disabled={busy === c._id || c.status === 'PAID' || c.status === 'CANCELLED'}
                        onClick={() => pay(c)}
                      >
                        Pagar saldo
                      </button>
                      <button
                        className="btn"
                        style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--border)' }}
                        disabled={busy === c._id || c.status === 'PAID' || c.status === 'CANCELLED'}
                        onClick={() => cancelCharge(c._id)}
                      >
                        Cancelar
                      </button>
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

// ─── Estado de cuenta por departamento ──────────────────────────────────────

interface OwnedApt {
  apartmentId: string;
  aptCode: string;
  ownerName: string;
}

function Statement({
  condominiumId,
  canWrite,
  onError,
}: {
  condominiumId: string;
  canWrite: boolean;
  onError: (m: string | null) => void;
}) {
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [owned, setOwned] = useState<OwnedApt[]>([]);
  const [apartmentId, setApartmentId] = useState('');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Periodos del condominio.
  useEffect(() => {
    apiFetch<BillingPeriod[]>('/finance/periods', { query: { condominiumId } })
      .then((p) => { setPeriods(p); setPeriodId((c) => c || p[0]?._id || ''); })
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar periodos'));
  }, [condominiumId, onError]);

  // Departamentos con propietario (propietario + código).
  useEffect(() => {
    (async () => {
      try {
        const b = await apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } });
        const aptLists = await Promise.all(
          b.data.map((bl) =>
            apiFetch<{ data: Apartment[] }>('/apartments', { query: { buildingId: bl._id, pageSize: 100 } })
              .then((r) => r.data).catch(() => []),
          ),
        );
        const aptCode = new Map(aptLists.flat().map((a) => [a._id, a.code]));
        const persons = await apiFetch<PaginatedResult<Person>>('/persons', { query: { pageSize: 100 } }).then((r) => r.data);
        const occLists = await Promise.all(
          persons.map((p) =>
            apiFetch<Occupant[]>('/occupants', { query: { personId: p._id } })
              .then((occ) => ({ p, occ })).catch(() => ({ p, occ: [] as Occupant[] })),
          ),
        );
        const result: OwnedApt[] = [];
        for (const { p, occ } of occLists) {
          for (const o of occ) {
            if (o.status === 'ACTIVE' && o.role === 'OWNER' && aptCode.has(o.apartmentId)) {
              result.push({ apartmentId: o.apartmentId, aptCode: aptCode.get(o.apartmentId)!, ownerName: `${p.firstName} ${p.lastName}` });
            }
          }
        }
        setOwned(result);
        setApartmentId((c) => c || result[0]?.apartmentId || '');
      } catch {
        setOwned([]);
      }
    })();
  }, [condominiumId]);

  const load = useCallback(() => {
    if (!periodId || !apartmentId) { setCharges([]); return; }
    setLoading(true);
    onError(null);
    apiFetch<PaginatedResult<Charge>>('/finance/charges', {
      query: { periodId, apartmentId, pageSize: 100 },
    })
      .then((r) => setCharges(r.data))
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar el estado de cuenta'))
      .finally(() => setLoading(false));
  }, [periodId, apartmentId, onError]);

  useEffect(() => { load(); }, [load]);

  const totalCharged = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaid = charges.reduce((s, c) => s + c.paidAmount, 0);
  const totalPending = Math.round((totalCharged - totalPaid) * 100) / 100;
  const pendingCharges = charges.filter((c) => c.status !== 'PAID' && c.status !== 'CANCELLED' && c.amount > c.paidAmount);
  const owner = owned.find((o) => o.apartmentId === apartmentId);

  /** Registra el pago del saldo pendiente de cada cargo del departamento. */
  async function payAll() {
    setBusy(true);
    onError(null);
    try {
      for (const c of pendingCharges) {
        const remaining = Math.round((c.amount - c.paidAmount) * 100) / 100;
        if (remaining <= 0) continue;
        await apiFetch('/finance/payments', {
          method: 'POST',
          body: { chargeId: c._id, amount: remaining, method: 'TRANSFER', paidAt: new Date().toISOString() },
        });
      }
      load();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo registrar el pago');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Periodo</span>
          <select className="input" value={periodId} onChange={(e) => setPeriodId(e.target.value)} style={{ minWidth: 160 }}>
            {periods.length === 0 && <option value="">Sin periodos</option>}
            {periods.map((p) => <option key={p._id} value={p._id}>{monthName(p.month)} {p.year}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span className="muted" style={{ fontSize: 12 }}>Propietario / Departamento</span>
          <select className="input" value={apartmentId} onChange={(e) => setApartmentId(e.target.value)} style={{ minWidth: 260 }}>
            {owned.length === 0 && <option value="">Sin propietarios asignados</option>}
            {owned.map((o) => <option key={o.apartmentId} value={o.apartmentId}>{o.ownerName} — Dpto. {o.aptCode}</option>)}
          </select>
        </label>
      </div>

      {!periodId || !apartmentId ? (
        <p className="muted">Selecciona un periodo y un departamento con propietario.</p>
      ) : (
        <>
          {owner && (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Propietario</div>
                <div style={{ fontWeight: 600 }}>{owner.ownerName}</div>
                <div className="muted" style={{ fontSize: 12 }}>Departamento {owner.aptCode}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 12 }}>Saldo pendiente</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: totalPending > 0 ? 'var(--danger)' : '#16a34a' }}>
                  {money(totalPending)}
                </div>
              </div>
            </div>
          )}

          <table className="table">
            <thead>
              <tr><th>Concepto</th><th>Monto</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="muted">Cargando…</td></tr>}
              {!loading && charges.length === 0 && (
                <tr><td colSpan={5} className="muted">Sin cargos. Genera los cargos del periodo primero.</td></tr>
              )}
              {!loading && charges.map((c) => (
                <tr key={c._id}>
                  <td>{c.conceptSnapshot?.name ?? '—'}</td>
                  <td>{money(c.amount)}</td>
                  <td>{money(c.paidAmount)}</td>
                  <td>{money(Math.round((c.amount - c.paidAmount) * 100) / 100)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {!loading && charges.length > 0 && (
                <tr style={{ fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td>{money(totalCharged)}</td>
                  <td>{money(totalPaid)}</td>
                  <td>{money(totalPending)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>

          {canWrite && pendingCharges.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" disabled={busy} onClick={payAll}>
                {busy ? 'Registrando…' : `Registrar pago del saldo (${money(totalPending)})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

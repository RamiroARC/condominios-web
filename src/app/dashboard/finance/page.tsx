'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { StatusBadge } from '@/components/ui';
import { money, monthName, shortDate } from '@/lib/format';
import type {
  BillingPeriod,
  Charge,
  FeeConcept,
  PaginatedResult,
} from '@/lib/types';

type Tab = 'concepts' | 'periods' | 'charges';

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
        {(['periods', 'concepts', 'charges'] as Tab[]).map((t) => (
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
            {t === 'periods' ? 'Periodos' : t === 'concepts' ? 'Conceptos' : 'Cargos'}
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
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    apiFetch<FeeConcept[]>('/finance/concepts', { query: { condominiumId } })
      .then(setConcepts)
      .catch((e) => onError(e instanceof ApiError ? e.message : 'Error al cargar conceptos'));
  }, [condominiumId, onError]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setShowForm(true)}>Nuevo concepto</button>
        </div>
      )}
      {showForm && (
        <NewConceptForm
          condominiumId={condominiumId}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
          onError={onError}
        />
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Método</th>
            <th>Monto base</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          {concepts.length === 0 && (
            <tr><td colSpan={4} className="muted">Sin conceptos.</td></tr>
          )}
          {concepts.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.allocationMethod}</td>
              <td>{money(c.amount)}</td>
              <td>{c.isActive ? 'Sí' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewConceptForm({
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
  const [name, setName] = useState('');
  const [allocationMethod, setAllocationMethod] = useState('COEFFICIENT');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      await apiFetch('/finance/concepts', {
        method: 'POST',
        body: { condominiumId, name, allocationMethod, amount: Number(amount) },
      });
      onCreated();
    } catch (e2) {
      onError(e2 instanceof ApiError ? e2.message : 'No se pudo crear el concepto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo concepto" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
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
  const [periodId, setPeriodId] = useState('');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

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

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'grid', gap: 4, maxWidth: 300 }}>
        <span className="muted" style={{ fontSize: 12 }}>ID de periodo</span>
        <input
          className="input"
          placeholder="periodId"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value.trim())}
        />
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
                    <button
                      className="btn"
                      disabled={busy === c._id || c.status === 'PAID' || c.status === 'CANCELLED'}
                      onClick={() => pay(c)}
                    >
                      Pagar saldo
                    </button>
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

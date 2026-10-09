'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import { money, shortDate } from '@/lib/format';
import type { Expense } from '@/lib/types';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'ELEVATOR_MAINTENANCE', label: 'Mantenimiento ascensor' },
  { value: 'COMMON_ELECTRICITY', label: 'Electricidad áreas comunes' },
  { value: 'WATER_SANITATION', label: 'Agua y saneamiento' },
  { value: 'CLEANING_GARDENING', label: 'Limpieza y jardinería' },
  { value: 'SECURITY', label: 'Seguridad' },
  { value: 'OTHER', label: 'Otros' },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

export default function ExpensesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('expenses:write');
  const { selectedId: condominiumId } = useCondominium();

  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const load = useCallback(() => {
    if (!condominiumId) { setItems([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<Expense[]>('/expenses', { query: { condominiumId } })
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar gastos'))
      .finally(() => setLoading(false));
  }, [condominiumId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Gastos</h1>
        {canWrite && condominiumId && <button className="btn" onClick={() => setCreating(true)}>Nuevo gasto</button>}
      </div>

      <CondominiumPicker />
      {error && <p className="error">{error}</p>}

      {(creating || editing) && condominiumId && (
        <ExpenseForm
          condominiumId={condominiumId}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}

      {!condominiumId ? (
        <p className="muted">Selecciona un condominio.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th>{canWrite && <th>Acciones</th>}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Cargando…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin gastos.</td></tr>}
            {!loading && items.map((x) => (
              <tr key={x._id}>
                <td>{shortDate(x.incurredAt)}</td>
                <td>{catLabel(x.category)}</td>
                <td>{x.description ?? '—'}</td>
                <td>{money(x.amount)}</td>
                {canWrite && (
                  <td>
                    <RowActions
                      onEdit={() => setEditing(x)}
                      deletePath={`/expenses/${x._id}`}
                      deleteMessage="¿Eliminar este gasto?"
                      onDeleted={load}
                    />
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

function ExpenseForm({
  condominiumId,
  initial,
  onClose,
  onSaved,
}: {
  condominiumId: string;
  initial: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!initial;
  const [category, setCategory] = useState(initial?.category ?? 'OTHER');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '');
  const [incurredAt, setIncurredAt] = useState(
    initial?.incurredAt ? initial.incurredAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = {
        category,
        description: description || undefined,
        amount: Number(amount),
        incurredAt: new Date(incurredAt).toISOString(),
      };
      if (editing) {
        await apiFetch(`/expenses/${initial!._id}`, { method: 'PATCH', body });
      } else {
        await apiFetch('/expenses', { method: 'POST', body: { condominiumId, ...body } });
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar el gasto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Categoría">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Descripción">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Monto">
          <input className="input" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="Fecha">
          <input className="input" type="date" value={incurredAt} onChange={(e) => setIncurredAt(e.target.value)} required />
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

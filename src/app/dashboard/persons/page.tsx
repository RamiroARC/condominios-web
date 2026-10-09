'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { RowActions } from '@/components/confirm-dialog';
import type {
  Apartment,
  Building,
  Occupant,
  PaginatedResult,
  Person,
} from '@/lib/types';

const DOCUMENT_TYPES = ['DNI', 'CE', 'PASSPORT', 'RUC', 'OTHER'];

/** Roles de ocupación con etiqueta en español (Propietario / Inquilino…). */
const ROLES: { value: string; label: string }[] = [
  { value: 'OWNER', label: 'Propietario' },
  { value: 'TENANT', label: 'Inquilino' },
  { value: 'RESIDENT', label: 'Residente' },
];
const roleLabel = (v: string) => ROLES.find((r) => r.value === v)?.label ?? v;

export default function PersonsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('persons:write');
  const canAssign = hasPermission('occupants:write');

  const [persons, setPersons] = useState<Person[]>([]);
  const [occByPerson, setOccByPerson] = useState<Record<string, Occupant[]>>({});
  const [aptCode, setAptCode] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PaginatedResult<Person>>('/persons', { query: { pageSize: 100 } });
      setPersons(res.data);
      // Trae las ocupaciones de cada persona en paralelo para mostrar depto/tipo.
      const entries = await Promise.all(
        res.data.map(async (p) => {
          try {
            const occ = await apiFetch<Occupant[]>('/occupants', { query: { personId: p._id } });
            return [p._id, occ] as const;
          } catch {
            return [p._id, [] as Occupant[]] as const;
          }
        }),
      );
      setOccByPerson(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar personas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Resuelve los códigos de departamento referenciados por las ocupaciones.
  useEffect(() => {
    const ids = new Set<string>();
    Object.values(occByPerson).forEach((list) =>
      list.forEach((o) => o.status === 'ACTIVE' && ids.add(o.apartmentId)),
    );
    const missing = [...ids].filter((id) => !(id in aptCode));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (id) => {
        try {
          const a = await apiFetch<Apartment>(`/apartments/${id}`);
          return [id, a.code] as const;
        } catch {
          return [id, id.slice(-6)] as const;
        }
      }),
    ).then((pairs) => setAptCode((cur) => ({ ...cur, ...Object.fromEntries(pairs) })));
  }, [occByPerson, aptCode]);

  const renderOccupancies = (personId: string) => {
    const list = (occByPerson[personId] ?? []).filter((o) => o.status === 'ACTIVE');
    if (list.length === 0) return <span className="muted">—</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {list.map((o) => (
          <span
            key={o._id}
            style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: '#eef2ff', color: 'var(--primary)' }}
          >
            {aptCode[o.apartmentId] ?? '…'} · {roleLabel(o.role)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Personas</h1>
        {canWrite && <button className="btn" onClick={() => setShowForm(true)}>Nueva persona</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {(showForm || editing) && (
        <PersonForm
          canAssign={canAssign}
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Departamento / Tipo</th>
            <th>Email</th>
            <th>Teléfono</th>
            {canWrite && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={canWrite ? 6 : 5} className="muted">Cargando…</td></tr>}
          {!loading && persons.length === 0 && <tr><td colSpan={canWrite ? 6 : 5} className="muted">Sin personas.</td></tr>}
          {!loading && persons.map((p) => (
            <tr key={p._id}>
              <td>{p.firstName} {p.lastName}</td>
              <td>{p.documentType} {p.documentNumber}</td>
              <td>{renderOccupancies(p._id)}</td>
              <td>{p.email ?? '—'}</td>
              <td>{p.phone ?? '—'}</td>
              {canWrite && (
                <td>
                  <RowActions
                    onEdit={() => setEditing(p)}
                    deletePath={`/persons/${p._id}`}
                    deleteMessage={`¿Eliminar a "${p.firstName} ${p.lastName}"?`}
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

function PersonForm({
  canAssign,
  initial,
  onClose,
  onSaved,
}: {
  canAssign: boolean;
  initial: Person | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { selectedId: condominiumId } = useCondominium();
  const editing = !!initial;

  // Datos de la persona
  const [documentType, setDocumentType] = useState(initial?.documentType ?? 'DNI');
  const [documentNumber, setDocumentNumber] = useState(initial?.documentNumber ?? '');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');

  // Asignación opcional
  const [assign, setAssign] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState('');
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [apartmentId, setApartmentId] = useState('');
  const [role, setRole] = useState('OWNER');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Cargar edificios cuando se activa la asignación.
  useEffect(() => {
    if (!assign || !condominiumId) return;
    apiFetch<{ data: Building[] }>('/buildings', { query: { condominiumId, pageSize: 100 } })
      .then((r) => { setBuildings(r.data); setBuildingId(r.data[0]?._id ?? ''); })
      .catch(() => setBuildings([]));
  }, [assign, condominiumId]);

  // Cargar departamentos del edificio.
  useEffect(() => {
    if (!assign || !buildingId) { setApartments([]); setApartmentId(''); return; }
    apiFetch<{ data: Apartment[] }>('/apartments', { query: { buildingId, pageSize: 100 } })
      .then((r) => { setApartments(r.data); setApartmentId(r.data[0]?._id ?? ''); })
      .catch(() => setApartments([]));
  }, [assign, buildingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const body = {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
      };
      if (editing) {
        // En edición solo se actualizan los datos básicos (no el documento).
        await apiFetch(`/persons/${initial!._id}`, { method: 'PATCH', body });
      } else {
        const person = await apiFetch<Person>('/persons', {
          method: 'POST',
          body: { documentType, documentNumber, ...body },
        });
        // Si se marcó asignación y hay departamento, crea la ocupación.
        if (assign && apartmentId) {
          await apiFetch('/occupants', {
            method: 'POST',
            body: {
              condominiumId,
              apartmentId,
              personId: person._id,
              role,
              startDate: new Date().toISOString(),
              isPrimary: true,
            },
          });
        }
      }
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? 'Editar persona' : 'Nueva persona'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Tipo de documento">
          <select className="input" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={editing}>
            {DOCUMENT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Número de documento">
          <input className="input" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required disabled={editing} />
        </Field>
        <Field label="Nombres">
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </Field>
        <Field label="Apellidos">
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        {canAssign && !editing && (
          <>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 10px' }}>
              <input type="checkbox" checked={assign} onChange={(e) => setAssign(e.target.checked)} />
              <span>Asignar a un departamento</span>
            </label>

            {assign && (
              <div style={{ borderLeft: '3px solid var(--border)', paddingLeft: 12 }}>
                <Field label="Edificio">
                  <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                    {buildings.length === 0 && <option value="">Sin edificios</option>}
                    {buildings.map((b) => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                  </select>
                </Field>
                <Field label="Departamento">
                  <select className="input" value={apartmentId} onChange={(e) => setApartmentId(e.target.value)}>
                    {apartments.length === 0 && <option value="">Sin departamentos</option>}
                    {apartments.map((a) => <option key={a._id} value={a._id}>{a.code}</option>)}
                  </select>
                </Field>
                <Field label="Tipo">
                  <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </>
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-context';
import { useCondominium } from '@/components/condominium-context';
import { CondominiumPicker } from '@/components/condominium-picker';
import { Modal, Field } from '@/components/modal';
import { StatusBadge } from '@/components/ui';
import { shortDate } from '@/lib/format';
import type { Announcement, PaginatedResult } from '@/lib/types';

export default function CommunicationsPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('communications:write');
  const { selectedId: condominiumId } = useCondominium();

  const [items, setItems] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    if (!condominiumId) { setItems([]); return; }
    apiFetch<PaginatedResult<Announcement>>('/announcements', {
      query: { condominiumId, pageSize: 50 },
    })
      .then((r) => setItems(r.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar anuncios'));
  }, [condominiumId]);

  useEffect(() => { load(); }, [load]);

  async function action(id: string, verb: 'publish' | 'archive') {
    setBusy(id);
    setError(null);
    try {
      await apiFetch(`/announcements/${id}/${verb}`, { method: 'PATCH', body: {} });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `No se pudo ${verb === 'publish' ? 'publicar' : 'archivar'}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Comunicaciones</h1>
        {canWrite && condominiumId && (
          <button className="btn" onClick={() => setShowForm(true)}>Nuevo anuncio</button>
        )}
      </div>

      <CondominiumPicker />

      {showForm && (
        <NewAnnouncementForm
          condominiumId={condominiumId}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}

      {error && <p className="error">{error}</p>}
      {!condominiumId && <p className="muted">Selecciona un condominio.</p>}

      {condominiumId && (
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Audiencia</th>
              <th>Estado</th>
              <th>Publicado</th>
              {canWrite && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={canWrite ? 5 : 4} className="muted">Sin anuncios.</td></tr>
            )}
            {items.map((a) => (
              <tr key={a._id}>
                <td>{a.title}</td>
                <td>{a.audienceType}</td>
                <td><StatusBadge status={a.status} /></td>
                <td>{shortDate(a.publishedAt)}</td>
                {canWrite && (
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn"
                      disabled={busy === a._id || a.status !== 'DRAFT'}
                      onClick={() => action(a._id, 'publish')}
                    >
                      Publicar
                    </button>
                    <button
                      className="btn"
                      style={{ background: '#6b7280' }}
                      disabled={busy === a._id || a.status === 'ARCHIVED'}
                      onClick={() => action(a._id, 'archive')}
                    >
                      Archivar
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

const AUDIENCE_TYPES = ['CONDOMINIUM', 'BUILDING', 'APARTMENT'];

function NewAnnouncementForm({
  condominiumId,
  onClose,
  onCreated,
}: {
  condominiumId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceType, setAudienceType] = useState('CONDOMINIUM');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiFetch('/announcements', {
        method: 'POST',
        body: { condominiumId, title, body, audienceType },
      });
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'No se pudo crear el anuncio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo anuncio" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Título">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Contenido">
          <textarea
            className="input"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </Field>
        <Field label="Audiencia">
          <select
            className="input"
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value)}
          >
            {AUDIENCE_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
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

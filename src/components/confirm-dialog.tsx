'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { apiFetch, ApiError } from '@/lib/api-client';

/** Diálogo de confirmación para acciones destructivas (eliminar). */
export function ConfirmDialog({
  title = 'Confirmar eliminación',
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onClose,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <p className="muted" style={{ fontSize: 12 }}>Esta acción no se puede deshacer.</p>
      {err && <p className="error">{err}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" style={{ background: '#6b7280' }} onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="btn" style={{ background: 'var(--danger)' }} onClick={confirm} disabled={busy}>
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Botones de acción por fila (Editar / Eliminar). El borrado dispara un
 * ConfirmDialog; al confirmar hace DELETE al endpoint indicado.
 */
export function RowActions({
  onEdit,
  deletePath,
  deleteMessage,
  onDeleted,
  canWrite = true,
}: {
  onEdit?: () => void;
  deletePath?: string;
  deleteMessage: string;
  onDeleted?: () => void;
  canWrite?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!canWrite) return <span className="muted">—</span>;

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {onEdit && (
        <button
          className="btn"
          style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--border)', padding: '4px 10px' }}
          onClick={onEdit}
        >
          Editar
        </button>
      )}
      {deletePath && (
        <button
          className="btn"
          style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--border)', padding: '4px 10px' }}
          onClick={() => setConfirming(true)}
        >
          Eliminar
        </button>
      )}
      {confirming && deletePath && (
        <ConfirmDialog
          message={deleteMessage}
          onConfirm={async () => {
            await apiFetch(deletePath, { method: 'DELETE' });
            onDeleted?.();
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { PaginatedResult } from '@/lib/types';

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  /** Ruta del endpoint (sin API_URL), ej. '/condominiums'. */
  path: string;
  columns: Column<T>[];
  /** Parámetros de query adicionales (además de page/pageSize/search). */
  query?: Record<string, string | undefined>;
  searchable?: boolean;
  /** Clave por fila para React. Por defecto usa `_id`. */
  rowKey?: (row: T) => string;
  /** Cambiar este valor fuerza una recarga (p. ej. tras crear un registro). */
  refreshKey?: number;
}

/**
 * Tabla que consume un endpoint paginado del backend
 * (respuesta con forma PaginatedResult) y ofrece búsqueda y paginación.
 */
export function DataTable<T extends { _id: string }>({
  path,
  columns,
  query,
  searchable = true,
  rowKey,
  refreshKey = 0,
}: DataTableProps<T>) {
  const [data, setData] = useState<PaginatedResult<T> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce de la búsqueda.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<PaginatedResult<T>>(path, {
      query: { page, pageSize: 20, search: debounced || undefined, ...query },
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Error al cargar');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, page, debounced, JSON.stringify(query), refreshKey]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {searchable && (
        <input
          className="input"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      )}

      {error && <p className="error">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="muted">
                Cargando…
              </td>
            </tr>
          )}
          {!loading && data && data.data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="muted">
                Sin resultados.
              </td>
            </tr>
          )}
          {!loading &&
            data?.data.map((row) => (
              <tr key={rowKey ? rowKey(row) : row._id}>
                {columns.map((c) => (
                  <td key={c.header}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {data && data.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="muted">
            Página {data.page} de {data.totalPages} · {data.total} registros
          </span>
          <button
            className="btn"
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

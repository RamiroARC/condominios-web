'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch } from '@/lib/api-client';
import type { Condominium, PaginatedResult } from '@/lib/types';

const STORAGE_KEY = 'cm.condominiumId';

interface CondominiumContextValue {
  condos: Condominium[];
  selectedId: string;
  selected: Condominium | null;
  setSelectedId: (id: string) => void;
  loading: boolean;
}

const Ctx = createContext<CondominiumContextValue | undefined>(undefined);

/**
 * Carga la lista de condominios una sola vez y mantiene el condominio activo,
 * persistido en localStorage. Todas las pantallas del panel lo comparten.
 */
export function CondominiumProvider({ children }: { children: React.ReactNode }) {
  const [condos, setCondos] = useState<Condominium[]>([]);
  const [selectedId, setSelectedIdState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<PaginatedResult<Condominium>>('/condominiums', { query: { pageSize: 100 } })
      .then((res) => {
        if (cancelled) return;
        setCondos(res.data);
        const stored =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(STORAGE_KEY)
            : null;
        const valid = res.data.find((c) => c._id === stored);
        setSelectedIdState(valid ? valid._id : res.data[0]?._id ?? '');
      })
      .catch(() => {
        // Sin condominios accesibles o error de red: se deja vacío.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selected = useMemo(
    () => condos.find((c) => c._id === selectedId) ?? null,
    [condos, selectedId],
  );

  const value = useMemo(
    () => ({ condos, selectedId, selected, setSelectedId, loading }),
    [condos, selectedId, selected, setSelectedId, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCondominium(): CondominiumContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCondominium debe usarse dentro de <CondominiumProvider>');
  return ctx;
}

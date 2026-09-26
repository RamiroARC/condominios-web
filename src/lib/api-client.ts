import { API_URL } from './config';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './token-store';
import { isExpired } from './jwt';
import type { AuthTokens } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Evita múltiples refresh simultáneos: se comparte la misma promesa. */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearTokens();
          return null;
        }
        const tokens = (await res.json()) as AuthTokens;
        setTokens(tokens);
        return tokens.accessToken;
      } catch {
        clearTokens();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function currentAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && isExpired(token)) {
    return refreshAccessToken();
  }
  return token;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean; // default true
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Cliente HTTP hacia la API. Adjunta el access token, refresca una vez ante un
 * 401 y reintenta la petición.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const doRequest = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = auth ? await currentAccessToken() : null;
  let res = await doRequest(token);

  // Reintento único ante 401: refresca y repite.
  if (res.status === 401 && auth) {
    token = await refreshAccessToken();
    if (token) res = await doRequest(token);
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      message = (data.message as string) ?? message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    if (res.status === 401) clearTokens();
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

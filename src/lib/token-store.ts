import type { AuthTokens } from './types';

/**
 * Almacenamiento de tokens en el navegador. Se usa localStorage para persistir
 * la sesión entre recargas. Todas las funciones son no-op en el servidor (SSR),
 * donde `window` no existe.
 */
const ACCESS_KEY = 'cm.accessToken';
const REFRESH_KEY = 'cm.refreshToken';

const isBrowser = () => typeof window !== 'undefined';

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: AuthTokens): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

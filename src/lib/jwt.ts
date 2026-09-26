import type { SessionUser } from './types';

interface AccessTokenPayload {
  sub: string;
  email: string;
  organizationId: string | null;
  permissions?: string[];
  condominiumIds?: string[];
  exp?: number;
}

/** Decodifica (sin verificar firma) el payload de un JWT. */
function decode(token: string): AccessTokenPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(normalized)
        : Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json) as AccessTokenPayload;
  } catch {
    return null;
  }
}

/** Construye el usuario de sesión a partir del access token. */
export function sessionFromToken(token: string): SessionUser | null {
  const payload = decode(token);
  if (!payload) return null;
  return {
    userId: payload.sub,
    email: payload.email,
    organizationId: payload.organizationId ?? null,
    permissions: payload.permissions ?? [],
    condominiumIds: payload.condominiumIds ?? [],
  };
}

/** Indica si el token ya expiró (con margen de 10s). */
export function isExpired(token: string): boolean {
  const payload = decode(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000 - 10_000;
}

/** URL base de la API. Debe incluir el prefijo /api del backend NestJS. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

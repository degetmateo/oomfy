import { z } from 'zod';

export function isHttpUrlString(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isHttpsUrlString(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const httpUrlSchema = (message = 'La URL debe usar protocolo http o https.') =>
  z.string().trim().refine(isHttpUrlString, { error: message });

export const httpsUrlSchema = (message = 'La URL debe usar protocolo HTTPS.') =>
  z.string().trim().refine(isHttpsUrlString, { error: message });

export const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const safeEntityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, { error: 'Identificador inválido.' });


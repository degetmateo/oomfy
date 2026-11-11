import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { emptyToNull, httpUrlSchema } from './url.schemas.js';

export const UsernameSchema = z
  .string({ error: 'El nombre de usuario es requerido.' })
  .trim()
  .min(LIMITS.USERNAME_MIN, { error: `Mínimo ${LIMITS.USERNAME_MIN} caracteres.` })
  .max(LIMITS.USERNAME_MAX, { error: `Máximo ${LIMITS.USERNAME_MAX} caracteres.` })
  .regex(/^[a-zA-Z0-9_]+$/, { error: 'Solo se permiten letras, números y guiones bajos.' });

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.NAME_MIN, { error: `Mínimo ${LIMITS.NAME_MIN} caracter.` })
    .max(LIMITS.NAME_MAX, { error: `Máximo ${LIMITS.NAME_MAX} caracteres.` })
    .optional(),
  bio: z
    .string()
    .max(LIMITS.BIO_MAX, { error: `Máximo ${LIMITS.BIO_MAX} caracteres.` })
    .nullable()
    .optional(),
  location: z
    .string()
    .max(LIMITS.LOCATION_MAX, { error: `Máximo ${LIMITS.LOCATION_MAX} caracteres.` })
    .nullable()
    .optional(),
  link: z.preprocess(
    emptyToNull,
    httpUrlSchema('El sitio web debe comenzar con http:// o https://')
      .max(LIMITS.LINK_MAX, { error: `Máximo ${LIMITS.LINK_MAX} caracteres.` })
      .nullable()
      .optional()
  ),
  icon_action: z.enum(['none', 'update', 'delete']).default('none'),
  banner_action: z.enum(['none', 'update', 'delete']).default('none'),
});

export const UpdateUsernameSchema = z.object({
  username: UsernameSchema,
});

export const UpdatePasswordSchema = z.object({
  current_password: z.string().min(1, { error: 'Contraseña actual requerida.' }).max(LIMITS.PASSWORD_MAX),
  new_password: z
    .string()
    .min(LIMITS.PASSWORD_MIN, { error: `Mínimo ${LIMITS.PASSWORD_MIN} caracteres.` })
    .max(LIMITS.PASSWORD_MAX, { error: `Máximo ${LIMITS.PASSWORD_MAX} caracteres.` }),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateUsernameInput = z.infer<typeof UpdateUsernameSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;

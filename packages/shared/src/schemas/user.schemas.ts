import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(LIMITS.NAME_MIN)
    .max(LIMITS.NAME_MAX)
    .optional(),
  bio: z
    .string()
    .max(LIMITS.BIO_MAX, `Máximo ${LIMITS.BIO_MAX} caracteres.`)
    .nullable()
    .optional(),
  location: z
    .string()
    .max(LIMITS.LOCATION_MAX, `Máximo ${LIMITS.LOCATION_MAX} caracteres.`)
    .nullable()
    .optional(),
  link: z
    .string()
    .max(LIMITS.LINK_MAX, `Máximo ${LIMITS.LINK_MAX} caracteres.`)
    .nullable()
    .optional(),
  icon_action: z.enum(['none', 'update', 'delete']).default('none'),
  banner_action: z.enum(['none', 'update', 'delete']).default('none'),
});

export const UpdateUsernameSchema = z.object({
  username: z
    .string()
    .min(LIMITS.USERNAME_MIN)
    .max(LIMITS.USERNAME_MAX)
    .regex(/^[a-zA-Z0-9_]+$/),
});

export const UpdatePasswordSchema = z.object({
  current_password: z.string().min(1, 'Contraseña actual requerida.'),
  new_password: z
    .string()
    .min(LIMITS.PASSWORD_MIN)
    .max(LIMITS.PASSWORD_MAX),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateUsernameInput = z.infer<typeof UpdateUsernameSchema>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;


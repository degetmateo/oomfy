import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { UsernameSchema, USERNAME_REGEX } from './user.schemas.js';
import { emptyToNull } from './url.schemas.js';

export const SystemSettingsUpdateSchema = z
  .object({
    disable_post_creation: z.boolean().optional(),
    disable_profile_editing: z.boolean().optional(),
    disable_signups: z.boolean().optional(),
    disable_signins: z.boolean().optional(),
  })
  .strict();

export const AdminUserUpdateSchema = z.object({
  name: z.string().trim().min(LIMITS.NAME_MIN).max(LIMITS.NAME_MAX).optional(),
  username: UsernameSchema.optional(),
  email: z.string().trim().email({ error: 'Formato de correo inválido.' }).max(LIMITS.EMAIL_MAX).optional(),
  password: z.string().min(LIMITS.PASSWORD_MIN).max(LIMITS.PASSWORD_MAX).optional(),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
  role: z.enum(['member', 'tester', 'mod', 'admin']).optional(),
});

export const AdminUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'pending']),
});

export const AdminUserRoleSchema = z.object({
  role: z.enum(['member', 'tester', 'mod', 'admin']),
});

const dateStr = z.preprocess(emptyToNull, z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)), { error: 'Fecha inválida.' }).nullable().optional());

export const AdminUserQuerySchema = z.object({
  query: z.preprocess(emptyToNull, z.string().trim().max(LIMITS.EMAIL_MAX).nullable().optional()),
  name: z.preprocess(emptyToNull, z.string().trim().max(LIMITS.NAME_MAX).nullable().optional()),
  username: z.preprocess(emptyToNull, z.string().trim().max(LIMITS.USERNAME_MAX).nullable().optional()),
  role: z.preprocess(emptyToNull, z.enum(['member', 'tester', 'mod', 'admin']).nullable().optional()),
  status: z.preprocess(emptyToNull, z.enum(['pending', 'active', 'suspended']).nullable().optional()),
  created_from: dateStr,
  created_to: dateStr,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const AdminPushBroadcastSchema = z.object({
  title: z.string().trim().min(1, { error: 'El título es obligatorio.' }).max(120),
  body: z.string().trim().min(1, { error: 'El contenido es obligatorio.' }).max(300),
  url: z.string().trim().max(300).optional().default('/notifications').refine(
    (v) => v.startsWith('/') && !v.startsWith('//') && !v.startsWith('\\'),
    { error: 'La URL debe ser una ruta interna segura.' }
  ),
  target_username: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(LIMITS.USERNAME_MAX)
      .regex(USERNAME_REGEX, { error: 'Solo se permiten letras del alfabeto inglés, números y guiones bajos.' })
      .nullable()
      .optional()
  ),
});


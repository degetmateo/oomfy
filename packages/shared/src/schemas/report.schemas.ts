import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { emptyToNull, safeEntityIdSchema } from './url.schemas.js';
import { USERNAME_REGEX } from './user.schemas.js';

export const CreateReportSchema = z.object({
  target_type: z.enum(['publication', 'user', 'message']),
  target_id: safeEntityIdSchema,
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
  target_content: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
  reason: z.string().trim().min(2, { error: 'Motivo requerido.' }).max(160),
  details: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
});

export const ResolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']).default('resolved'),
});

export const ReportQuerySchema = z.object({
  status: z.preprocess(emptyToNull, z.enum(['pending', 'resolved', 'dismissed']).nullable().optional()),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGINATION_LIMIT_MAX).default(LIMITS.PAGINATION_LIMIT_DEFAULT),
});

export type CreateReportBodyInput = z.infer<typeof CreateReportSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;

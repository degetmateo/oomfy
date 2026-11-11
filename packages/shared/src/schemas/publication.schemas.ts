import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { emptyToNull, httpUrlSchema, safeEntityIdSchema } from './url.schemas.js';

export const CreatePublicationSchema = z.object({
  content: z
    .string()
    .max(LIMITS.POST_CONTENT_MAX, { error: `Máximo ${LIMITS.POST_CONTENT_MAX} caracteres.` })
    .nullable()
    .optional(),
  type: z.enum(['default', 'reply', 'quote']).default('default'),
  target_id: safeEntityIdSchema.nullable().optional(),
  spotify_url: httpUrlSchema('Enlace de Spotify inválido.').nullable().optional(),
  tenor: z
    .array(
      z.object({
        src: httpUrlSchema('URL de GIF inválida.'),
        index: z.number().int().min(0).max(3),
      })
    )
    .max(4)
    .optional()
    .default([]),
});

export const CreatePublicationFormSchema = CreatePublicationSchema.extend({
  target_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
  spotify_url: z.preprocess(emptyToNull, httpUrlSchema('Enlace de Spotify inválido.').nullable().optional()),
  tenor: z.preprocess(
    (v) => {
      if (typeof v === 'string') {
        if (!v.trim()) return [];
        try { return JSON.parse(v); } catch { return v; }
      }
      return v;
    },
    CreatePublicationSchema.shape.tenor
  ),
});

export const QueryPublicationSchema = z.object({
  older_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
  author_username: z.preprocess(emptyToNull, z.string().trim().max(60).nullable().optional()),
  type: z.preprocess(emptyToNull, z.enum(['default', 'reply', 'quote', 'shared', 'posts', 'liked']).nullable().optional()),
  target_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
  liked_by: z.preprocess(emptyToNull, z.string().trim().max(60).nullable().optional()),
  query: z.preprocess(emptyToNull, z.string().trim().max(LIMITS.SEARCH_QUERY_MAX).nullable().optional()),
  since: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  until: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  has_media: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().transform((v) => v === true || v === 'true'),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGINATION_LIMIT_MAX).default(LIMITS.PAGINATION_LIMIT_DEFAULT),
});

export type CreatePublicationInput = z.infer<typeof CreatePublicationSchema>;
export type QueryPublicationInput = z.infer<typeof QueryPublicationSchema>;

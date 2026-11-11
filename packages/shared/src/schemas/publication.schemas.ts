import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const CreatePublicationSchema = z.object({
  content: z
    .string()
    .max(LIMITS.POST_CONTENT_MAX, `Máximo ${LIMITS.POST_CONTENT_MAX} caracteres.`)
    .nullable()
    .optional(),
  type: z.enum(['default', 'reply', 'quote', 'shared']).default('default'),
  target_id: z.string().uuid().nullable().optional(),
  spotify_url: z.string().url().nullable().optional(),
  tenor: z
    .array(
      z.object({
        src: z.string().url(),
        index: z.number().int().min(0).max(3),
      })
    )
    .optional()
    .default([]),
});

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const CreatePublicationFormSchema = CreatePublicationSchema.extend({
  target_id: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
  spotify_url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
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
  older_id: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
  author_username: z.preprocess(emptyToNull, z.string().max(60).nullable().optional()),
  type: z.preprocess(emptyToNull, z.enum(['default', 'reply', 'quote', 'shared', 'posts', 'liked']).nullable().optional()),
  target_id: z.preprocess(emptyToNull, z.string().max(100).nullable().optional()),
  liked_by: z.preprocess(emptyToNull, z.string().max(60).nullable().optional()),
  query: z.preprocess(emptyToNull, z.string().max(200).nullable().optional()),
  since: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  until: z.preprocess(emptyToNull, z.string().max(40).nullable().optional()),
  has_media: z.union([z.boolean(), z.enum(['true', 'false'])]).optional().transform((v) => v === true || v === 'true'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreatePublicationInput = z.infer<typeof CreatePublicationSchema>;
export type QueryPublicationInput = z.infer<typeof QueryPublicationSchema>;


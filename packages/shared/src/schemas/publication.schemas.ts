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

export const QueryPublicationSchema = z.object({
  older_id: z.string().uuid().nullable().optional(),
  author_username: z.string().nullable().optional(),
  type: z.enum(['default', 'reply', 'quote', 'shared', 'posts', 'liked']).nullable().optional(),
  target_id: z.string().uuid().nullable().optional(),
  liked_by: z.string().nullable().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreatePublicationInput = z.infer<typeof CreatePublicationSchema>;
export type QueryPublicationInput = z.infer<typeof QueryPublicationSchema>;


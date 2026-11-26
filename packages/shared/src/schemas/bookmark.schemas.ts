import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { emptyToNull, safeEntityIdSchema } from './url.schemas.js';

export const CreateBookmarkSchema = z.object({
  publication_id: safeEntityIdSchema,
  folder_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
});

export const MoveBookmarkSchema = z.object({
  folder_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable()),
});

export const CreateBookmarkFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Ingresa un nombre para la carpeta.' })
    .max(LIMITS.BOOKMARK_FOLDER_NAME_MAX, { error: `Máximo ${LIMITS.BOOKMARK_FOLDER_NAME_MAX} caracteres.` }),
});

export const UpdateBookmarkFolderSchema = CreateBookmarkFolderSchema;

export const ReorderBookmarksSchema = z.object({
  folder_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
  ordered_publication_ids: z.array(safeEntityIdSchema).min(1).max(200),
});

export const BookmarkListQuerySchema = z.object({
  folder_id: z.string().trim().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGINATION_LIMIT_MAX).optional().default(30),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
export type MoveBookmarkInput = z.infer<typeof MoveBookmarkSchema>;
export type CreateBookmarkFolderInput = z.infer<typeof CreateBookmarkFolderSchema>;
export type UpdateBookmarkFolderInput = z.infer<typeof UpdateBookmarkFolderSchema>;
export type ReorderBookmarksInput = z.infer<typeof ReorderBookmarksSchema>;
export type BookmarkListQueryInput = z.infer<typeof BookmarkListQuerySchema>;

import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { emptyToNull, safeEntityIdSchema } from './url.schemas.js';
import { USERNAME_REGEX } from './user.schemas.js';

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGINATION_LIMIT_MAX).default(LIMITS.PAGINATION_LIMIT_DEFAULT),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  older_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
});

export const SearchQuerySchema = z.object({
  q: z.string().trim().max(LIMITS.SEARCH_QUERY_MAX).optional().default(''),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGINATION_LIMIT_MAX).default(LIMITS.PAGINATION_LIMIT_DEFAULT),
});

export const LinkPreviewQuerySchema = z.object({
  url: z.string().trim().min(1, { error: 'URL requerida.' }).max(2048),
});

export const EntityIdParamSchema = z.object({
  id: safeEntityIdSchema,
});

export const PublicationIdParamSchema = z.object({
  publicationId: safeEntityIdSchema,
});

export const UsernameParamSchema = z.object({
  username: z.string().trim().min(1).max(64).regex(USERNAME_REGEX, { error: 'Solo se permiten letras del alfabeto inglés, números y guiones bajos.' }),
});

import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { emptyToNull, httpUrlSchema, safeEntityIdSchema } from './url.schemas.js';
import { USERNAME_REGEX } from './user.schemas.js';

export const CreateChatSchema = z.object({
  target_username: z
    .string()
    .trim()
    .min(1)
    .max(LIMITS.USERNAME_MAX)
    .regex(USERNAME_REGEX, { error: 'Solo se permiten letras del alfabeto inglés, números y guiones bajos.' }),
});

export const SendMessageSchema = z.object({
  chat_id: safeEntityIdSchema,
  content: z
    .string()
    .max(LIMITS.MESSAGE_CONTENT_MAX, { error: `Máximo ${LIMITS.MESSAGE_CONTENT_MAX} caracteres.` })
    .optional()
    .default(''),
  reply_to_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
  shared_publication_id: z.preprocess(emptyToNull, safeEntityIdSchema.nullable().optional()),
  gif_url: z.preprocess(emptyToNull, httpUrlSchema('URL de GIF inválida.').nullable().optional()),
  media_urls: z.preprocess(
    (v) => {
      if (typeof v === 'string') {
        if (!v.trim()) return [];
        try { return JSON.parse(v); } catch { return v; }
      }
      return v;
    },
    z.array(httpUrlSchema('URL de archivo multimedia inválida.')).max(4).optional().default([])
  ),
});

export const SendMessageAdminSchema = SendMessageSchema.extend({
  content: z.string().optional().default(''),
});

export const SharePublicationMessageSchema = z.object({
  publication_id: safeEntityIdSchema,
  recipient_usernames: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(LIMITS.USERNAME_MAX)
        .regex(USERNAME_REGEX, { error: 'Nombre de usuario inválido.' })
    )
    .min(1, { error: 'Selecciona al menos un destinatario.' })
    .max(20, { error: 'Máximo 20 destinatarios a la vez.' }),
  content: z
    .string()
    .max(LIMITS.MESSAGE_CONTENT_MAX, { error: `Máximo ${LIMITS.MESSAGE_CONTENT_MAX} caracteres.` })
    .optional()
    .default(''),
});

export type CreateChatInput = z.infer<typeof CreateChatSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type SharePublicationMessageInput = z.infer<typeof SharePublicationMessageSchema>;

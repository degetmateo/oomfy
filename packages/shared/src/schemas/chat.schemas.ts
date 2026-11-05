import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const CreateChatSchema = z.object({
  target_username: z.string().min(1),
});

export const SendMessageSchema = z.object({
  chat_id: z.string().uuid(),
  content: z
    .string()
    .max(LIMITS.MESSAGE_CONTENT_MAX, `Máximo ${LIMITS.MESSAGE_CONTENT_MAX} caracteres.`)
    .optional()
    .default(''),
  reply_to_id: z.string().uuid().nullable().optional(),
  gif_url: z.string().url().nullable().optional(),
  media_urls: z.array(z.string().url()).max(4).optional().default([]),
});

export type CreateChatInput = z.infer<typeof CreateChatSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;


import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const CreateChatSchema = z.object({
  target_username: z.string().min(1),
});

export const SendMessageSchema = z.object({
  chat_id: z.string().uuid(),
  content: z
    .string()
    .min(1, 'El mensaje no puede estar vacío.')
    .max(LIMITS.MESSAGE_CONTENT_MAX, `Máximo ${LIMITS.MESSAGE_CONTENT_MAX} caracteres.`)
    .refine((val) => val.trim().length > 0, 'El mensaje no puede ser solo espacios.'),
});

export type CreateChatInput = z.infer<typeof CreateChatSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;


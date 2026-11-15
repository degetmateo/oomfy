import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const EMOTE_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const EmoteNameSchema = z
  .string()
  .trim()
  .min(LIMITS.EMOTE_NAME_MIN, 'El nombre del emote debe tener al menos 2 caracteres.')
  .max(LIMITS.EMOTE_NAME_MAX, 'El nombre del emote no puede superar los 32 caracteres.')
  .regex(
    EMOTE_NAME_REGEX,
    'El nombre del emote solo puede contener letras del alfabeto inglés, números y guiones bajos.'
  );

export const CreateEmoteSchema = z.object({
  name: EmoteNameSchema,
});

export type CreateEmoteInput = z.infer<typeof CreateEmoteSchema>;

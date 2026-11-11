import { z } from 'zod';
import { httpsUrlSchema } from './url.schemas.js';

export const PushSubscribeSchema = z.object({
  endpoint: httpsUrlSchema('El endpoint push debe usar HTTPS.'),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(128),
  }),
  previous_endpoint: httpsUrlSchema('El endpoint previo debe usar HTTPS.').nullable().optional(),
});

export const PushUnsubscribeSchema = z.object({
  endpoint: httpsUrlSchema('Endpoint push inválido.'),
});

export const PushPreferencesUpdateSchema = z.object({
  endpoint: httpsUrlSchema('Endpoint push inválido.').nullable().optional(),
  preferences: z.record(z.string(), z.boolean()).optional().default({}),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;
export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeSchema>;

import { z } from 'zod';

export const PushSubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint push inválido.'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  previous_endpoint: z.string().url().nullable().optional(),
});

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint push inválido.'),
});

export const PushPreferencesUpdateSchema = z.object({
  endpoint: z.string().url().nullable().optional(),
  preferences: z.record(z.boolean()).optional().default({}),
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;
export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeSchema>;


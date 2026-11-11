import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';
import { UsernameSchema } from './user.schemas.js';

export const SignupSchema = z.object({
  email: z
    .string({ error: 'El correo electrónico es requerido.' })
    .trim()
    .email({ error: 'El formato del correo electrónico no es válido.' })
    .max(LIMITS.EMAIL_MAX, { error: `Máximo ${LIMITS.EMAIL_MAX} caracteres.` }),
  username: UsernameSchema,
  name: z
    .string({ error: 'El nombre es requerido.' })
    .trim()
    .min(LIMITS.NAME_MIN, { error: `Mínimo ${LIMITS.NAME_MIN} caracter.` })
    .max(LIMITS.NAME_MAX, { error: `Máximo ${LIMITS.NAME_MAX} caracteres.` }),
  password: z
    .string({ error: 'La contraseña es requerida.' })
    .min(LIMITS.PASSWORD_MIN, { error: `Mínimo ${LIMITS.PASSWORD_MIN} caracteres.` })
    .max(LIMITS.PASSWORD_MAX, { error: `Máximo ${LIMITS.PASSWORD_MAX} caracteres.` }),
  accepted_terms: z.literal(true, {
    error: 'Debes aceptar la Política de Privacidad y los Términos y Condiciones para crear una cuenta.',
  }),
});

export const SigninSchema = z.object({
  username: z.string({ error: 'El usuario es requerido.' }).trim().min(1).max(LIMITS.EMAIL_MAX),
  password: z.string({ error: 'La contraseña es requerida.' }).min(1).max(LIMITS.PASSWORD_MAX),
  platform: z.string().max(64).optional(),
});

export const VerifyAccountSchema = z.object({
  token: z.string().trim().min(10, { error: 'Token de verificación inválido.' }).max(256),
});

export const ForgotPasswordSchema = z.object({
  username: z.string().trim().min(1, { error: 'El usuario es requerido.' }).max(LIMITS.EMAIL_MAX),
});

export const ForgotUsernameSchema = z.object({
  email: z.string().trim().email({ error: 'Correo electrónico no válido.' }).max(LIMITS.EMAIL_MAX),
});

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(10, { error: 'Token inválido o expirado.' }).max(256),
  new_password: z
    .string()
    .min(LIMITS.PASSWORD_MIN, { error: `Mínimo ${LIMITS.PASSWORD_MIN} caracteres.` })
    .max(LIMITS.PASSWORD_MAX, { error: `Máximo ${LIMITS.PASSWORD_MAX} caracteres.` }),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, { error: 'Debes confirmar tu contraseña actual.' }).max(LIMITS.PASSWORD_MAX),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type SigninInput = z.infer<typeof SigninSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

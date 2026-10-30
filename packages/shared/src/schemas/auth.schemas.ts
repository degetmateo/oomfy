import { z } from 'zod';
import { LIMITS } from '../constants/limits.js';

export const SignupSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es requerido.' })
    .email('El formato del correo electrónico no es válido.')
    .max(LIMITS.EMAIL_MAX, `Máximo ${LIMITS.EMAIL_MAX} caracteres.`),
  username: z
    .string({ required_error: 'El nombre de usuario es requerido.' })
    .min(LIMITS.USERNAME_MIN, `Mínimo ${LIMITS.USERNAME_MIN} caracter.`)
    .max(LIMITS.USERNAME_MAX, `Máximo ${LIMITS.USERNAME_MAX} caracteres.`)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.'),
  name: z
    .string({ required_error: 'El nombre es requerido.' })
    .min(LIMITS.NAME_MIN, `Mínimo ${LIMITS.NAME_MIN} caracter.`)
    .max(LIMITS.NAME_MAX, `Máximo ${LIMITS.NAME_MAX} caracteres.`),
  password: z
    .string({ required_error: 'La contraseña es requerida.' })
    .min(LIMITS.PASSWORD_MIN, `Mínimo ${LIMITS.PASSWORD_MIN} caracteres.`)
    .max(LIMITS.PASSWORD_MAX, `Máximo ${LIMITS.PASSWORD_MAX} caracteres.`),
  captcha_token: z.string().optional(),
});

export const SigninSchema = z.object({
  username: z.string({ required_error: 'El usuario es requerido.' }).min(1),
  password: z.string({ required_error: 'La contraseña es requerida.' }).min(1),
  captcha_token: z.string().optional(),
  platform: z.string().default('Web'),
});

export const RecoverPasswordSchema = z.object({
  email: z.string().email('Correo electrónico no válido.'),
  captcha_token: z.string().optional(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token inválido o expirado.'),
  new_password: z
    .string()
    .min(LIMITS.PASSWORD_MIN, `Mínimo ${LIMITS.PASSWORD_MIN} caracteres.`)
    .max(LIMITS.PASSWORD_MAX, `Máximo ${LIMITS.PASSWORD_MAX} caracteres.`),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type SigninInput = z.infer<typeof SigninSchema>;
export type RecoverPasswordInput = z.infer<typeof RecoverPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;


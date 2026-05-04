import { z } from 'zod';
import { ROLES } from '../constants.js';

export const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
  .regex(/[0-9]/, 'Debe contener al menos un número');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerClinicSchema = z.object({
  clinicName: z.string().min(2).max(120),
  adminName: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
});
export type RegisterClinicInput = z.infer<typeof registerClinicSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const meSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(ROLES),
});
export type Me = z.infer<typeof meSchema>;

import { z } from 'zod';
import { ROLES } from '../constants';
import { passwordSchema } from './auth';

export const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
  role: z.enum(ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.enum(ROLES).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const pushTokenSchema = z.object({
  expoPushToken: z.string().min(1).nullable(),
});
export type PushTokenInput = z.infer<typeof pushTokenSchema>;

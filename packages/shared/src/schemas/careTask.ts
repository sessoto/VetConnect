import { z } from 'zod';
import { CARE_TASK_TYPES, RECURRENCES } from '../constants';

export const createCareTaskSchema = z
  .object({
    patientId: z.string().min(1),
    type: z.enum(CARE_TASK_TYPES),
    title: z.string().min(1).max(160),
    details: z.string().max(1000).optional().nullable(),
    dosage: z.string().max(160).optional().nullable(),
    scheduledAt: z.coerce.date(),
    recurrence: z.enum(RECURRENCES).default('none'),
    recurrenceN: z.number().int().positive().max(168).optional().nullable(),
    assignedToId: z.string().optional().nullable(),
  })
  .refine(
    (v) =>
      v.recurrence !== 'every_n_hours' ||
      (typeof v.recurrenceN === 'number' && v.recurrenceN > 0),
    { message: 'recurrenceN es requerido cuando recurrence=every_n_hours', path: ['recurrenceN'] },
  );
export type CreateCareTaskInput = z.infer<typeof createCareTaskSchema>;

export const updateCareTaskSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  details: z.string().max(1000).optional().nullable(),
  dosage: z.string().max(160).optional().nullable(),
  scheduledAt: z.coerce.date().optional(),
  assignedToId: z.string().optional().nullable(),
});
export type UpdateCareTaskInput = z.infer<typeof updateCareTaskSchema>;

export const completeCareTaskSchema = z.object({
  completionNotes: z.string().max(1000).optional().nullable(),
});
export type CompleteCareTaskInput = z.infer<typeof completeCareTaskSchema>;

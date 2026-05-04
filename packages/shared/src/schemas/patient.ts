import { z } from 'zod';
import { PATIENT_STATUSES } from '../constants.js';

export const createPatientSchema = z.object({
  name: z.string().min(1).max(120),
  species: z.string().min(1).max(60),
  breed: z.string().max(120).optional().nullable(),
  ownerName: z.string().min(1).max(160),
  ownerContact: z.string().min(1).max(160),
  reasonForVisit: z.string().min(1).max(500),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial().extend({
  status: z.enum(PATIENT_STATUSES).optional(),
});
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

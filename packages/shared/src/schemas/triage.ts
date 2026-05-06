import { z } from 'zod';
import { TRIAGE_LEVELS } from '../constants';

export const createTriageSchema = z.object({
  level: z.enum(TRIAGE_LEVELS),
  reason: z.string().min(1).max(500),
});
export type CreateTriageInput = z.infer<typeof createTriageSchema>;

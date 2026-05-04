import { z } from 'zod';

export const createNoteSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

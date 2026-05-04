import { Router } from 'express';
import { createNoteSchema } from '@vetconnect/shared';
import { prisma } from '../prisma.js';
import { authRequired } from '../middleware/auth.js';
import { writeAudit } from '../middleware/audit.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';

const router: Router = Router();
router.use(authRequired);

router.get(
  '/patients/:patientId/notes',
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId!;
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!patient) throw notFound();
    const notes = await prisma.note.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });
    res.json(notes);
  }),
);

router.post(
  '/patients/:patientId/notes',
  validateBody(createNoteSchema),
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId!;
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!patient) throw notFound();
    const note = await prisma.note.create({
      data: {
        patientId,
        body: req.body.body,
        authorId: req.user!.id,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    await writeAudit(req, {
      action: 'create',
      entity: 'note',
      entityId: note.id,
      payload: { patientId },
    });
    res.status(201).json(note);
  }),
);

export default router;

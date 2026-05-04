import { Router } from 'express';
import { createTriageSchema } from '@vetconnect/shared';
import { prisma } from '../prisma.js';
import { authRequired } from '../middleware/auth.js';
import { writeAudit } from '../middleware/audit.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';

const router: Router = Router({ mergeParams: true });
router.use(authRequired);

router.post(
  '/patients/:patientId/triage',
  validateBody(createTriageSchema),
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId!;
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!patient) throw notFound();
    const entry = await prisma.triageEntry.create({
      data: {
        patientId,
        level: req.body.level,
        reason: req.body.reason,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    await writeAudit(req, {
      action: 'create',
      entity: 'triage',
      entityId: entry.id,
      payload: { patientId, level: entry.level },
    });
    res.status(201).json(entry);
  }),
);

router.get(
  '/patients/:patientId/triage',
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId!;
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!patient) throw notFound();
    const entries = await prisma.triageEntry.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json(entries);
  }),
);

export default router;

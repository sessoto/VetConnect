import { Router } from 'express';
import { createPatientSchema, updatePatientSchema } from '@vetconnect/shared';
import { prisma } from '../prisma.js';
import { authRequired } from '../middleware/auth.js';
import { writeAudit } from '../middleware/audit.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';

const router: Router = Router();
router.use(authRequired);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { triage, status, q } = req.query as Record<string, string | undefined>;
    const triageLevels = triage?.split(',').filter(Boolean) as
      | Array<'red' | 'yellow' | 'green'>
      | undefined;
    const patients = await prisma.patient.findMany({
      where: {
        clinicId: req.user!.clinicId,
        deletedAt: null,
        status: status === 'discharged' ? 'discharged' : 'active',
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { ownerName: { contains: q, mode: 'insensitive' } },
                { reasonForVisit: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        triageEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { admittedAt: 'desc' },
    });

    const enriched = patients.map((p) => ({
      ...p,
      currentTriage: p.triageEntries[0] ?? null,
      triageEntries: undefined,
    }));

    const filtered =
      triageLevels && triageLevels.length > 0
        ? enriched.filter((p) => p.currentTriage && triageLevels.includes(p.currentTriage.level))
        : enriched;

    res.json(filtered);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        clinicId: req.user!.clinicId,
        deletedAt: null,
      },
      include: {
        triageEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!patient) throw notFound();
    res.json({
      ...patient,
      currentTriage: patient.triageEntries[0] ?? null,
    });
  }),
);

router.post(
  '/',
  validateBody(createPatientSchema),
  asyncHandler(async (req, res) => {
    const patient = await prisma.patient.create({
      data: {
        ...req.body,
        clinicId: req.user!.clinicId,
      },
    });
    await writeAudit(req, {
      action: 'create',
      entity: 'patient',
      entityId: patient.id,
      payload: { name: patient.name, reasonForVisit: patient.reasonForVisit },
    });
    res.status(201).json(patient);
  }),
);

router.patch(
  '/:id',
  validateBody(updatePatientSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const target = await prisma.patient.findFirst({
      where: { id, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!target) throw notFound();
    const data: Record<string, unknown> = { ...req.body };
    if (req.body.status === 'discharged' && target.status !== 'discharged') {
      data.dischargedAt = new Date();
    }
    const patient = await prisma.patient.update({ where: { id }, data });
    await writeAudit(req, { action: 'update', entity: 'patient', entityId: id, payload: req.body });
    res.json(patient);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const target = await prisma.patient.findFirst({
      where: { id, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!target) throw notFound();
    await prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await writeAudit(req, { action: 'delete', entity: 'patient', entityId: id });
    res.status(204).end();
  }),
);

export default router;

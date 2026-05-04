import { Router } from 'express';
import {
  createCareTaskSchema,
  updateCareTaskSchema,
  completeCareTaskSchema,
  CARE_TASK_TYPES,
} from '@vetconnect/shared';
import { prisma } from '../prisma.js';
import { authRequired } from '../middleware/auth.js';
import { writeAudit } from '../middleware/audit.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, notFound } from '../lib/errors.js';

const router: Router = Router();
router.use(authRequired);

function nextOccurrence(scheduledAt: Date, recurrence: string, recurrenceN?: number | null): Date | null {
  const ms = scheduledAt.getTime();
  if (recurrence === 'every_n_hours' && recurrenceN && recurrenceN > 0) {
    return new Date(ms + recurrenceN * 60 * 60 * 1000);
  }
  if (recurrence === 'daily') {
    return new Date(ms + 24 * 60 * 60 * 1000);
  }
  return null;
}

router.get(
  '/care-tasks',
  asyncHandler(async (req, res) => {
    const { assignedToMe, status, patientId } = req.query as Record<string, string | undefined>;
    const tasks = await prisma.careTask.findMany({
      where: {
        deletedAt: null,
        patient: { clinicId: req.user!.clinicId, deletedAt: null },
        ...(assignedToMe === '1' ? { assignedToId: req.user!.id } : {}),
        ...(status ? { status: status as 'pending' | 'done' | 'skipped' } : {}),
        ...(patientId ? { patientId } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: { select: { id: true, name: true, species: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      take: 200,
    });
    res.json(tasks);
  }),
);

router.get(
  '/patients/:patientId/care-history',
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId!;
    const type = req.query.type as string | undefined;
    if (type && !CARE_TASK_TYPES.includes(type as (typeof CARE_TASK_TYPES)[number])) {
      throw badRequest('Invalid type');
    }
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user!.clinicId, deletedAt: null },
    });
    if (!patient) throw notFound();
    const history = await prisma.careTask.findMany({
      where: {
        patientId,
        status: 'done',
        ...(type ? { type: type as (typeof CARE_TASK_TYPES)[number] } : {}),
      },
      orderBy: { completedAt: 'desc' },
      include: {
        completedBy: { select: { id: true, name: true } },
      },
    });
    res.json(history);
  }),
);

router.post(
  '/care-tasks',
  validateBody(createCareTaskSchema),
  asyncHandler(async (req, res) => {
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.body.patientId,
        clinicId: req.user!.clinicId,
        deletedAt: null,
      },
    });
    if (!patient) throw notFound('Patient not found');

    if (req.body.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: req.body.assignedToId, clinicId: req.user!.clinicId },
      });
      if (!assignee) throw notFound('Assignee not found');
    }

    const task = await prisma.careTask.create({
      data: {
        patientId: req.body.patientId,
        type: req.body.type,
        title: req.body.title,
        details: req.body.details ?? null,
        dosage: req.body.dosage ?? null,
        scheduledAt: req.body.scheduledAt,
        recurrence: req.body.recurrence,
        recurrenceN: req.body.recurrenceN ?? null,
        assignedToId: req.body.assignedToId ?? null,
        createdById: req.user!.id,
      },
    });
    await writeAudit(req, {
      action: 'create',
      entity: 'care_task',
      entityId: task.id,
      payload: { patientId: task.patientId, type: task.type, scheduledAt: task.scheduledAt },
    });
    res.status(201).json(task);
  }),
);

router.patch(
  '/care-tasks/:id',
  validateBody(updateCareTaskSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const existing = await prisma.careTask.findFirst({
      where: {
        id,
        deletedAt: null,
        patient: { clinicId: req.user!.clinicId, deletedAt: null },
      },
    });
    if (!existing) throw notFound();
    const updated = await prisma.careTask.update({ where: { id }, data: req.body });
    await writeAudit(req, { action: 'update', entity: 'care_task', entityId: id, payload: req.body });
    res.json(updated);
  }),
);

router.post(
  '/care-tasks/:id/complete',
  validateBody(completeCareTaskSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const task = await prisma.careTask.findFirst({
      where: {
        id,
        status: 'pending',
        deletedAt: null,
        patient: { clinicId: req.user!.clinicId, deletedAt: null },
      },
    });
    if (!task) throw notFound('Pending task not found');

    const completed = await prisma.careTask.update({
      where: { id },
      data: {
        status: 'done',
        completedAt: new Date(),
        completedById: req.user!.id,
        completionNotes: req.body.completionNotes ?? null,
      },
    });

    let nextTask = null;
    const next = nextOccurrence(task.scheduledAt, task.recurrence, task.recurrenceN);
    if (next) {
      nextTask = await prisma.careTask.create({
        data: {
          patientId: task.patientId,
          type: task.type,
          title: task.title,
          details: task.details,
          dosage: task.dosage,
          scheduledAt: next,
          recurrence: task.recurrence,
          recurrenceN: task.recurrenceN,
          assignedToId: task.assignedToId,
          createdById: task.createdById,
        },
      });
    }

    await writeAudit(req, {
      action: 'complete',
      entity: 'care_task',
      entityId: id,
      payload: { nextTaskId: nextTask?.id ?? null },
    });

    res.json({ task: completed, nextTask });
  }),
);

router.delete(
  '/care-tasks/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const task = await prisma.careTask.findFirst({
      where: {
        id,
        deletedAt: null,
        patient: { clinicId: req.user!.clinicId, deletedAt: null },
      },
    });
    if (!task) throw notFound();
    await prisma.careTask.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(req, { action: 'delete', entity: 'care_task', entityId: id });
    res.status(204).end();
  }),
);

export default router;

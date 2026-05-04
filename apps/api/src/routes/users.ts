import { Router } from 'express';
import { createUserSchema, updateUserSchema, pushTokenSchema } from '@vetconnect/shared';
import { prisma } from '../prisma.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { writeAudit } from '../middleware/audit.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { hashPassword } from '../lib/hash.js';
import { conflict, notFound } from '../lib/errors.js';

const router: Router = Router();

router.use(authRequired);

router.patch(
  '/me/push-token',
  validateBody(pushTokenSchema),
  asyncHandler(async (req, res) => {
    const { expoPushToken } = req.body;
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { expoPushToken },
    });
    res.status(204).end();
  }),
);

router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { clinicId: req.user!.clinicId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  }),
);

router.post(
  '/',
  requireRole('admin'),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await prisma.user.findFirst({
      where: { clinicId: req.user!.clinicId, email },
    });
    if (existing) throw conflict('Email already used in this clinic');
    const user = await prisma.user.create({
      data: {
        clinicId: req.user!.clinicId,
        email,
        name,
        role,
        passwordHash: await hashPassword(password),
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    await writeAudit(req, { action: 'create', entity: 'user', entityId: user.id, payload: { role } });
    res.status(201).json(user);
  }),
);

router.patch(
  '/:id',
  requireRole('admin'),
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const target = await prisma.user.findFirst({
      where: { id, clinicId: req.user!.clinicId },
    });
    if (!target) throw notFound();
    const updated = await prisma.user.update({
      where: { id },
      data: req.body,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    await writeAudit(req, { action: 'update', entity: 'user', entityId: id, payload: req.body });
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    if (id === req.user!.id) throw conflict('Cannot delete yourself');
    const target = await prisma.user.findFirst({
      where: { id, clinicId: req.user!.clinicId },
    });
    if (!target) throw notFound();
    await prisma.user.delete({ where: { id } });
    await writeAudit(req, { action: 'delete', entity: 'user', entityId: id });
    res.status(204).end();
  }),
);

export default router;

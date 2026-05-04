import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router: Router = Router();
router.use(authRequired, requireRole('admin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { entity, entityId, from, to } = req.query as Record<string, string | undefined>;
    const logs = await prisma.auditLog.findMany({
      where: {
        clinicId: req.user!.clinicId,
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(logs);
  }),
);

export default router;

import type { Request } from 'express';
import { prisma } from '../prisma.js';
import { logger } from '../lib/logger.js';

export interface AuditEvent {
  action: string;
  entity: string;
  entityId: string;
  payload?: unknown;
}

export async function writeAudit(req: Request, event: AuditEvent): Promise<void> {
  if (!req.user) return;
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: req.user.clinicId,
        userId: req.user.id,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        payload: (event.payload as object) ?? undefined,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, event }, 'failed to write audit log');
  }
}

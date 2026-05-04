import cron from 'node-cron';
import { prisma } from '../prisma.js';
import { sendCareTaskPushes } from '../lib/push.js';
import { logger } from '../lib/logger.js';

async function runDueTasksTick(): Promise<void> {
  const now = new Date();
  const due = await prisma.careTask.findMany({
    where: {
      status: 'pending',
      deletedAt: null,
      notifiedAt: null,
      scheduledAt: { lte: now },
    },
    include: {
      patient: { select: { id: true, name: true, clinicId: true } },
      assignedTo: { select: { id: true, expoPushToken: true } },
    },
    take: 100,
  });

  for (const task of due) {
    let recipients: Array<{ id: string; expoPushToken: string | null }> = [];
    if (task.assignedTo) {
      recipients = [task.assignedTo];
    } else {
      recipients = await prisma.user.findMany({
        where: {
          clinicId: task.patient.clinicId,
          role: { in: ['vet', 'assistant'] },
          expoPushToken: { not: null },
        },
        select: { id: true, expoPushToken: true },
      });
    }

    const tokens = recipients
      .map((r) => r.expoPushToken)
      .filter((t): t is string => Boolean(t));

    if (tokens.length > 0) {
      await sendCareTaskPushes(tokens, {
        taskId: task.id,
        patientId: task.patientId,
        patientName: task.patient.name,
        taskType: task.type,
      });
    }

    await prisma.careTask.update({
      where: { id: task.id },
      data: { notifiedAt: new Date() },
    });
  }

  if (due.length > 0) {
    logger.info({ count: due.length }, 'scheduler: notified due tasks');
  }
}

export function startScheduler(): void {
  cron.schedule('* * * * *', () => {
    runDueTasksTick().catch((err) => logger.error({ err }, 'scheduler tick failed'));
  });
  logger.info('scheduler: started (every minute)');
}

import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import patientsRoutes from './routes/patients.js';
import triageRoutes from './routes/triage.js';
import careTasksRoutes from './routes/careTasks.js';
import notesRoutes from './routes/notes.js';
import auditRoutes from './routes/audit.js';
import { errorHandler } from './middleware/error.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp({ logger, redact: { paths: ['req.headers.authorization'], censor: '[REDACTED]' } }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/patients', patientsRoutes);
  app.use(triageRoutes);
  app.use(careTasksRoutes);
  app.use(notesRoutes);
  app.use('/audit', auditRoutes);

  app.use(errorHandler);
  return app;
}

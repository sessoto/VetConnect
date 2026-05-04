import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    let detail: unknown = err.message;
    try {
      detail = JSON.parse(err.message);
    } catch {
      // plain string
    }
    res.status(err.status).json({ error: err.code ?? 'error', detail });
    return;
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'internal_error' });
};

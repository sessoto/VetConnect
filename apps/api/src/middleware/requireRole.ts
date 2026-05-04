import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/errors.js';

export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) return next(forbidden('Insufficient role'));
    next();
  };

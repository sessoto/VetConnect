import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { unauthorized } from '../lib/errors.js';

export const authRequired: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Missing bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, clinicId: payload.clinicId, role: payload.role };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
};

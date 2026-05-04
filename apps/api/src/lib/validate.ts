import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { HttpError } from './errors.js';

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail =
        process.env.NODE_ENV === 'development'
          ? result.error.flatten()
          : { _errors: ['Invalid request'] };
      return next(new HttpError(400, JSON.stringify(detail), 'validation_error'));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const detail =
        process.env.NODE_ENV === 'development'
          ? result.error.flatten()
          : { _errors: ['Invalid query'] };
      return next(new HttpError(400, JSON.stringify(detail), 'validation_error'));
    }
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}

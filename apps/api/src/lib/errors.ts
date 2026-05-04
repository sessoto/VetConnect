export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const notFound = (msg = 'Not found') => new HttpError(404, msg, 'not_found');
export const badRequest = (msg = 'Bad request') => new HttpError(400, msg, 'bad_request');
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg, 'unauthorized');
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg, 'forbidden');
export const conflict = (msg = 'Conflict') => new HttpError(409, msg, 'conflict');

import { Request, Response, NextFunction } from 'express';

/**
 * FIX #5 — asyncHandler: wrapper que captura erros assíncronos e
 * delega para o middleware global errorHandler.
 *
 * Elimina a necessidade de try/catch repetido em cada controller.
 */
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

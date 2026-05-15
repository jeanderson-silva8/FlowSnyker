import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Item 9 — Middleware global de erro.
 *
 * Captura todas as exceções que chegam via next(err) ou throw.
 * - AppError (operacional): retorna statusCode + message.
 * - Erro inesperado: loga completo e retorna 500 genérico.
 *
 * Stack traces NUNCA são expostos ao cliente (Item 33).
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Correlation ID (se disponível via middleware)
  const correlationId = (req as any).correlationId || 'unknown';

  if (err instanceof AppError && err.isOperational) {
    // Erro operacional esperado — loga como warn
    logger.warn(err.message, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      correlationId,
    });

    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // Erro inesperado (bug, crash, etc.) — loga completo como error
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    correlationId,
  });

  res.status(500).json({
    error: 'Erro interno do servidor',
  });
};

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Item 10 — Correlation ID Middleware.
 *
 * Gera um ID único por requisição e o propaga:
 *   - No objeto `req` (para uso interno em logs)
 *   - No header de resposta `X-Correlation-Id` (para rastreamento client-side)
 *
 * Se o cliente enviar um header `X-Correlation-Id`, ele é reutilizado
 * (útil para tracing distribuído entre frontend ↔ backend).
 */
export const correlationIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const incoming = req.headers['x-correlation-id'];
  const id = (typeof incoming === 'string' && incoming.length > 0)
    ? incoming
    : crypto.randomUUID();

  (req as any).correlationId = id;
  _res.setHeader('X-Correlation-Id', id);

  next();
};

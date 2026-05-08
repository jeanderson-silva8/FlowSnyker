import { Request, Response, NextFunction } from 'express';

/**
 * Strips MongoDB operator characters from any string keys in an object.
 * Prevents NoSQL injection via $where, $ne, etc. when payload is parsed as JSON.
 *
 * Express 5 makes req.query a read-only getter, so we only sanitize body and params
 * (the only places attacker-controlled JSON keys can land).
 */
const FORBIDDEN_KEY_RE = /^\$|\./;

const scrub = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrub);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY_RE.test(k)) continue;
    out[k] = scrub(v);
  }
  return out;
};

export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = scrub(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = scrub(req.params) as typeof req.params;
  }
  next();
};

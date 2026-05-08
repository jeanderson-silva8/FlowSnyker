/**
 * Minimal structured logger that scrubs sensitive fields before printing.
 * Prevents tokens / passwords from leaking into stdout (and downstream log aggregators).
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'jwt',
  'secret',
]);

const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 5) return '[depth-limit]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
};

const fmt = (level: string, msg: string, meta?: unknown) => {
  const ts = new Date().toISOString();
  const payload = meta !== undefined ? ` ${JSON.stringify(redact(meta))}` : '';
  return `[${ts}] ${level} ${msg}${payload}`;
};

export const logger = {
  info: (msg: string, meta?: unknown) => console.log(fmt('INFO', msg, meta)),
  warn: (msg: string, meta?: unknown) => console.warn(fmt('WARN', msg, meta)),
  error: (msg: string, meta?: unknown) => console.error(fmt('ERROR', msg, meta)),
};

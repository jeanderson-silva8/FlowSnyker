import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db';
import { wafMiddleware, obfuscateServer, getWafStats } from './middleware/waf';
import { generalLimiter } from './middleware/rateLimiter';
import { sanitizeRequest } from './middleware/sanitize';
import { correlationIdMiddleware } from './middleware/correlationId';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocket } from './sockets';
import authRoutes from './routes/auth.routes';
import boardRoutes from './routes/board.routes';
import cardRoutes from './routes/card.routes';
import { logger } from './utils/logger';
import mongoose from 'mongoose';

dotenv.config();

// ═══════════════════════════════════════════════════════════════════
// 🛡️ ITEM 5 — FAIL-FAST: Validação de variáveis de ambiente no boot
// Aborta o processo IMEDIATAMENTE se faltar alguma variável crítica.
// Elimina todos os `as string` inseguros de process.env.
// ═══════════════════════════════════════════════════════════════════
const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI', 'CLIENT_URL'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error(`FATAL: variável de ambiente obrigatória ausente: ${key}`);
    process.exit(1);
  }
}

// Variáveis validadas — seguro acessar sem `as string`
const JWT_SECRET = process.env.JWT_SECRET!;
const CLIENT_URL = process.env.CLIENT_URL!;

const app = express();
const httpServer = createServer(app);

// Render/Vercel/etc. sit behind a proxy — required for secure cookies & rate-limit IP detection
app.set('trust proxy', 1);

const allowedOrigins = CLIENT_URL
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ═══════════════════════════════════════════════════════════════════
// 🛡️ SECURITY LAYER 1 — WAF (Web Application Firewall)
// Intercepts malicious requests BEFORE they reach any route.
// Covers: Scanner blocking, Path Traversal, XSS, Injection,
// HTTP Method Restriction, Header Anomaly, Auto-Blacklist.
// ═══════════════════════════════════════════════════════════════════
app.use(obfuscateServer);
app.use(wafMiddleware);

// ═══════════════════════════════════════════════════════════════════
// 🛡️ SECURITY LAYER 2 — Helmet (HTTP Security Headers)
// ═══════════════════════════════════════════════════════════════════
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'none'"],
        connectSrc: ["'self'", ...allowedOrigins],
        imgSrc: ["'self'", 'data:'],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  })
);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeRequest);
app.use(generalLimiter);

// ═══════════════════════════════════════════════════════════════════
// 🆔 ITEM 10 — Correlation ID (rastreamento por requisição)
// ═══════════════════════════════════════════════════════════════════
app.use(correlationIdMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/cards', cardRoutes);

// ═══════════════════════════════════════════════════════════════════
// 🏥 ITEM 20 — Health checks: live (simples) + ready (com DB)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/health/live', (_req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  const isReady = dbState === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    service: 'FlowSnyker API',
    timestamp: new Date().toISOString(),
    db: dbStatus,
    waf: getWafStats(),
  });
});

// Legacy health check (retrocompatível)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'operational',
    service: 'FlowSnyker API',
    timestamp: new Date().toISOString(),
    waf: getWafStats(),
  });
});

// ═══════════════════════════════════════════════════════════════════
// 🛡️ ITEM 9 — Middleware global de erro (DEVE ser o último app.use)
// ═══════════════════════════════════════════════════════════════════
app.use(errorHandler);

// Export JWT_SECRET for use in other modules without `as string`
export { JWT_SECRET };

// Initialize Socket.io
initializeSocket(httpServer);

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    logger.info('FlowSnyker API ready', {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
    });
  });
};

startServer();

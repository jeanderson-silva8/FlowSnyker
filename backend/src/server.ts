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
import { initializeSocket } from './sockets';
import authRoutes from './routes/auth.routes';
import boardRoutes from './routes/board.routes';
import cardRoutes from './routes/card.routes';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Render/Vercel/etc. sit behind a proxy — required for secure cookies & rate-limit IP detection
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/cards', cardRoutes);

// Health check (with WAF stats)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'operational',
    service: 'FlowSnyker API',
    timestamp: new Date().toISOString(),
    waf: getWafStats(),
  });
});

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

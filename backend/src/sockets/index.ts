import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { registerBoardEvents } from './boardEvents';
import { registerPresenceEvents } from './presenceEvents';
import { logger } from '../utils/logger';

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware for Socket.io handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      // FIX #2: Allowlist de algoritmos + issuer/audience
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ['HS256'],
        issuer: 'flowsnyker',
        audience: 'flowsnyker-app',
      }) as { userId: string };

      if (!decoded.userId || typeof decoded.userId !== 'string') {
        return next(new Error('Invalid token payload'));
      }

      (socket as any).userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    // FIX #3: Rate limit via middleware oficial — roda ANTES de cada event handler
    const eventTimestamps: number[] = [];
    const RATE_LIMIT = 30; // eventos por segundo
    const WINDOW_MS = 1000;

    socket.use((packet, next) => {
      const now = Date.now();
      // Remover timestamps fora da janela
      while (eventTimestamps.length > 0 && eventTimestamps[0] < now - WINDOW_MS) {
        eventTimestamps.shift();
      }

      if (eventTimestamps.length >= RATE_LIMIT) {
        logger.warn('Socket rate limit exceeded', {
          socketId: socket.id,
          userId: (socket as any).userId,
          event: packet[0],
        });
        return next(new Error('Rate limit exceeded'));
      }

      eventTimestamps.push(now);
      next();
    });

    // Register event handlers
    registerPresenceEvents(io, socket);
    registerBoardEvents(io, socket);

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { socketId: socket.id });
    });
  });

  return io;
};

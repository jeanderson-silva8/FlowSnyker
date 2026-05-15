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
      // JWT_SECRET já validado no boot (fail-fast em server.ts)
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Rate limiting per socket (max 30 events/sec)
  const eventCounts = new Map<string, { count: number; resetTime: number }>();

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    // Simple rate limiting
    const originalOn = socket.on.bind(socket);
    socket.on = ((event: string, ...args: any[]) => {
      if (!['disconnect', 'error'].includes(event)) {
        const wrappedHandler = (...handlerArgs: any[]) => {
          const now = Date.now();
          const key = socket.id;
          const entry = eventCounts.get(key) || { count: 0, resetTime: now + 1000 };

          if (now > entry.resetTime) {
            entry.count = 0;
            entry.resetTime = now + 1000;
          }

          entry.count++;
          eventCounts.set(key, entry);

          if (entry.count > 30) {
            socket.emit('error', { message: 'Rate limit exceeded' });
            return;
          }

          const handler = args[args.length - 1];
          if (typeof handler === 'function') {
            handler(...handlerArgs);
          }
        };
        return originalOn(event, wrappedHandler);
      }
      return originalOn(event as any, ...(args as [any]));
    }) as any;

    // Register event handlers
    registerPresenceEvents(io, socket);
    registerBoardEvents(io, socket);

    socket.on('disconnect', () => {
      eventCounts.delete(socket.id);
      logger.info('Socket disconnected', { socketId: socket.id });
    });
  });

  return io;
};

import { Server as SocketServer, Socket } from 'socket.io';
import { z } from 'zod';
import Board from '../models/Board';
import User from '../models/User';
import { logger } from '../utils/logger';

// ─── Zod Schemas ─────────────────────────────────────────────────
const objectId = z.string().regex(/^[a-f0-9]{24}$/);

// FIX #1: NÃO aceitar `user` do cliente — identidade vem do JWT handshake
const boardJoinSchema = z.object({
  boardId: objectId,
});

const boardLeaveSchema = z.object({
  boardId: objectId,
});

const cursorMoveSchema = z.object({
  boardId: objectId,
  x: z.number(),
  y: z.number(),
});

interface OnlineUser {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
}

// Track online users per board room
const boardRooms = new Map<string, Map<string, OnlineUser>>();

export const registerPresenceEvents = (io: SocketServer, socket: Socket) => {
  // ── FIX #1: Identidade vem EXCLUSIVAMENTE do handshake (JWT) ──
  socket.on('board:join', async (payload: unknown) => {
    const result = boardJoinSchema.safeParse(payload);
    if (!result.success) {
      logger.warn('Socket board:join validation failed', { errors: result.error.flatten().fieldErrors });
      socket.emit('error', { message: 'Dados inválidos para entrar no board' });
      return;
    }

    const { boardId } = result.data;

    // Identidade vem do JWT handshake — NUNCA do payload
    const userId = (socket as any).userId as string | undefined;
    if (!userId) {
      socket.emit('error', { message: 'Autenticação necessária' });
      return;
    }

    // Verificar membership usando userId autenticado
    const board = await Board.findById(boardId).select('members').lean();
    if (!board) {
      socket.emit('error', { message: 'Board não encontrado' });
      return;
    }

    const isMember = board.members.some((m) => m.toString() === userId);
    if (!isMember) {
      logger.warn('Socket board:join denied — not a member', { userId, boardId });
      socket.emit('error', { message: 'Acesso negado a este board' });
      return;
    }

    // Buscar nome e avatar do BANCO, nunca aceitar do cliente
    const userDoc = await User.findById(userId).select('name avatar').lean();
    if (!userDoc) {
      socket.emit('error', { message: 'Usuário não encontrado' });
      return;
    }

    // Membership confirmada, dados do banco — entrar na room
    socket.join(boardId);
    (socket as any).currentBoard = boardId;
    // NÃO sobrescrever socket.userId — já está correto desde o handshake

    if (!boardRooms.has(boardId)) {
      boardRooms.set(boardId, new Map());
    }

    const room = boardRooms.get(boardId)!;
    room.set(userId, {
      socketId: socket.id,
      userId,
      name: userDoc.name,
      avatar: userDoc.avatar || '',
    });

    // Broadcast updated online users to everyone in the room
    const onlineUsers = Array.from(room.values());
    io.to(boardId).emit('presence:update', { users: onlineUsers });

    logger.info('User joined board', { userId, boardId, onlineCount: onlineUsers.length });
  });

  // User leaves a board room
  socket.on('board:leave', (payload: unknown) => {
    const result = boardLeaveSchema.safeParse(payload);
    if (!result.success) return;

    const { boardId } = result.data;
    const userId = (socket as any).userId;

    socket.leave(boardId);

    if (boardRooms.has(boardId) && userId) {
      const room = boardRooms.get(boardId)!;
      room.delete(userId);

      if (room.size === 0) {
        boardRooms.delete(boardId);
      } else {
        const onlineUsers = Array.from(room.values());
        io.to(boardId).emit('presence:update', { users: onlineUsers });
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const boardId = (socket as any).currentBoard;
    const userId = (socket as any).userId;

    if (boardId && boardRooms.has(boardId) && userId) {
      const room = boardRooms.get(boardId)!;
      room.delete(userId);

      if (room.size === 0) {
        boardRooms.delete(boardId);
      } else {
        const onlineUsers = Array.from(room.values());
        io.to(boardId).emit('presence:update', { users: onlineUsers });
      }

      logger.info('User disconnected from board', { userId, boardId });
    }
  });

  // Cursor movement
  socket.on('cursor:move', (payload: unknown) => {
    const result = cursorMoveSchema.safeParse(payload);
    if (!result.success) return;

    const { boardId, x, y } = result.data;
    const userId = (socket as any).userId;
    socket.to(boardId).emit('cursor:updated', { userId, x, y });
  });
};

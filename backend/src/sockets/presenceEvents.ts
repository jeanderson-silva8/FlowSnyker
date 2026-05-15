import { Server as SocketServer, Socket } from 'socket.io';
import { z } from 'zod';
import Board from '../models/Board';
import { logger } from '../utils/logger';

// ─── Zod Schemas (Item 4 — validação de payload nos sockets) ────
const objectId = z.string().regex(/^[a-f0-9]{24}$/);

const boardJoinSchema = z.object({
  boardId: objectId,
  user: z.object({
    _id: objectId,
    name: z.string().min(1),
    avatar: z.string(),
  }),
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
  // ── Item 3: User joins a board room — VALIDAÇÃO DE MEMBERSHIP ──
  socket.on('board:join', async (payload: unknown) => {
    // Validar payload com Zod
    const result = boardJoinSchema.safeParse(payload);
    if (!result.success) {
      logger.warn('Socket board:join validation failed', { errors: result.error.flatten().fieldErrors });
      socket.emit('error', { message: 'Dados inválidos para entrar no board' });
      return;
    }

    const { boardId, user } = result.data;

    // ── VERIFICAÇÃO DE MEMBERSHIP ANTES DE JOIN ──
    const board = await Board.findById(boardId).select('members').lean();
    if (!board) {
      socket.emit('error', { message: 'Board não encontrado' });
      return;
    }

    const isMember = board.members.some((m) => m.toString() === user._id);
    if (!isMember) {
      logger.warn('Socket board:join denied — not a member', { userId: user._id, boardId });
      socket.emit('error', { message: 'Acesso negado a este board' });
      return;
    }

    // ── Membership confirmada — entrar na room ──
    socket.join(boardId);
    (socket as any).currentBoard = boardId;
    (socket as any).userId = user._id;

    if (!boardRooms.has(boardId)) {
      boardRooms.set(boardId, new Map());
    }

    const room = boardRooms.get(boardId)!;
    room.set(user._id, {
      socketId: socket.id,
      userId: user._id,
      name: user.name,
      avatar: user.avatar,
    });

    // Broadcast updated online users to everyone in the room
    const onlineUsers = Array.from(room.values());
    io.to(boardId).emit('presence:update', { users: onlineUsers });

    logger.info('User joined board', { userId: user._id, boardId, onlineCount: onlineUsers.length });
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

  // Cursor movement (Phase 2 prep, but we can register the event now)
  socket.on('cursor:move', (payload: unknown) => {
    const result = cursorMoveSchema.safeParse(payload);
    if (!result.success) return;

    const { boardId, x, y } = result.data;
    const userId = (socket as any).userId;
    socket.to(boardId).emit('cursor:updated', { userId, x, y });
  });
};

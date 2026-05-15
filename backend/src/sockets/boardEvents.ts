import { Server as SocketServer, Socket } from 'socket.io';
import { z } from 'zod';
import Card from '../models/Card';
import Board from '../models/Board';
import { logger } from '../utils/logger';

// ─── Zod Schemas para validação de payload (Item 4) ─────────────
const objectId = z.string().regex(/^[a-f0-9]{24}$/);

const cardCreateSchema = z.object({
  boardId: objectId,
  columnId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  labels: z.array(z.object({ text: z.string().max(50), color: z.string().max(20) })).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

const cardMoveSchema = z.object({
  boardId: objectId,
  cardId: objectId,
  fromColumnId: z.string().min(1),
  toColumnId: z.string().min(1),
  newOrder: z.number().int().min(0),
});

const cardUpdateSchema = z.object({
  boardId: objectId,
  cardId: objectId,
  updates: z.record(z.unknown()),
});

const cardDeleteSchema = z.object({
  boardId: objectId,
  cardId: objectId,
  columnId: z.string().min(1),
});

const columnCreateSchema = z.object({
  boardId: objectId,
  column: z.object({
    _id: z.string().min(1),
    title: z.string().min(1).max(100),
    order: z.number().int().min(0),
  }),
});

const columnRenameSchema = z.object({
  boardId: objectId,
  columnId: z.string().min(1),
  title: z.string().min(1).max(100),
});

const columnDeleteSchema = z.object({
  boardId: objectId,
  columnId: z.string().min(1),
});

// ─── Helper: Validar payload com Zod (Item 4) ───────────────────
function validatePayload<T>(schema: z.ZodSchema<T>, payload: unknown, socket: Socket, event: string): T | null {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    logger.warn('Socket payload validation failed', { event, errors });
    socket.emit('error', { message: `Dados inválidos no evento ${event}`, details: errors });
    return null;
  }
  return result.data;
}

// ─── Helper: Verificar membership no board (Item 2) ─────────────
async function assertCanAccessBoard(socket: Socket, boardId: string): Promise<boolean> {
  const userId = (socket as any).userId;
  if (!userId) {
    socket.emit('error', { message: 'Autenticação necessária' });
    return false;
  }

  const board = await Board.findById(boardId).select('members').lean();
  if (!board) {
    socket.emit('error', { message: 'Board não encontrado' });
    return false;
  }

  const isMember = board.members.some((m) => m.toString() === userId);
  if (!isMember) {
    logger.warn('Socket board access denied', { userId, boardId });
    socket.emit('error', { message: 'Acesso negado a este board' });
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════
export const registerBoardEvents = (io: SocketServer, socket: Socket) => {
  // Card created
  socket.on('card:create', async (payload: unknown) => {
    try {
      const data = validatePayload(cardCreateSchema, payload, socket, 'card:create');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, columnId, title, description, labels, priority } = data;

      const maxOrder = await Card.findOne({ boardId, columnId })
        .sort({ order: -1 })
        .select('order');

      const card = await Card.create({
        boardId,
        columnId,
        title,
        description: description || '',
        labels: labels || [],
        priority: priority || 'medium',
        order: maxOrder ? maxOrder.order + 1 : 0,
      });

      const populated = await Card.findById(card._id).populate('assignees', 'name email avatar');
      socket.to(boardId).emit('card:created', { card: populated, columnId });
      socket.emit('card:created:ack', { card: populated, columnId });
    } catch (error) {
      logger.error('Socket card:create failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao criar card' });
    }
  });

  // Card moved (drag & drop)
  socket.on('card:move', async (payload: unknown) => {
    try {
      const data = validatePayload(cardMoveSchema, payload, socket, 'card:move');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, cardId, fromColumnId, toColumnId, newOrder } = data;

      await Card.findByIdAndUpdate(cardId, {
        columnId: toColumnId,
        order: newOrder,
      });

      socket.to(boardId).emit('card:moved', {
        cardId,
        fromColumnId,
        toColumnId,
        newOrder,
        movedBy: (socket as any).userId,
      });
    } catch (error) {
      logger.error('Socket card:move failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao mover card' });
    }
  });

  // Card updated
  socket.on('card:update', async (payload: unknown) => {
    try {
      const data = validatePayload(cardUpdateSchema, payload, socket, 'card:update');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, cardId, updates } = data;

      const card = await Card.findByIdAndUpdate(cardId, updates, { new: true })
        .populate('assignees', 'name email avatar');

      socket.to(boardId).emit('card:updated', { cardId, card });
    } catch (error) {
      logger.error('Socket card:update failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao atualizar card' });
    }
  });

  // Card deleted
  socket.on('card:delete', async (payload: unknown) => {
    try {
      const data = validatePayload(cardDeleteSchema, payload, socket, 'card:delete');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, cardId, columnId } = data;

      await Card.findByIdAndDelete(cardId);

      socket.to(boardId).emit('card:deleted', { cardId, columnId });
    } catch (error) {
      logger.error('Socket card:delete failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao deletar card' });
    }
  });

  // Column created
  socket.on('column:create', async (payload: unknown) => {
    try {
      const data = validatePayload(columnCreateSchema, payload, socket, 'column:create');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, column } = data;

      await Board.findByIdAndUpdate(boardId, {
        $push: { columns: column },
      });

      socket.to(boardId).emit('column:created', { column });
    } catch (error) {
      logger.error('Socket column:create failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao criar coluna' });
    }
  });

  // Column renamed
  socket.on('column:rename', async (payload: unknown) => {
    try {
      const data = validatePayload(columnRenameSchema, payload, socket, 'column:rename');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, columnId, title } = data;

      await Board.findOneAndUpdate(
        { _id: boardId, 'columns._id': columnId },
        { $set: { 'columns.$.title': title } }
      );

      socket.to(boardId).emit('column:renamed', { columnId, title });
    } catch (error) {
      logger.error('Socket column:rename failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao renomear coluna' });
    }
  });

  // Column deleted
  socket.on('column:delete', async (payload: unknown) => {
    try {
      const data = validatePayload(columnDeleteSchema, payload, socket, 'column:delete');
      if (!data) return;

      if (!(await assertCanAccessBoard(socket, data.boardId))) return;

      const { boardId, columnId } = data;

      await Board.findByIdAndUpdate(boardId, {
        $pull: { columns: { _id: columnId } },
      });

      await Card.deleteMany({ boardId, columnId });

      socket.to(boardId).emit('column:deleted', { columnId });
    } catch (error) {
      logger.error('Socket column:delete failed', { error: (error as Error).message });
      socket.emit('error', { message: 'Erro ao deletar coluna' });
    }
  });
};

import { Server as SocketServer, Socket } from 'socket.io';
import Card from '../models/Card';
import Board from '../models/Board';

interface CardMovePayload {
  boardId: string;
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  newOrder: number;
}

interface CardCreatePayload {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: { text: string; color: string }[];
  priority?: string;
}

interface CardUpdatePayload {
  boardId: string;
  cardId: string;
  updates: Record<string, any>;
}

interface CardDeletePayload {
  boardId: string;
  cardId: string;
  columnId: string;
}

interface ColumnCreatePayload {
  boardId: string;
  column: { _id: string; title: string; order: number };
}

interface ColumnRenamePayload {
  boardId: string;
  columnId: string;
  title: string;
}

interface ColumnDeletePayload {
  boardId: string;
  columnId: string;
}

export const registerBoardEvents = (io: SocketServer, socket: Socket) => {
  // Card created
  socket.on('card:create', async (payload: CardCreatePayload) => {
    try {
      const { boardId, columnId, title, description, labels, priority } = payload;

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
      socket.emit('error', { message: 'Erro ao criar card' });
    }
  });

  // Card moved (drag & drop)
  socket.on('card:move', async (payload: CardMovePayload) => {
    try {
      const { boardId, cardId, fromColumnId, toColumnId, newOrder } = payload;

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
      socket.emit('error', { message: 'Erro ao mover card' });
    }
  });

  // Card updated
  socket.on('card:update', async (payload: CardUpdatePayload) => {
    try {
      const { boardId, cardId, updates } = payload;

      const card = await Card.findByIdAndUpdate(cardId, updates, { new: true })
        .populate('assignees', 'name email avatar');

      socket.to(boardId).emit('card:updated', { cardId, card });
    } catch (error) {
      socket.emit('error', { message: 'Erro ao atualizar card' });
    }
  });

  // Card deleted
  socket.on('card:delete', async (payload: CardDeletePayload) => {
    try {
      const { boardId, cardId, columnId } = payload;

      await Card.findByIdAndDelete(cardId);

      socket.to(boardId).emit('card:deleted', { cardId, columnId });
    } catch (error) {
      socket.emit('error', { message: 'Erro ao deletar card' });
    }
  });

  // Column created
  socket.on('column:create', async (payload: ColumnCreatePayload) => {
    try {
      const { boardId, column } = payload;

      await Board.findByIdAndUpdate(boardId, {
        $push: { columns: column },
      });

      socket.to(boardId).emit('column:created', { column });
    } catch (error) {
      socket.emit('error', { message: 'Erro ao criar coluna' });
    }
  });

  // Column renamed
  socket.on('column:rename', async (payload: ColumnRenamePayload) => {
    try {
      const { boardId, columnId, title } = payload;

      await Board.findOneAndUpdate(
        { _id: boardId, 'columns._id': columnId },
        { $set: { 'columns.$.title': title } }
      );

      socket.to(boardId).emit('column:renamed', { columnId, title });
    } catch (error) {
      socket.emit('error', { message: 'Erro ao renomear coluna' });
    }
  });

  // Column deleted
  socket.on('column:delete', async (payload: ColumnDeletePayload) => {
    try {
      const { boardId, columnId } = payload;

      await Board.findByIdAndUpdate(boardId, {
        $pull: { columns: { _id: columnId } },
      });

      await Card.deleteMany({ boardId, columnId });

      socket.to(boardId).emit('column:deleted', { columnId });
    } catch (error) {
      socket.emit('error', { message: 'Erro ao deletar coluna' });
    }
  });
};

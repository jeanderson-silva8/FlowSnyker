import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { useBoardStore } from '../store/useBoardStore';
import { usePresenceStore } from '../store/usePresenceStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Card } from '../types';

export const useSocket = (boardId: string | undefined) => {
  const { addCard, updateCard, removeCard, moveCard, addColumn, renameColumn, removeColumn, clearColumn } = useBoardStore();
  const { setOnlineUsers } = usePresenceStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!boardId || !user) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('board:join', {
      boardId,
      user: { _id: user._id, name: user.name, avatar: user.avatar },
    });

    socket.on('card:created', ({ card }: { card: Card; columnId: string }) => { addCard(card); });
    socket.on('card:moved', ({ cardId, toColumnId, newOrder }: { cardId: string; toColumnId: string; newOrder: number }) => { moveCard(cardId, toColumnId, newOrder); });
    socket.on('card:updated', ({ card }: { card: Card }) => { if (card) updateCard(card._id, card); });
    socket.on('card:deleted', ({ cardId }: { cardId: string }) => { removeCard(cardId); });
    socket.on('column:created', ({ column }: { column: { _id: string; title: string; order: number } }) => { addColumn(column); });
    socket.on('column:renamed', ({ columnId, title }: { columnId: string; title: string }) => { renameColumn(columnId, title); });
    socket.on('column:deleted', ({ columnId }: { columnId: string }) => { removeColumn(columnId); });
    socket.on('column:cleared', ({ columnId }: { columnId: string }) => { clearColumn(columnId); });
    socket.on('presence:update', ({ users }: { users: any[] }) => { setOnlineUsers(users); });

    return () => {
      socket.emit('board:leave', { boardId });
      socket.off('card:created');
      socket.off('card:moved');
      socket.off('card:updated');
      socket.off('card:deleted');
      socket.off('column:created');
      socket.off('column:renamed');
      socket.off('column:deleted');
      socket.off('column:cleared');
      socket.off('presence:update');
    };
  }, [boardId, user]);
};

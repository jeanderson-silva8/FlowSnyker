import { Server as SocketServer, Socket } from 'socket.io';

interface OnlineUser {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
}

// Track online users per board room
const boardRooms = new Map<string, Map<string, OnlineUser>>();

export const registerPresenceEvents = (io: SocketServer, socket: Socket) => {
  // User joins a board room
  socket.on('board:join', (payload: { boardId: string; user: { _id: string; name: string; avatar: string } }) => {
    const { boardId, user } = payload;
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

    console.log(`👤 ${user.name} joined board ${boardId} (${onlineUsers.length} online)`);
  });

  // User leaves a board room
  socket.on('board:leave', (payload: { boardId: string }) => {
    const { boardId } = payload;
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

      console.log(`👤 User ${userId} disconnected from board ${boardId}`);
    }
  });

  // Cursor movement (Phase 2 prep, but we can register the event now)
  socket.on('cursor:move', (payload: { boardId: string; x: number; y: number }) => {
    const { boardId, x, y } = payload;
    const userId = (socket as any).userId;
    socket.to(boardId).emit('cursor:updated', { userId, x, y });
  });
};

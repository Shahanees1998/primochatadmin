import { Server as SocketIOServer } from 'socket.io';

// Extend global to include io
declare global {
  var io: SocketIOServer | undefined;
}

export const getIO = (): SocketIOServer => {
  if (typeof global !== 'undefined' && global.io) {
    return global.io;
  }
  throw new Error('Socket.io not initialized!');
};

// For use in other parts of the application
export const io: SocketIOServer | undefined = typeof global !== 'undefined' ? global.io : undefined; 
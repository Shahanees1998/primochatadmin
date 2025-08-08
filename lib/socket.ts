import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export const getIO = () => {
  if (typeof global !== 'undefined' && global.io) {
    return global.io;
  }
  throw new Error('Socket.io not initialized!');
};

// For use in other parts of the application
export const io = typeof global !== 'undefined' ? global.io : null; 
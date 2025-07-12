require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: 'prisma/.env' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
    },
  });

  // Store connected users
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room
    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
      connectedUsers.set(socket.id, userId);
      console.log(`User ${userId} joined their room`);
    });

    // Join chat room
    socket.on('join-chat', (chatRoomId) => {
      socket.join(`chat-${chatRoomId}`);
      console.log(`User joined chat room: ${chatRoomId}`);
    });

    // Leave chat room
    socket.on('leave-chat', (chatRoomId) => {
      socket.leave(`chat-${chatRoomId}`);
      console.log(`User left chat room: ${chatRoomId}`);
    });

    // Handle new message
    socket.on('send-message', async (data) => {
      const { chatRoomId, message } = data;
      
      // Broadcast to all users in the chat room
      socket.to(`chat-${chatRoomId}`).emit('new-message', {
        chatRoomId,
        message,
      });

      // Also emit to sender for confirmation
      socket.emit('message-sent', {
        chatRoomId,
        message,
      });
    });

    // Handle typing indicator
    socket.on('typing-start', (data) => {
      const { chatRoomId, userId } = data;
      socket.to(`chat-${chatRoomId}`).emit('user-typing', {
        chatRoomId,
        userId,
        isTyping: true,
      });
    });

    socket.on('typing-stop', (data) => {
      const { chatRoomId, userId } = data;
      socket.to(`chat-${chatRoomId}`).emit('user-typing', {
        chatRoomId,
        userId,
        isTyping: false,
      });
    });

    // Handle message read
    socket.on('mark-read', (data) => {
      const { chatRoomId, messageId, userId } = data;
      socket.to(`chat-${chatRoomId}`).emit('message-read', {
        chatRoomId,
        messageId,
        userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        connectedUsers.delete(socket.id);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 
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

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join user to their personal room
    socket.on('join-user', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    // Leave user room
    socket.on('leave-user', (userId) => {
      socket.leave(userId);
      console.log(`User ${userId} left their room`);
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

    // Handle test events
    socket.on('test-event', (data) => {
      console.log('Test event received:', data);
      // Echo back the test event
      socket.emit('test-event', { message: 'Test event received by server', originalData: data });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Make io available globally
  global.io = io;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 
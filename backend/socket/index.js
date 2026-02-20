const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// Initialize Socket.io
const initializeSocket = (app) => {
  const server = http.createServer(app);
  const clientUrl = process.env.CLIENT_URL;
  const allowedOrigins = [
    clientUrl,
    'http://localhost:3000',
    'http://localhost:3002'
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Middleware for socket authentication using cookies
  io.use((socket, next) => {
    const token = socket.handshake?.headers?.cookie
      ?.split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')?.[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error('Server authentication is not configured'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        return next(new Error('Invalid authentication token'));
      }

      socket.user = decoded;
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const userId = socket.user.id.toString();
    console.log(`User connected: ${userId}`);

    // User joins their personal room
    socket.join(userId);

    // Task update event
    socket.on('task:update', (data) => {
      // Broadcast to all connected clients of this user
      io.to(userId).emit('task:updated', data);
    });

    // Analysis confirmation event
    socket.on('analysis:confirm', (data) => {
      io.to(userId).emit('analysis:confirmed', data);
    });

    // Real-time typing indicator
    socket.on('task:editing', (data) => {
      io.to(userId).emit('task:being_edited', data);
    });

    // Presence event
    socket.on('presence:online', () => {
      io.to(userId).emit('user:online', { userId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      io.to(userId).emit('user:offline', { userId });
    });
  });

  return server;
};

// Emit task update to user
const emitTaskUpdate = (userId, data) => {
  if (io) {
    io.to(userId.toString()).emit('task:updated', data);
  }
};

// Emit analysis update to user
const emitAnalysisUpdate = (userId, data) => {
  if (io) {
    io.to(userId.toString()).emit('analysis:updated', data);
  }
};

module.exports = {
  initializeSocket,
  emitTaskUpdate,
  emitAnalysisUpdate
};

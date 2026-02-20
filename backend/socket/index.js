const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const auth = require('../middleware/auth');

let io = null;

// Initialize Socket.io
const initializeSocket = (app) => {
  const server = http.createServer(app);
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3002'
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST']
    }
  });

  // Middleware for socket authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    // Token verification would happen here
    socket.userId = socket.handshake.auth.userId;
    next();
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // User joins their personal room
    socket.join(`user:${socket.userId}`);

    // Task update event
    socket.on('task:update', (data) => {
      // Broadcast to all connected clients of this user
      io.to(`user:${socket.userId}`).emit('task:updated', data);
    });

    // Analysis confirmation event
    socket.on('analysis:confirm', (data) => {
      io.to(`user:${socket.userId}`).emit('analysis:confirmed', data);
    });

    // Real-time typing indicator
    socket.on('task:editing', (data) => {
      io.to(`user:${socket.userId}`).emit('task:being_edited', data);
    });

    // Presence event
    socket.on('presence:online', () => {
      io.to(`user:${socket.userId}`).emit('user:online', { userId: socket.userId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      io.to(`user:${socket.userId}`).emit('user:offline', { userId: socket.userId });
    });
  });

  return server;
};

// Emit task update to user
const emitTaskUpdate = (userId, data) => {
  if (io) {
    io.to(`user:${userId}`).emit('task:updated', data);
  }
};

// Emit analysis update to user
const emitAnalysisUpdate = (userId, data) => {
  if (io) {
    io.to(`user:${userId}`).emit('analysis:updated', data);
  }
};

module.exports = {
  initializeSocket,
  emitTaskUpdate,
  emitAnalysisUpdate
};

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { initializeSocket } = require('./socket');
const { securityMiddleware, apiLimiter } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analyses');
const taskRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL;
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3002'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(securityMiddleware);
app.use(apiLimiter);
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

// Start server with Socket.io
const startServer = async () => {
  await connectDB();
  const server = initializeSocket(app);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready on port ${PORT}`);
  });
};

startServer();

const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const config = require('./src/config/env');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const knowledgeBaseRoutes = require('./src/routes/knowledgeBaseRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

// Import socket handler
const ChatSocketHandler = require('./src/socket');

const app = express();
const server = http.createServer(app);

// ── Trust proxy (needed when behind Nginx / Render / Railway / etc.) ──
// Without this, express-rate-limit sees all requests from the proxy's IP.
app.set('trust proxy', 1);

// ── CORS origins ──
// Dashboard origins (strict list) — from CORS_ORIGIN env var
const dashboardOrigins = config.CORS_ORIGIN
  ? config.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

// Widget routes are open to ALL origins (for embedding on external sites)
const widgetCors = cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'OPTIONS'] });

// Dashboard/API cors — strict
const dashboardCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin) return callback(null, true);
    if (dashboardOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// ── Socket.IO setup ──
const io = socketIo(server, {
  cors: {
    // Widget connects from any origin; dashboard agents from known origins
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: false
  }
});

// Initialize socket handler
const chatSocketHandler = new ChatSocketHandler(io);
app.set('io', io);

// ── Rate Limiters ──
// Strict for auth and admin endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

// Permissive for widget endpoints (customers send messages frequently)
const widgetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,                  // 60 req/min per IP for widget
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this client.' }
});

// ── Core Middleware ──
app.use(helmet({
  // Required for script embedding on external sites
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
// Widget routes: open CORS + permissive rate limit (customers from external sites)
app.use('/api/customer', widgetCors, widgetLimiter, customerRoutes);
app.use('/api/chat', widgetCors, widgetLimiter, chatRoutes);

// Dashboard-only routes: strict CORS + strict rate limit
app.use('/api/auth', dashboardCors, strictLimiter, authRoutes);
app.use('/api/company', dashboardCors, strictLimiter, companyRoutes);
app.use('/api/kb', dashboardCors, strictLimiter, knowledgeBaseRoutes);
app.use('/api/notifications', dashboardCors, strictLimiter, notificationRoutes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// ── Serve frontend in production ──
if (config.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── Error handling middleware ──
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── 404 handler ──
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Unhandled promise rejections ──
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
  process.exit(1);
});

// ── Graceful shutdown ──
const shutdown = (signal) => {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 10s if shutdown hangs
  setTimeout(() => {
    console.error('[Server] Forced exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Start ──
const startServer = async () => {
  try {
    await connectDB();
    server.listen(config.PORT, () => {
      console.log(`[Server] Running on port ${config.PORT} (${config.NODE_ENV})`);
      console.log(`[Server] Socket.IO initialized`);
      console.log(`[Server] Dashboard CORS origins: ${dashboardOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();

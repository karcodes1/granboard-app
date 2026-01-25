import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initializeFirebase } from './auth/FirebaseAuth.js';
import { WebSocketServer } from './websocket/WebSocketServer.js';
import { agoraTokenService } from './services/AgoraTokenService.js';

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Initialize Firebase Admin
initializeFirebase();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// REST endpoint for Agora token (alternative to WebSocket)
app.post('/api/agora/token', (req, res) => {
  try {
    const { channelName, uid, role } = req.body;

    if (!channelName) {
      res.status(400).json({ error: 'Channel name is required' });
      return;
    }

    if (!agoraTokenService.isConfigured()) {
      res.status(503).json({ error: 'Video chat not configured' });
      return;
    }

    const tokenResponse = agoraTokenService.generateToken(
      channelName,
      uid || 0,
      role || 'publisher'
    );

    res.json(tokenResponse);
  } catch (error: unknown) {
    console.error('[API] Agora token error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate token';
    res.status(500).json({ error: message });
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
new WebSocketServer(httpServer, CORS_ORIGIN.split(','));

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🎯 Dart Game Server Started                    ║
╠══════════════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${PORT}                       ║
║  WebSocket: ws://localhost:${PORT}                         ║
║  CORS:      ${CORS_ORIGIN.substring(0, 40).padEnd(40)}  ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
});

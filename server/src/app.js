import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import transactionsRoutes from './routes/transactionsRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import friendsRoutes from './routes/friendsRoutes.js';
import splitsRoutes from './routes/splitsRoutes.js';
import groupsRoutes from './routes/groupsRoutes.js';
import migrationRoutes from './routes/migrationRoutes.js';

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare, load balancers)
app.set('trust proxy', 1);

app.use(helmet());

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// Security & CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Render health checks)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');

      if (config.nodeEnv === 'production') {
        const isAllowed = config.allowedOrigins.some((allowed) => {
          if (allowed === '*' || allowed === normalizedOrigin) return true;
          // Support wildcard domains e.g. *.vercel.app
          if (allowed.startsWith('*.') || allowed.startsWith('https://*.')) {
            const domainSuffix = allowed.replace(/^https?:\/\/\*\./, '');
            return normalizedOrigin.endsWith(`.${domainSuffix}`);
          }
          return false;
        });

        if (isAllowed) {
          return callback(null, true);
        }

        return callback(null, false);
      }

      // In development/staging mode: allow configured origins, localhost, 127.0.0.1, and vercel preview domains
      if (
        config.allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.startsWith('http://localhost:') ||
        normalizedOrigin.startsWith('http://127.0.0.1:') ||
        normalizedOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);


app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);

// System Health & Telemetry
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'SpendWise API Core',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/splits', splitsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/migration', migrationRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;

import express from 'express';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP handled by frontend
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// Ensure upload directory exists at startup and serve from canonical config.storage.uploadDir
fs.mkdirSync(config.storage.uploadDir, { recursive: true });
app.use('/uploads', express.static(config.storage.uploadDir));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;

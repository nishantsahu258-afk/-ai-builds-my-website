import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Centralized Express error handler.
 * Must be registered as the last middleware: app.use(errorHandler)
 */
const errorHandler = (err, req, res, next) => {
  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // ── Mongoose ValidationError ─────────────────────────────────────────────
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // ── Mongoose CastError (invalid ObjectId) ────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  }

  // ── Mongoose duplicate key ───────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // ── JWT errors ───────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // ── Generic / unhandled errors ───────────────────────────────────────────
  const statusCode = err.statusCode || err.status || 500;
  logger.error(`[${req.method}] ${req.path} → ${statusCode}: ${err.message}`);

  const isDev = config.nodeEnv !== 'production';

  return res.status(statusCode).json({
    success: false,
    message: isDev ? err.message : 'An unexpected error occurred',
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
};

export default errorHandler;

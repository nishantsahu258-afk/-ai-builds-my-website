/**
 * Lightweight structured console logger.
 * Outputs: [LEVEL] <ISO timestamp> - <message>
 *
 * Usage:
 *   import { logger } from '../utils/logger.js';
 *   logger.info('Server started on port 5000');
 *   logger.error('DB connection failed', err);
 */

const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const extra = args.length ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ') : '';
  return `[${level}] ${timestamp} - ${message}${extra}`;
};

export const logger = {
  info: (message, ...args) => {
    console.log(formatMessage('INFO', message, ...args));
  },
  warn: (message, ...args) => {
    console.warn(formatMessage('WARN', message, ...args));
  },
  error: (message, ...args) => {
    console.error(formatMessage('ERROR', message, ...args));
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('DEBUG', message, ...args));
    }
  },
};

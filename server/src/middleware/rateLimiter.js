import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter: 300 requests per 15 minutes.
 * This covers all /api/* routes including read-only project/website/fact fetches.
 * Raised from 100 to prevent false 429s for normal SPA page navigations that
 * issue 5–15 parallel API calls per screen.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in 15 minutes.',
    code: 'APP_RATE_LIMITED',
  },
});

/**
 * AI route limiter: 20 requests per 15 minutes.
 * Applied only to routes that invoke Gemini (generation, research).
 * Keeps AI usage bounded independently of normal browsing traffic.
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI generation rate limit reached. Please wait before generating again.',
    code: 'AI_RATE_LIMITED',
  },
});

/**
 * Auth endpoint limiter: 10 requests per 15 minutes.
 * Protects /register and /login from brute-force.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

/**
 * File upload limiter: 20 requests per hour.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload limit reached, please try again later.',
  },
});

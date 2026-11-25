import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __configDir = path.dirname(fileURLToPath(import.meta.url));
const serverRootDir = path.resolve(__configDir, '../..');
const rawUploadDir = process.env.UPLOAD_DIR || 'uploads';
const resolvedUploadDir = path.isAbsolute(rawUploadDir)
  ? rawUploadDir
  : path.resolve(serverRootDir, rawUploadDir);

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// Safe development defaults for immediate local preview ONLY
const defaultJwtSecret = 'dev-jwt-secret-key-at-least-32-characters-long';
const defaultMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-builds-my-website';

if (isProd) {
  const missing = [];
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultJwtSecret || process.env.JWT_SECRET.length < 32) {
    missing.push('JWT_SECRET (must be at least 32 characters)');
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy-dev-key') {
    missing.push('GEMINI_API_KEY');
  }
  if ((process.env.WEB_SEARCH_PROVIDER || 'gemini') === 'tavily' && !process.env.TAVILY_API_KEY) {
    missing.push('TAVILY_API_KEY (required when WEB_SEARCH_PROVIDER=tavily)');
  }
  if (!process.env.CLIENT_URL) missing.push('CLIENT_URL');
  if (!process.env.PUBLIC_BASE_URL) missing.push('PUBLIC_BASE_URL');

  if (missing.length > 0) {
    throw new Error(`[Config] FATAL: Missing or invalid required production environment variables: ${missing.join(', ')}`);
  }
} else {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Config] NOTICE: GEMINI_API_KEY is not set in server/.env. Add your API key to test live Gemini generation.');
  }
  if (!process.env.MONGODB_URI) {
    console.warn('[Config] NOTICE: MONGODB_URI is not set in server/.env. Defaulting to local mongodb://127.0.0.1:27017/ai-builds-my-website.');
  }
}

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',

  mongodb: {
    uri: isProd ? process.env.MONGODB_URI : defaultMongoUri,
  },

  jwt: {
    secret: isProd ? process.env.JWT_SECRET : (process.env.JWT_SECRET || defaultJwtSecret),
    expiresIn: '7d',
  },

  cookie: {
    secure: isProd ? process.env.COOKIE_SECURE !== 'false' : process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || (isProd ? 'none' : 'lax'),
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'dummy-dev-key',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    visionModel: process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  search: {
    provider: process.env.WEB_SEARCH_PROVIDER || 'gemini',
    tavilyApiKey: process.env.TAVILY_API_KEY,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    uploadDir: resolvedUploadDir,
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
  },
};

import 'dotenv/config';

// Safe development defaults for immediate local preview
const defaultJwtSecret = 'dev-jwt-secret-key-at-least-32-characters-long';
const defaultMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-builds-my-website';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Config] NOTICE: GEMINI_API_KEY is not set in server/.env. Add your API key to test live Gemini generation.');
}
if (!process.env.MONGODB_URI) {
  console.warn('[Config] NOTICE: MONGODB_URI is not set in server/.env. Defaulting to local mongodb://127.0.0.1:27017/ai-builds-my-website.');
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',

  mongodb: {
    uri: defaultMongoUri,
  },

  jwt: {
    secret: process.env.JWT_SECRET || defaultJwtSecret,
    expiresIn: '7d',
  },

  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
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
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
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

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Allowed MIME types → extension mappings
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// ---------------------------------------------------------------------------
// Disk storage: uploads/<projectId>/<uuid><ext>
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // projectId comes from the route param (:id) set before this middleware runs
    const projectId = req.params.id || 'unknown';
    const uploadDir = path.join(config.storage.uploadDir, projectId);

    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      logger.error(`[Upload] Failed to create upload directory: ${uploadDir}`, err);
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// ---------------------------------------------------------------------------
// File filter — only permit whitelisted MIME types
// ---------------------------------------------------------------------------
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error(`File type '${file.mimetype}' is not allowed`), {
        status: 415,
        code: 'UNSUPPORTED_MEDIA_TYPE',
      }),
      false,
    );
  }
};

// ---------------------------------------------------------------------------
// Multer instance
// ---------------------------------------------------------------------------
const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
    files: 10, // guard against abuse on the array variant
  },
});

export default multerUpload;

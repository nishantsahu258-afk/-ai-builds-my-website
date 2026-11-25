/**
 * Storage adapter.
 *
 * Supports two providers controlled by config.storage.provider:
 *   'local'     – saves files to the local filesystem under uploads/
 *   'cloudinary' – uploads to Cloudinary via upload_stream
 *
 * Export:
 *   getStorageService() → provider adapter object
 *
 * Local adapter interface:
 *   saveFile(buffer, filename, dir?)  → { key, url }
 *   getFilePath(key)                  → absolute path string
 *   deleteFile(key)                   → void
 *
 * Cloudinary adapter interface:
 *   uploadBuffer(buffer, options?)    → Cloudinary upload result
 *   deleteFile(publicId)              → Cloudinary destroy result
 */

import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Local Storage Adapter
// ---------------------------------------------------------------------------

function buildLocalAdapter() {
  const baseDir = path.resolve(config.storage.uploadDir || 'uploads');

  return {
    /**
     * Save a buffer to disk.
     *
     * @param {Buffer} buffer
     * @param {string} filename   e.g. 'logo.png'
     * @param {string} [dir]      Sub-directory inside uploads/, e.g. 'images'
     * @returns {Promise<{ key: string, url: string }>}
     */
    async saveFile(buffer, filename, dir = '') {
      const targetDir = dir ? path.join(baseDir, dir) : baseDir;
      await fs.mkdir(targetDir, { recursive: true });

      const filePath = path.join(targetDir, filename);
      await fs.writeFile(filePath, buffer);

      // key is the relative path from baseDir so it can be resolved later
      const key = dir ? `${dir}/${filename}` : filename;
      const url = `${config.publicBaseUrl}/uploads/${key}`;

      logger.debug(`[Storage:local] Saved file: ${filePath}`);
      return { key, url };
    },

    /**
     * Resolve a storage key to an absolute filesystem path.
     *
     * @param {string} key
     * @returns {string}
     */
    getFilePath(key) {
      if (!key || typeof key !== 'string') {
        throw new Error('Invalid storage key');
      }
      if (path.isAbsolute(key)) {
        const resolvedAbs = path.resolve(key);
        if (!resolvedAbs.startsWith(baseDir + path.sep) && resolvedAbs !== baseDir) {
          throw new Error('Invalid storage key: path traversal detected');
        }
        return resolvedAbs;
      }
      // Normalize Windows/POSIX separators and strip at most one leading 'uploads/'
      const normalized = key.replace(/\\/g, '/').replace(/^uploads\//, '');
      const resolved = path.resolve(baseDir, normalized);
      if (!resolved.startsWith(baseDir + path.sep)) {
        throw new Error('Invalid storage key: path traversal detected');
      }
      return resolved;
    },

    /**
     * Delete a file by its storage key.
     *
     * @param {string} key
     * @returns {Promise<void>}
     */
    async deleteFile(key) {
      const filePath = path.join(baseDir, key);
      try {
        await fs.unlink(filePath);
        logger.debug(`[Storage:local] Deleted file: ${filePath}`);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw new Error(`Failed to delete file '${key}': ${err.message}`);
        }
        // File already gone — treat as success
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Cloudinary Storage Adapter
// ---------------------------------------------------------------------------

function buildCloudinaryAdapter() {
  let cloudinary;

  async function initCloudinary() {
    if (cloudinary) return cloudinary;

    let cldModule;
    try {
      cldModule = await import('cloudinary');
    } catch {
      throw new Error(
        'cloudinary package is not installed. Run: npm install cloudinary'
      );
    }

    cloudinary = cldModule.v2;
    cloudinary.config({
      cloud_name: config.storage.cloudinary.cloudName,
      api_key: config.storage.cloudinary.apiKey,
      api_secret: config.storage.cloudinary.apiSecret,
    });

    return cloudinary;
  }

  return {
    /**
     * Upload a Buffer to Cloudinary.
     *
     * @param {Buffer} buffer
     * @param {object} [options]  Cloudinary upload options (folder, public_id, resource_type …)
     * @returns {Promise<object>}  Cloudinary upload result
     */
    async uploadBuffer(buffer, options = {}) {
      const cld = await initCloudinary();

      return new Promise((resolve, reject) => {
        const uploadOpts = {
          resource_type: 'auto',
          ...options,
        };

        const stream = cld.uploader.upload_stream(uploadOpts, (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else {
            logger.debug(`[Storage:cloudinary] Uploaded: ${result.public_id}`);
            resolve(result);
          }
        });

        stream.end(buffer);
      });
    },

    /**
     * Delete a Cloudinary asset by public ID.
     *
     * @param {string} publicId
     * @param {object} [options]
     * @returns {Promise<object>}
     */
    async deleteFile(publicId, options = {}) {
      const cld = await initCloudinary();
      const result = await cld.uploader.destroy(publicId, {
        resource_type: 'image',
        ...options,
      });
      logger.debug(`[Storage:cloudinary] Deleted: ${publicId}`);
      return result;
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _adapter = null;

/**
 * Returns the configured storage adapter (singleton).
 *
 * @returns {object}  Local or Cloudinary adapter
 */
export function getStorageService() {
  if (_adapter) return _adapter;

  const provider = (config.storage.provider ?? 'local').toLowerCase();

  if (provider === 'cloudinary') {
    logger.info('[Storage] Using Cloudinary provider');
    _adapter = buildCloudinaryAdapter();
  } else {
    logger.info('[Storage] Using local filesystem provider');
    _adapter = buildLocalAdapter();
  }

  return _adapter;
}

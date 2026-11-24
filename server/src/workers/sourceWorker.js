import fs from 'fs/promises';
import { Worker } from 'bullmq';
import pdfParse from 'pdf-parse';
import { Source } from '../models/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { fetchAndExtract } from '../integrations/scraper/scraper.service.js';
import { analyzeImage } from '../integrations/gemini/gemini.client.js';
import { extractFactsFromText, normalizeAndStoreFacts } from '../utils/factExtractor.js';
import { getStorageService } from '../integrations/storage/storage.service.js';

const connection = { url: config.redis.url };

/**
 * Process a single Source record.
 */
export async function processSourceRecord(sourceId) {
  const source = await Source.findById(sourceId);
  if (!source) throw new Error(`Source not found: ${sourceId}`);

  source.extractionStatus = 'processing';
  await source.save();

  try {
    let extractedText = '';

    if (source.type === 'pdf') {
      const storage = getStorageService();
      const filePath = storage.getFilePath(source.storageKey);
      const dataBuffer = await fs.readFile(filePath);

      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text || '';
    } else if (source.type === 'image') {
      const storage = getStorageService();
      const filePath = storage.getFilePath(source.storageKey);
      const dataBuffer = await fs.readFile(filePath);
      const base64Image = dataBuffer.toString('base64');

      const imagePrompt = `Extract and describe all clearly visible business information in this photo, such as business name, signboard text, products, price tags, menu items, phone numbers, or address.
Do NOT invent, assume, or fabricate any details not clearly legible in the image.`;

      try {
        extractedText = await analyzeImage(base64Image, source.mimeType || 'image/jpeg', imagePrompt);
      } catch (imgErr) {
        logger.warn('[sourceWorker] Gemini Vision analysis failed:', imgErr.message);
        extractedText = `Image uploaded: ${source.originalFileName}`;
      }
    } else if (['website', 'social', 'google_listing'].includes(source.type)) {
      if (!source.url) throw new Error('No URL associated with this source');

      const scrapeRes = await fetchAndExtract(source.url);

      if (!scrapeRes.success) {
        if (source.type === 'social') {
          source.extractionStatus = 'failed';
          source.errorMessage = 'Unable to access this social media source automatically. Please provide the information manually.';
          await source.save();
          return;
        }
        throw new Error(scrapeRes.error || 'Failed to retrieve website content');
      }

      extractedText = scrapeRes.text || scrapeRes.description || '';
    }

    source.extractedText = extractedText;

    // Extract facts using Gemini + regex fallback
    const facts = await extractFactsFromText(extractedText, source._id, source.url);

    // Normalize and store into Fact collection (detecting conflicts)
    await normalizeAndStoreFacts(source.projectId, facts, source._id, source.url);

    source.extractionStatus = 'completed';
    await source.save();

    logger.info(`[sourceWorker] Successfully processed source ${source._id} (${source.type})`);
  } catch (err) {
    logger.error(`[sourceWorker] Failed to process source ${source._id}:`, err.message);
    source.extractionStatus = 'failed';
    source.errorMessage = err.message;
    await source.save();
  }
}

export const sourceWorker = new Worker(
  'source-processing',
  async (job) => {
    logger.info(`[sourceWorker] Picked up job ${job.id} of type ${job.name}`);
    const { sourceId } = job.data;
    await processSourceRecord(sourceId);
  },
  { connection }
);

sourceWorker.on('failed', (job, err) => {
  logger.error(`[sourceWorker] Job ${job?.id} failed:`, err.message);
});

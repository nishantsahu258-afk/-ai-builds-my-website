import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import { Source, Project } from '../models/index.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { fetchAndExtract } from '../integrations/scraper/scraper.service.js';
import { analyzeImage } from '../integrations/gemini/gemini.client.js';
import { extractFactsFromText, normalizeAndStoreFacts } from '../utils/factExtractor.js';
import { assessSourceRelevance } from '../utils/sourceRelevance.js';
import { getStorageService } from '../integrations/storage/storage.service.js';

/**
 * Process a single Source record.
 * Handles PDF text parsing, image analysis with Gemini Vision, and website/social scraping.
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
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Uploaded PDF file not found at ${filePath}. Please re-upload the file.`);
      }
      const dataBuffer = await fs.readFile(filePath);

      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text || '';
    } else if (source.type === 'image') {
      const storage = getStorageService();
      const filePath = storage.getFilePath(source.storageKey);
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`Uploaded image file not found at ${filePath}. Please re-upload the file.`);
      }
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
          source.relevance = 'failed';
          source.relevanceReason = 'Unable to access this social media source automatically.';
          source.errorMessage = 'Unable to access this social media source automatically. Please provide the information manually.';
          await source.save();
          return;
        }
        throw new Error(scrapeRes.error || 'Failed to retrieve website content');
      }

      extractedText = scrapeRes.text || scrapeRes.description || '';
    }

    source.extractedText = extractedText;

    // Assess source relevance against target business before importing any facts
    const project = await Project.findById(source.projectId).populate('businessId').lean();
    const business = project?.businessId || { name: project?.title || '' };
    const relevanceResult = assessSourceRelevance({ business, source, extractedText });
    source.relevance = relevanceResult.relevance;
    source.relevanceReason = relevanceResult.reason;

    if (source.relevance === 'relevant') {
      // Extract facts using Gemini + regex fallback
      const facts = await extractFactsFromText(extractedText, source._id, source.url);

      // Normalize and store into Fact collection (detecting conflicts)
      await normalizeAndStoreFacts(source.projectId, facts, source._id, source.url);
    } else {
      logger.warn(
        `[sourceWorker] Source ${source._id} flagged as '${source.relevance}' (${source.relevanceReason}); skipping fact import.`
      );
    }

    source.extractionStatus = 'completed';
    await source.save();

    logger.info(`[sourceWorker] Successfully processed source ${source._id} (${source.type}, relevance=${source.relevance})`);
  } catch (err) {
    logger.error(`[sourceWorker] Failed to process source ${source._id}:`, err.message);
    source.extractionStatus = 'failed';
    source.relevance = 'failed';
    source.relevanceReason = err.message;
    source.errorMessage = err.message;
    await source.save();
  }
}

// BullMQ Worker only initialized if USE_REDIS is true
if (process.env.USE_REDIS === 'true') {
  import('bullmq').then(({ Worker }) => {
    const connection = { url: config.redis.url };
    const sourceWorker = new Worker(
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
  }).catch(() => {});
}

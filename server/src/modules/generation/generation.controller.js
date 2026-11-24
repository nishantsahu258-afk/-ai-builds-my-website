import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { Project, Business, Fact, Website, GenerationJob } from '../../models/index.js';
import { generationQueue, addJob } from '../../queue/queue.js';
import { generateJSON } from '../../integrations/gemini/gemini.client.js';
import { buildWebsiteGenerationPrompt } from '../../utils/promptBuilder.js';
import { validateWebsiteJSON } from '../../utils/websiteValidator.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/**
 * Execute website generation logic.
 * Called either by the BullMQ worker or directly if Redis is unavailable.
 */
export async function executeWebsiteGeneration(projectId, jobId = null) {
  const job = jobId ? await GenerationJob.findById(jobId) : null;

  try {
    if (job) {
      job.status = 'processing';
      job.startedAt = new Date();
      job.progress = 20;
      await job.save();
    }

    const project = await Project.findById(projectId).populate('businessId');
    if (!project) throw new Error('Project not found');

    // 1. Gather all confirmed facts
    const confirmedFacts = await Fact.find({ projectId, status: 'confirmed' }).lean();

    // Build confirmed business context
    const businessContext = {
      businessName: project.businessId?.name || project.title,
      category: project.businessId?.category || null,
      city: project.businessId?.city || null,
      state: project.businessId?.state || null,
      country: project.businessId?.country || 'India',
      address: project.businessId?.address || null,
      description: project.businessId?.description || null,
    };

    for (const f of confirmedFacts) {
      businessContext[f.key] = f.selectedValue;
    }

    if (job) {
      job.progress = 50;
      await job.save();
    }

    // 2. Call Gemini
    const { prompt, systemInstruction } = buildWebsiteGenerationPrompt(businessContext);
    let rawWebsiteJson;
    try {
      rawWebsiteJson = await generateJSON(prompt, systemInstruction);
    } catch (aiErr) {
      logger.error('[Generation] Gemini API call failed:', aiErr.message);
      throw new Error(`AI generation error: ${aiErr.message}`);
    }

    if (job) {
      job.progress = 80;
      await job.save();
    }

    // 3. Validate structured JSON
    const validated = validateWebsiteJSON(rawWebsiteJson);

    // 4. Create or update Website document
    let website = await Website.findOne({ projectId });
    if (!website) {
      const cleanSlug = slugify(businessContext.businessName || 'website', { lower: true, strict: true });
      const uniqueSlug = `${cleanSlug}-${uuidv4().slice(0, 6)}`;

      website = await Website.create({
        projectId,
        ownerId: project.ownerId,
        slug: uniqueSlug,
        theme: validated.website.theme,
        sections: validated.website.sections,
        status: 'draft',
        lastGeneratedAt: new Date(),
      });
    } else {
      website.theme = validated.website.theme;
      website.sections = validated.website.sections;
      website.lastGeneratedAt = new Date();
      await website.save();
    }

    // Link website to project
    project.currentWebsiteId = website._id;
    project.status = 'generated';
    await project.save();

    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = { websiteId: website._id, slug: website.slug };
      await job.save();
    }

    logger.info(`[Generation] Website generated successfully for project ${projectId}`);
    return { website, job };
  } catch (err) {
    logger.error(`[Generation] Job failed for project ${projectId}:`, err.message);
    if (job) {
      job.status = 'failed';
      job.error = err.message;
      job.completedAt = new Date();
      await job.save();
    }
    throw err;
  }
}

/**
 * POST /projects/:id/generate
 */
export async function generateWebsite(req, res, next) {
  try {
    const projectId = req.project._id;

    // Check if there are any unresolved conflicts
    const conflictCount = await Fact.countDocuments({ projectId, status: 'conflict' });
    if (conflictCount > 0) {
      return error(
        res,
        `Cannot generate website: There are ${conflictCount} unresolved conflicting facts. Please resolve them on the verification screen before generating.`,
        400
      );
    }

    // Create a GenerationJob document
    const jobDoc = await GenerationJob.create({
      projectId,
      type: 'generate-website',
      status: 'queued',
      progress: 0,
    });

    // Try queuing to BullMQ, with direct background fallback if Redis is unavailable
    let bullJobId = null;
    try {
      bullJobId = await addJob(generationQueue, 'generate-website', {
        projectId: projectId.toString(),
        jobId: jobDoc._id.toString(),
      });
      jobDoc.bullJobId = bullJobId;
      await jobDoc.save();
    } catch (qErr) {
      logger.warn('[generateWebsite] Redis queue unavailable; running generation in-process:', qErr.message);
      // Run asynchronously without blocking response
      setImmediate(() => {
        executeWebsiteGeneration(projectId, jobDoc._id).catch((e) =>
          logger.error('[generateWebsite] Direct execution failed:', e.message)
        );
      });
    }

    return success(
      res,
      {
        jobId: jobDoc._id,
        message: 'Website generation started',
      },
      'Generation initiated',
      202
    );
  } catch (err) {
    next(err);
  }
}

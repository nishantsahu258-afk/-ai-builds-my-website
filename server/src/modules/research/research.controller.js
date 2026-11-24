import { Project, Business, Source, Fact, GenerationJob } from '../../models/index.js';
import { researchQueue, addJob } from '../../queue/queue.js';
import { search } from '../../integrations/search/search.service.js';
import { fetchAndExtract } from '../../integrations/scraper/scraper.service.js';
import { extractFactsFromText, normalizeAndStoreFacts } from '../../utils/factExtractor.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/**
 * Executes research logic in background or worker.
 */
export async function executeBusinessResearch(projectId, jobId = null) {
  const job = jobId ? await GenerationJob.findById(jobId) : null;

  try {
    if (job) {
      job.status = 'processing';
      job.startedAt = new Date();
      job.progress = 10;
      await job.save();
    }

    const project = await Project.findById(projectId).populate('businessId');
    if (!project) throw new Error('Project not found');

    const business = project.businessId;
    const businessName = business?.name || project.title;
    const city = business?.city || '';
    const category = business?.category || '';

    const query = `${businessName} ${city} ${category}`.trim();
    logger.info(`[Research] Searching web for: "${query}"`);

    if (job) {
      job.progress = 30;
      await job.save();
    }

    // 1. Perform search (Tavily or Gemini grounding)
    const searchRes = await search(query);

    if (job) {
      job.progress = 60;
      await job.save();
    }

    const results = searchRes?.results || [];
    logger.info(`[Research] Found ${results.length} search results`);

    // 2. Process top search results
    for (const resItem of results.slice(0, 3)) {
      if (!resItem.url) continue;

      try {
        // Record as a source
        const sourceDoc = await Source.create({
          projectId,
          type: 'website',
          url: resItem.url,
          extractionStatus: 'processing',
          sourceMetadata: { title: resItem.title, snippet: resItem.snippet },
        });

        // Scrape web page
        const scraped = await fetchAndExtract(resItem.url);

        if (scraped.success && scraped.text) {
          sourceDoc.extractedText = scraped.text;
          sourceDoc.extractionStatus = 'completed';
          await sourceDoc.save();

          // Extract facts
          const extractedFacts = await extractFactsFromText(scraped.text, sourceDoc._id, resItem.url);

          // Add contact info discovered directly by scraper
          for (const phone of scraped.phones || []) {
            extractedFacts.push({
              key: 'phone',
              value: phone,
              evidenceExcerpt: `Phone found on website: ${phone}`,
              extractionMethod: 'scraped_contact',
              sourceId: sourceDoc._id,
              sourceURL: resItem.url,
            });
          }

          for (const email of scraped.emails || []) {
            extractedFacts.push({
              key: 'email',
              value: email,
              evidenceExcerpt: `Email found on website: ${email}`,
              extractionMethod: 'scraped_contact',
              sourceId: sourceDoc._id,
              sourceURL: resItem.url,
            });
          }

          await normalizeAndStoreFacts(projectId, extractedFacts, sourceDoc._id, resItem.url);
        } else {
          sourceDoc.extractionStatus = 'failed';
          sourceDoc.errorMessage = scraped.error || 'Could not access web page';
          await sourceDoc.save();
        }
      } catch (itemErr) {
        logger.warn(`[Research] Error processing search result ${resItem.url}:`, itemErr.message);
      }
    }

    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = { resultsCount: results.length };
      await job.save();
    }

    logger.info(`[Research] Completed research for project ${projectId}`);
    return { success: true };
  } catch (err) {
    logger.error(`[Research] Research failed for project ${projectId}:`, err.message);
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
 * POST /projects/:id/research
 */
export async function startResearch(req, res, next) {
  try {
    const projectId = req.project._id;

    const jobDoc = await GenerationJob.create({
      projectId,
      type: 'research-business',
      status: 'queued',
      progress: 0,
    });

    const jobId = await addJob(researchQueue, 'research-business', {
      projectId: projectId.toString(),
      jobId: jobDoc._id.toString(),
    });

    jobDoc.bullJobId = jobId;
    await jobDoc.save();

    return success(res, { jobId: jobDoc._id }, 'Research initiated successfully', 202);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects/:id/research-status
 */
export async function getResearchStatus(req, res, next) {
  try {
    const projectId = req.project._id;

    const latestJob = await GenerationJob.findOne({
      projectId,
      type: 'research-business',
    }).sort({ createdAt: -1 });

    const sources = await Source.find({ projectId }).lean();
    const facts = await Fact.find({ projectId }).lean();

    const pendingSources = sources.filter((s) => s.extractionStatus === 'pending' || s.extractionStatus === 'processing').length;
    const completedSources = sources.filter((s) => s.extractionStatus === 'completed').length;
    const failedSources = sources.filter((s) => s.extractionStatus === 'failed').length;

    return success(
      res,
      {
        job: latestJob,
        sourcesSummary: {
          total: sources.length,
          pending: pendingSources,
          completed: completedSources,
          failed: failedSources,
        },
        factsCount: facts.length,
      },
      'Research status retrieved'
    );
  } catch (err) {
    next(err);
  }
}

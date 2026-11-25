import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { Project, Business, Fact, Website, GenerationJob, Source } from '../../models/index.js';
import { generationQueue, addJob } from '../../queue/queue.js';
import { generateJSON } from '../../integrations/gemini/gemini.client.js';
import { buildWebsiteGenerationPrompt } from '../../utils/promptBuilder.js';
import { validateWebsiteJSON, sanitizeManualOnlyWebsite } from '../../utils/websiteValidator.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/**
 * Build a strict manual-only business context from confirmed Fact documents.
 * Accepts ONLY candidates where extractionMethod === 'manual' and value is non-empty.
 * If selectedValue was overwritten by an external source, uses the manual candidate value
 * (or excludes if no matching manual candidate exists). Never falls back to Business doc.
 */
export function buildManualOnlyContext(allConfirmedFacts = [], fallbackTitle = 'Business') {
  const confirmedFacts = allConfirmedFacts
    .filter((f) => f.status === 'confirmed')
    .map((f) => {
      const manualCandidates = (f.candidates || []).filter(
        (c) => c.extractionMethod === 'manual' && c.value !== null && c.value !== undefined && String(c.value).trim() !== ''
      );
      if (manualCandidates.length === 0) return null;
      return { ...f, selectedValue: manualCandidates[0].value };
    })
    .filter(Boolean);

  const businessContext = {
    businessName: null,
    category: null,
    city: null,
    state: null,
    country: null,
    address: null,
    description: null,
  };

  for (const f of confirmedFacts) {
    businessContext[f.key] = f.selectedValue;
  }

  if (!businessContext.businessName) {
    businessContext.businessName = fallbackTitle;
  }

  const approvedFactsSnapshot = confirmedFacts.map((f) => ({
    key: f.key,
    value: f.selectedValue,
    extractionMethod: 'manual',
  }));

  return { confirmedFacts, businessContext, approvedFactsSnapshot };
}

/**
 * Deterministic, conservative website builder for Manual-only mode.
 * Never invents promotional claims, services, or contact details.
 * Missing fields remain as neutral editable placeholders.
 */
export function buildDeterministicManualWebsite(businessContext = {}) {
  const name = businessContext.businessName || 'Business';
  const category = businessContext.category || '';
  const location = [businessContext.city, businessContext.state, businessContext.country]
    .filter(Boolean)
    .join(', ');

  const subheadline = [category, location ? `in ${location}` : ''].filter(Boolean).join(' ') || '[Add your business tagline]';
  const description = businessContext.description || '[Add your business description]';
  const servicesList = Array.isArray(businessContext.services)
    ? businessContext.services
    : businessContext.services
    ? [String(businessContext.services)]
    : ['[Add your services or offerings]'];

  const contactContent = {
    title: 'Contact',
  };
  if (businessContext.address) contactContent.address = businessContext.address;
  if (businessContext.phone) contactContent.phone = businessContext.phone;
  if (businessContext.email) contactContent.email = businessContext.email;
  if (businessContext.openingHours) contactContent.openingHours = businessContext.openingHours;
  if (!businessContext.address && !businessContext.phone && !businessContext.email) {
    contactContent.note = '[Add your contact details]';
  }

  return {
    website: {
      theme: {
        primaryColor: '#1E293B',
        secondaryColor: '#64748B',
        fontFamily: 'Inter',
        stylePreset: 'modern',
      },
      sections: [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          order: 1,
          content: {
            headline: name,
            subheadline,
            primaryCtaLabel: 'Contact Us',
          },
        },
        {
          id: 'about',
          type: 'about',
          enabled: true,
          order: 2,
          content: {
            title: 'About',
            description,
          },
        },
        {
          id: 'services',
          type: 'services',
          enabled: true,
          order: 3,
          content: {
            title: 'Services',
            items: servicesList,
          },
        },
        {
          id: 'contact',
          type: 'contact',
          enabled: true,
          order: 4,
          content: contactContent,
        },
        {
          id: 'footer',
          type: 'footer',
          enabled: true,
          order: 5,
          content: {
            text: name,
          },
        },
      ],
    },
  };
}

/**
 * Execute website generation logic. Called by the in-process queue runner.
 */
export async function executeWebsiteGeneration(projectId, jobId = null, options = {}) {
  const { manualOnly = false } = options;
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

    // 1. Gather all confirmed facts, then filter candidates for manualOnly mode
    const allConfirmedFacts = await Fact.find({ projectId, status: 'confirmed' }).lean();

    let confirmedFacts;
    let businessContext;
    let approvedFactsSnapshot;

    if (manualOnly) {
      const manualResult = buildManualOnlyContext(allConfirmedFacts, project.title);
      confirmedFacts = manualResult.confirmedFacts;
      businessContext = manualResult.businessContext;
      approvedFactsSnapshot = manualResult.approvedFactsSnapshot;
    } else {
      confirmedFacts = allConfirmedFacts;
      businessContext = {
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
      approvedFactsSnapshot = confirmedFacts.map((f) => ({
        key: f.key,
        value: f.selectedValue,
        extractionMethod: f.candidates?.[0]?.extractionMethod || 'unknown',
      }));
    }

    if (job) {
      job.progress = 50;
      await job.save();
    }

    // 2. Generate structured website JSON:
    //    - manualOnly: deterministic conservative builder (no Gemini copy invention)
    //    - normal: Gemini with confirmed facts
    let rawWebsiteJson;
    if (manualOnly) {
      rawWebsiteJson = buildDeterministicManualWebsite(businessContext);
    } else {
      const { prompt, systemInstruction } = buildWebsiteGenerationPrompt(businessContext, { manualOnly });
      rawWebsiteJson = await generateJSON(prompt, systemInstruction);
    }

    if (job) {
      job.progress = 80;
      await job.save();
    }

    // 3. Validate structured JSON (and sanitize promotional claims in manualOnly mode)
    let validated = validateWebsiteJSON(rawWebsiteJson);
    if (manualOnly) {
      validated = sanitizeManualOnlyWebsite(validated, businessContext);
    }

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
        manualOnly: Boolean(manualOnly),
        approvedFactsSnapshot,
        lastGeneratedAt: new Date(),
      });
    } else {
      website.theme = validated.website.theme;
      website.sections = validated.website.sections;
      website.manualOnly = Boolean(manualOnly);
      website.approvedFactsSnapshot = approvedFactsSnapshot;
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
    const manualOnly = Boolean(req.body?.manualOnly);

    // Check for unresolved fact conflicts (scoped to manual facts if manualOnly)
    const manualOrClause = [
      { extractionMethod: 'manual' },
      { 'candidates.extractionMethod': 'manual' },
    ];

    const conflictFilter = { projectId, status: 'conflict' };
    if (manualOnly) {
      conflictFilter.$or = manualOrClause;
    }
    const conflictCount = await Fact.countDocuments(conflictFilter);
    if (conflictCount > 0) {
      return error(
        res,
        `Cannot generate website: There are ${conflictCount} unresolved conflicting facts. Please resolve them on the verification screen before generating.`,
        400
      );
    }

    // When not in manualOnly mode, block if any extracted facts remain unverified
    if (!manualOnly) {
      const unverifiedCount = await Fact.countDocuments({ projectId, status: 'unverified' });
      if (unverifiedCount > 0) {
        return error(
          res,
          `Cannot generate website: There are ${unverifiedCount} unverified facts. Please confirm or reject them on the verification screen before generating.`,
          400
        );
      }
    }

    // Ensure at least one confirmed fact (manual only if manualOnly)
    const confirmedFilter = { projectId, status: 'confirmed' };
    if (manualOnly) {
      confirmedFilter.$or = manualOrClause;
    }
    const confirmedCount = await Fact.countDocuments(confirmedFilter);
    if (confirmedCount === 0) {
      return error(
        res,
        manualOnly
          ? 'Cannot generate website: No confirmed manual facts available. Please add business details before generating.'
          : 'Cannot generate website: No confirmed facts available. Please add business details or extracted facts before generating.',
        400
      );
    }

    // Source blocking logic: only applies when not in manualOnly mode
    if (!manualOnly) {
      const blockingSources = await Source.find({
        projectId,
        excluded: false,
        $or: [
          { relevance: { $ne: 'relevant' } },
          { extractionStatus: { $in: ['pending', 'processing', 'failed'] } },
        ],
      });
      if (blockingSources.length > 0) {
        return error(
          res,
          'Cannot generate website: Some sources are not ready or relevant. Resolve or exclude them before generating.',
          400
        );
      }
    }

    // Create a GenerationJob document
    const jobDoc = await GenerationJob.create({
      projectId,
      type: 'generate-website',
      status: 'queued',
      progress: 0,
    });

    // Queue job via unified addJob (handles in-process queue automatically)
    const dispatchJob = typeof req._addJob === 'function' ? req._addJob : addJob;
    const jobId = await dispatchJob(generationQueue, 'generate-website', {
      projectId: projectId.toString(),
      jobId: jobDoc._id.toString(),
      manualOnly,
    });
    jobDoc.bullJobId = jobId;
    await jobDoc.save();

    return success(
      res,
      { jobId: jobDoc._id, message: 'Website generation started' },
      'Generation initiated',
      202
    );
  } catch (err) {
    next(err);
  }
}

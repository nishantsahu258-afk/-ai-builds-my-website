import { Website, Project, Fact, GenerationJob } from '../../models/index.js';
import { generateJSON } from '../../integrations/gemini/gemini.client.js';
import { buildSectionRegenerationPrompt } from '../../utils/promptBuilder.js';
import { validateSectionJSON } from '../../utils/websiteValidator.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

/**
 * GET /websites/:id
 */
export async function getWebsite(req, res, next) {
  try {
    const website = req.website;
    return success(res, { website }, 'Website retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /websites/:id
 * Updates theme properties
 */
export async function updateWebsiteTheme(req, res, next) {
  try {
    const website = req.website;
    const { theme } = req.body;

    if (theme) {
      website.theme = {
        ...website.theme,
        ...theme,
      };
      await website.save();
    }

    return success(res, { website }, 'Website theme updated');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /websites/:id/sections/:sectionId
 * Edit specific section content or state
 */
export async function updateSection(req, res, next) {
  try {
    const website = req.website;
    const { sectionId } = req.params;
    const { content, enabled, order } = req.body;

    const section = website.sections.find((s) => s.id === sectionId);
    if (!section) {
      return error(res, `Section '${sectionId}' not found`, 404);
    }

    if (content !== undefined) {
      section.content = {
        ...section.content,
        ...content,
      };
    }

    if (enabled !== undefined) {
      section.enabled = Boolean(enabled);
    }

    if (order !== undefined) {
      section.order = Number(order);
    }

    await website.save();
    logger.info(`[Websites] Updated section ${sectionId} on website ${website._id}`);

    return success(res, { website, section }, 'Section updated successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /websites/:id/sections/:sectionId/regenerate
 * Regenerates ONLY the selected section with Gemini using confirmed facts.
 * Preserves all other sections untouched.
 */
export async function regenerateSection(req, res, next) {
  try {
    const website = req.website;
    const { sectionId } = req.params;
    const { instructions } = req.body;

    const sectionIndex = website.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) {
      return error(res, `Section '${sectionId}' not found on website`, 404);
    }

    const currentSection = website.sections[sectionIndex];

    // Gather confirmed facts
    const confirmedFacts = await Fact.find({
      projectId: website.projectId,
      status: 'confirmed',
    }).lean();

    const project = await Project.findById(website.projectId).populate('businessId');
    const businessContext = {
      businessName: project?.businessId?.name || project?.title,
      category: project?.businessId?.category || null,
      city: project?.businessId?.city || null,
      state: project?.businessId?.state || null,
      country: project?.businessId?.country || 'India',
      address: project?.businessId?.address || null,
      description: project?.businessId?.description || null,
    };

    for (const f of confirmedFacts) {
      businessContext[f.key] = f.selectedValue;
    }

    // Build section-specific prompt
    const { prompt, systemInstruction } = buildSectionRegenerationPrompt(
      currentSection,
      businessContext,
      instructions
    );

    const rawRegenerated = await generateJSON(prompt, systemInstruction);
    const validatedSection = validateSectionJSON(rawRegenerated);

    // Update only the target section
    website.sections[sectionIndex].content = validatedSection.content;
    if (validatedSection.factRefs) {
      website.sections[sectionIndex].factRefs = validatedSection.factRefs;
    }
    website.markModified('sections');
    await website.save();

    logger.info(`[Websites] Successfully regenerated section ${sectionId} for website ${website._id}`);

    return success(
      res,
      {
        website,
        regeneratedSection: website.sections[sectionIndex],
      },
      'Section regenerated successfully'
    );
  } catch (err) {
    logger.error('[Websites] Section regeneration failed:', err.message);
    next(err);
  }
}

/**
 * PATCH /websites/:id/sections/:sectionId/toggle
 */
export async function toggleSectionVisibility(req, res, next) {
  try {
    const website = req.website;
    const { sectionId } = req.params;

    const section = website.sections.find((s) => s.id === sectionId);
    if (!section) {
      return error(res, `Section '${sectionId}' not found`, 404);
    }

    section.enabled = !section.enabled;
    website.markModified('sections');
    await website.save();

    return success(res, { website, section }, `Section visibility changed to ${section.enabled}`);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /websites/:id/reorder
 */
export async function reorderSections(req, res, next) {
  try {
    const website = req.website;
    const { order } = req.body; // array of { sectionId, order }

    if (!Array.isArray(order)) {
      return error(res, 'Order must be an array of { sectionId, order }', 400);
    }

    const orderMap = new Map();
    order.forEach((item) => orderMap.set(item.sectionId, item.order));

    for (const sec of website.sections) {
      if (orderMap.has(sec.id)) {
        sec.order = orderMap.get(sec.id);
      }
    }

    website.sections.sort((a, b) => a.order - b.order);
    website.markModified('sections');
    await website.save();

    return success(res, { website }, 'Sections reordered successfully');
  } catch (err) {
    next(err);
  }
}

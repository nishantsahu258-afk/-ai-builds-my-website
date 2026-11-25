import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { Website, WebsiteVersion, Project, Business, Fact, Source } from '../../models/index.js';
import { config } from '../../config/index.js';
import { success, error } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

const UNSUPPORTED_CLAIM_PATTERNS = [
  /confirmed\s*&\s*verified\s*business/i,
  /all\s+verified\s+information\s+backed\s+by\s+sources/i,
  /your\s+premier\b/i,
  /proudly\s+serving\s+the\s+community/i,
  /enjoy\s+quality\s+food\s+and\s+beverages/i,
  /\bquality\b.*\bexperiences?\b/i,
  /\bquality\s+food\b/i,
  /\bgreat\s+atmosphere\b/i,
  /\bis\s+a\s+dedicated\b/i,
  /\bworld[- ]class\b/i,
  /\bbest[- ]in[- ]class\b/i,
  /\bindustry[- ]leading\b/i,
];

/**
 * Inspect enabled website sections for unsupported or unverified boilerplate claims.
 */
export function findUnsupportedClaims(enabledSections, confirmedFacts = []) {
  const confirmedText = confirmedFacts
    .map((f) => (Array.isArray(f.selectedValue) ? f.selectedValue.join(' ') : String(f.selectedValue || '')))
    .join(' ')
    .toLowerCase();

  const findings = [];
  for (const sec of enabledSections) {
    const contentStr = JSON.stringify(sec.content || {});
    for (const pattern of UNSUPPORTED_CLAIM_PATTERNS) {
      const match = contentStr.match(pattern);
      if (match && !confirmedText.includes(match[0].toLowerCase())) {
        findings.push(`Unsupported claim in "${sec.type}" section: "${match[0]}"`);
      }
    }
  }
  return findings;
}

/**
 * POST /websites/:id/publish
 * Creates a version snapshot and sets status to published.
 */
export async function publishWebsite(req, res, next) {
  try {
    const website = req.website;

    // Validate that website has content
    const enabledSections = website.sections.filter((s) => s.enabled);
    if (enabledSections.length === 0) {
      return error(res, 'Cannot publish website without any enabled sections', 400);
    }

    // Publishing Guard 1: Verify confirmed facts and no unresolved conflicts/unverified facts
    const [confirmedFacts, conflictCount, unverifiedCount, blockingSources] = await Promise.all([
      Fact.find({ projectId: website.projectId, status: 'confirmed' }).lean(),
      Fact.countDocuments({ projectId: website.projectId, status: 'conflict' }),
      website.manualOnly ? Promise.resolve(0) : Fact.countDocuments({ projectId: website.projectId, status: 'unverified' }),
      website.manualOnly
        ? Promise.resolve([])
        : Source.find({
            projectId: website.projectId,
            excluded: false,
            $or: [
              { relevance: { $ne: 'relevant' } },
              { extractionStatus: { $in: ['pending', 'processing', 'failed'] } },
            ],
          }).lean(),
    ]);

    if (confirmedFacts.length === 0) {
      return error(res, 'Cannot publish: No confirmed business facts exist for this project.', 400);
    }
    if (conflictCount > 0) {
      return error(res, `Cannot publish: ${conflictCount} unresolved conflicting facts remain.`, 400);
    }
    if (unverifiedCount > 0) {
      return error(res, `Cannot publish: ${unverifiedCount} unverified facts must be confirmed or rejected before publishing.`, 400);
    }
    if (blockingSources.length > 0) {
      return error(res, 'Cannot publish: Active sources are failed, pending, or not relevant. Retry, exclude, or regenerate in manual-only mode.', 400);
    }

    // Publishing Guard 2: Inspect generated sections for unsupported boilerplate claims
    const unsupportedClaims = findUnsupportedClaims(enabledSections, confirmedFacts);
    if (unsupportedClaims.length > 0) {
      return error(
        res,
        `Cannot publish: Website contains unsupported claims (${unsupportedClaims[0]}). Edit the section before publishing.`,
        400
      );
    }

    // Ensure slug exists
    if (!website.slug) {
      const project = await Project.findById(website.projectId).populate('businessId');
      const baseName = project?.businessId?.name || project?.title || 'website';
      const cleanSlug = slugify(baseName, { lower: true, strict: true });
      website.slug = `${cleanSlug}-${uuidv4().slice(0, 6)}`;
    }

    // Determine version number
    const lastVersion = await WebsiteVersion.findOne({ websiteId: website._id })
      .sort({ versionNumber: -1 })
      .lean();

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Create complete snapshot
    const snapshot = {
      theme: website.theme,
      sections: website.sections,
      publishedAt: new Date(),
    };

    const version = await WebsiteVersion.create({
      websiteId: website._id,
      versionNumber,
      completeContentSnapshot: snapshot,
    });

    website.status = 'published';
    website.publishedVersionId = version._id;
    website.publishedAt = new Date();
    await website.save();

    // Update project status
    await Project.findByIdAndUpdate(website.projectId, { status: 'published' });

    logger.info(`[Publishing] Website ${website._id} published as version ${versionNumber} (${website.slug})`);

    const publicUrl = `${config.clientUrl}/sites/${website.slug}`;

    return success(
      res,
      {
        slug: website.slug,
        versionNumber,
        publicUrl,
        publishedAt: website.publishedAt,
      },
      'Website published successfully'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /websites/:id/unpublish
 */
export async function unpublishWebsite(req, res, next) {
  try {
    const website = req.website;

    website.status = 'unpublished';
    await website.save();

    await Project.findByIdAndUpdate(website.projectId, { status: 'draft' });

    logger.info(`[Publishing] Website ${website._id} unpublished`);
    return success(res, { website }, 'Website unpublished successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /websites/:id/versions
 */
export async function getVersions(req, res, next) {
  try {
    const website = req.website;
    const versions = await WebsiteVersion.find({ websiteId: website._id })
      .sort({ versionNumber: -1 })
      .lean();

    return success(res, { versions }, 'Versions retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /public/sites/:slug
 * Publicly accessible endpoint (no auth needed).
 * Serves the last published version snapshot, so uncommitted drafts are not exposed.
 */
export async function getPublicSite(req, res, next) {
  try {
    const { slug } = req.params;

    const website = await Website.findOne({ slug, status: 'published' }).lean();
    if (!website) {
      return error(res, 'Website not found or not currently published', 404);
    }

    // Try finding the published version snapshot
    let contentSnapshot = null;
    if (website.publishedVersionId) {
      const versionDoc = await WebsiteVersion.findById(website.publishedVersionId).lean();
      contentSnapshot = versionDoc?.completeContentSnapshot;
    }

    // Fallback to website document sections if snapshot is missing
    const theme = contentSnapshot?.theme || website.theme;
    const allSections = contentSnapshot?.sections || website.sections;
    const enabledSections = allSections.filter((s) => s.enabled).sort((a, b) => a.order - b.order);

    const project = await Project.findById(website.projectId).populate('businessId').lean();

    const [confirmedCount, conflictCount, unverifiedCount] = await Promise.all([
      Fact.countDocuments({ projectId: website.projectId, status: 'confirmed' }),
      Fact.countDocuments({ projectId: website.projectId, status: 'conflict' }),
      website.manualOnly ? Promise.resolve(0) : Fact.countDocuments({ projectId: website.projectId, status: 'unverified' }),
    ]);

    const hasConfirmedProvenance = confirmedCount > 0 && conflictCount === 0 && unverifiedCount === 0;

    // Cache header for performance
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');

    return success(
      res,
      {
        slug: website.slug,
        businessName: project?.businessId?.name || project?.title || 'Business',
        businessCategory: project?.businessId?.category || null,
        city: project?.businessId?.city || null,
        theme,
        sections: enabledSections,
        manualOnly: Boolean(website.manualOnly),
        hasConfirmedProvenance,
        publishedAt: website.publishedAt,
      },
      'Public site loaded successfully'
    );
  } catch (err) {
    next(err);
  }
}

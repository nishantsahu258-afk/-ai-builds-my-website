import mongoose from "mongoose";
import { Project, Business, Source, Fact } from "../../models/index.js";
import { success } from "../../utils/response.js";
import { logger } from "../../utils/logger.js";

// ---------------------------------------------------------------------------
// GET /projects
// ---------------------------------------------------------------------------

/**
 * List all non-deleted projects owned by the authenticated user.
 * Populates the associated Business document and sorts by most recently updated.
 */
export const listProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      ownerId: req.user.id,
      deleted: { $ne: true },
    })
      .populate("businessId")
      .sort({ updatedAt: -1 })
      .lean();

    return success(res, { projects }, "Projects retrieved successfully");
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /projects
// ---------------------------------------------------------------------------

/**
 * Create a Business + Project atomically inside a Mongoose session transaction.
 * Body: { businessName, city, state, country, category, description, address }
 */
export const createProject = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      businessName,
      city,
      state,
      country,
      category,
      description,
      address,
    } = req.body;

    // 1. Create the Business
    const [business] = await Business.create(
      [
        {
          name: businessName,
          city: city ?? null,
          state: state ?? null,
          country: country ?? "India",
          category: category ?? null,
          description: description ?? null,
          address: address ?? null,
          ownerId: req.user.id,
        },
      ],
      { session },
    );

    // 2. Create the Project — title defaults to the business name
    const [project] = await Project.create(
      [
        {
          title: businessName,
          businessId: business._id,
          ownerId: req.user.id,
          status: "draft",
        },
      ],
      { session },
    );

    // Create manual facts for supplied business fields within the same transaction
    const manualFacts = [];
    const manualFields = {
      businessName,
      city,
      state,
      country,
      category,
      description,
      address,
    };
    for (const [key, value] of Object.entries(manualFields)) {
      if (value !== undefined && value !== null && value !== '') {
        const candidate = {
          value,
          extractionMethod: 'manual',
          evidenceExcerpt: 'Manually entered by business owner',
          extractedAt: new Date(),
        };
        manualFacts.push({
          projectId: project._id,
          key,
          candidates: [candidate],
          selectedValue: value,
          status: 'confirmed',
          confirmedBy: req.user.id,
          confirmedAt: new Date(),
        });
      }
    }
    if (manualFacts.length > 0) {
      await Fact.insertMany(manualFacts, { session });
    }

    await session.commitTransaction();
    session.endSession();

    // Populate business on the returned document
    const populated = await Project.findById(project._id)
      .populate("businessId")
      .lean();

    logger.info(
      `[Projects] Created project ${project._id} for user ${req.user.id}`,
    );

    return success(
      res,
      { project: populated },
      "Project created successfully",
      201,
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------

/**
 * Return a single project (already ownership-checked by middleware).
 * Populates both the business and the current website.
 */
export const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.project._id)
      .populate("businessId")
      .populate("currentWebsiteId")
      .lean();

    return success(res, { project }, "Project retrieved successfully");
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /projects/:id
// ---------------------------------------------------------------------------

/**
 * Update project title/status and optionally update associated Business fields.
 */
export const updateProject = async (req, res, next) => {
  try {
    const {
      title,
      status,
      businessName,
      city,
      state,
      country,
      category,
      description,
      address,
    } = req.body;

    // Build project update payload
    const projectUpdate = {};
    if (title !== undefined) projectUpdate.title = title;
    if (status !== undefined) projectUpdate.status = status;

    // Build business update payload
    const businessUpdate = {};
    if (businessName !== undefined) businessUpdate.name = businessName;
    if (city !== undefined) businessUpdate.city = city;
    if (state !== undefined) businessUpdate.state = state;
    if (country !== undefined) businessUpdate.country = country;
    if (category !== undefined) businessUpdate.category = category;
    if (description !== undefined) businessUpdate.description = description;
    if (address !== undefined) businessUpdate.address = address;

    const updates = [];

    if (Object.keys(projectUpdate).length > 0) {
      updates.push(
        Project.findByIdAndUpdate(
          req.project._id,
          { $set: projectUpdate },
          { new: true },
        ),
      );
    }

    if (Object.keys(businessUpdate).length > 0) {
      updates.push(
        Business.findByIdAndUpdate(
          req.project.businessId,
          { $set: businessUpdate },
          { new: true },
        ),
      );
    }

    await Promise.all(updates);

    const updated = await Project.findById(req.project._id)
      .populate("businessId")
      .populate("currentWebsiteId")
      .lean();

    logger.info(
      `[Projects] Updated project ${req.project._id} by user ${req.user.id}`,
    );

    return success(res, { project: updated }, "Project updated successfully");
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------

/**
 * Soft-delete the project.
 * Sets deleted=true on the Project and cascades to associated Sources and Facts
 * inside a single Mongoose session transaction.
 */
export const deleteProject = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const projectId = req.project._id;

    // Soft-delete the project
    await Project.findByIdAndUpdate(
      projectId,
      { $set: { deleted: true } },
      { session },
    );

    // Cascade: soft-delete associated Sources
    await Source.updateMany(
      { projectId },
      { $set: { deleted: true } },
      { session },
    );

    // Cascade: soft-delete associated Facts
    await Fact.updateMany(
      { projectId },
      { $set: { deleted: true } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    logger.info(
      `[Projects] Soft-deleted project ${projectId} by user ${req.user.id}`,
    );

    return success(res, null, "Project deleted successfully");
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

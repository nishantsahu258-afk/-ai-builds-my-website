import { GenerationJob, Project } from '../../models/index.js';
import { success, error } from '../../utils/response.js';

/**
 * GET /jobs/:jobId
 */
export async function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await GenerationJob.findById(jobId);
    if (!job) {
      return error(res, 'Job not found', 404);
    }

    // Verify ownership of the project
    const project = await Project.findOne({ _id: job.projectId, ownerId: req.user.id });
    if (!project) {
      return error(res, 'Forbidden: you do not have access to this job', 403);
    }

    return success(res, { job }, 'Job status retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects/:id/jobs
 */
export async function listProjectJobs(req, res, next) {
  try {
    const projectId = req.project._id;
    const jobs = await GenerationJob.find({ projectId }).sort({ createdAt: -1 }).limit(20).lean();
    return success(res, { jobs }, 'Project jobs retrieved');
  } catch (err) {
    next(err);
  }
}

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const JOB_TYPES = [
  'process-source',
  'extract-pdf',
  'process-image',
  'research-business',
  'normalize-facts',
  'generate-website',
  'regenerate-section',
  'publish-website',
];

const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed', 'retrying'];

const generationJobSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    bullJobId: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: {
        values: JOB_TYPES,
        message: `Type must be one of: ${JOB_TYPES.join(', ')}`,
      },
      required: [true, 'Job type is required'],
    },
    status: {
      type: String,
      enum: {
        values: JOB_STATUSES,
        message: `Status must be one of: ${JOB_STATUSES.join(', ')}`,
      },
      default: 'queued',
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
    },
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
      min: [0, 'Attempts cannot be negative'],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const GenerationJob = model('GenerationJob', generationJobSchema);

export default GenerationJob;

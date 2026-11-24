import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const PROJECT_STATUSES = ['draft', 'processing', 'review', 'generated', 'published'];

const projectSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: PROJECT_STATUSES,
        message: `Status must be one of: ${PROJECT_STATUSES.join(', ')}`,
      },
      default: 'draft',
    },
    processingStatus: {
      type: String,
      default: null,
    },
    currentWebsiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Project = model('Project', projectSchema);

export default Project;

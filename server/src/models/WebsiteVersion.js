import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const websiteVersionSchema = new Schema(
  {
    websiteId: {
      type: Schema.Types.ObjectId,
      ref: 'Website',
      required: [true, 'Website ID is required'],
      index: true,
    },
    versionNumber: {
      type: Number,
      required: [true, 'Version number is required'],
    },
    completeContentSnapshot: {
      type: Schema.Types.Mixed,
      required: [true, 'Content snapshot is required'],
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Only createdAt — versions are immutable once written
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index — one version number per website
websiteVersionSchema.index({ websiteId: 1, versionNumber: 1 }, { unique: true });

const WebsiteVersion = model('WebsiteVersion', websiteVersionSchema);

export default WebsiteVersion;

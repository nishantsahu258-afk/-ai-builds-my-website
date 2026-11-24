import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const SOURCE_TYPES = ['pdf', 'image', 'website', 'social', 'google_listing', 'manual'];
const EXTRACTION_STATUSES = ['pending', 'processing', 'completed', 'failed', 'skipped'];

const sourceSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: SOURCE_TYPES,
        message: `Type must be one of: ${SOURCE_TYPES.join(', ')}`,
      },
      required: [true, 'Source type is required'],
    },
    url: {
      type: String,
      default: null,
    },
    originalFileName: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    storageKey: {
      type: String,
      default: null,
    },
    extractionStatus: {
      type: String,
      enum: {
        values: EXTRACTION_STATUSES,
        message: `Extraction status must be one of: ${EXTRACTION_STATUSES.join(', ')}`,
      },
      default: 'pending',
    },
    extractedText: {
      type: String,
      default: null,
    },
    extractedData: {
      type: Schema.Types.Mixed,
      default: null,
    },
    sourceMetadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Source = model('Source', sourceSchema);

export default Source;

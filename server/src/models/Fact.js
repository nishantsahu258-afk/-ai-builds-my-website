import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const FACT_STATUSES = ['unverified', 'conflict', 'confirmed', 'rejected', 'missing'];

// ---------------------------------------------------------------------------
// Sub-schema: a single candidate value extracted from one source
// ---------------------------------------------------------------------------
const candidateSchema = new Schema(
  {
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: 'Source',
      default: null,
    },
    sourceURL: {
      type: String,
      default: null,
    },
    evidenceExcerpt: {
      type: String,
      default: null,
    },
    extractionMethod: {
      type: String,
      default: null,
    },
    extractedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main Fact schema
// ---------------------------------------------------------------------------
const factSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      index: true,
    },
    key: {
      type: String,
      required: [true, 'Fact key is required'],
      trim: true,
    },
    candidates: {
      type: [candidateSchema],
      default: [],
    },
    selectedValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: FACT_STATUSES,
        message: `Status must be one of: ${FACT_STATUSES.join(', ')}`,
      },
      default: 'unverified',
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — one fact key per project
factSchema.index({ projectId: 1, key: 1 }, { unique: true });

const Fact = model('Fact', factSchema);

export default Fact;

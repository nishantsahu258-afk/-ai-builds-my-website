import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const WEBSITE_STATUSES = ['draft', 'published', 'unpublished'];

// ---------------------------------------------------------------------------
// Sub-schema: a single page section
// ---------------------------------------------------------------------------
const sectionSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    content: {
      type: Schema.Types.Mixed,
      default: null,
    },
    factRefs: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Sub-schema: theme configuration
// ---------------------------------------------------------------------------
const themeSchema = new Schema(
  {
    primaryColor: { type: String, default: null },
    secondaryColor: { type: String, default: null },
    accentColor: { type: String, default: null },
    font: { type: String, default: null },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main Website schema
// ---------------------------------------------------------------------------
const websiteSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project ID is required'],
      unique: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
      trim: true,
      lowercase: true,
      default: null,
    },
    theme: {
      type: themeSchema,
      default: () => ({}),
    },
    sections: {
      type: [sectionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: WEBSITE_STATUSES,
        message: `Status must be one of: ${WEBSITE_STATUSES.join(', ')}`,
      },
      default: 'draft',
    },
    publishedVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'WebsiteVersion',
      default: null,
    },
    lastGeneratedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Website = model('Website', websiteSchema);

export default Website;

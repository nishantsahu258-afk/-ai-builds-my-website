import { z } from 'zod';

export const allowedSectionTypes = [
  'navbar',
  'hero',
  'about',
  'services',
  'products',
  'gallery',
  'hours',
  'contact',
  'faq',
  'cta',
  'footer',
];

export const themeSchema = z.object({
  primaryColor: z.string().default('#111827'),
  secondaryColor: z.string().default('#F3F4F6'),
  accentColor: z.string().default('#4F46E5'),
  font: z.string().default('Inter'),
});

export const sectionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'navbar',
    'hero',
    'about',
    'services',
    'products',
    'gallery',
    'hours',
    'contact',
    'faq',
    'cta',
    'footer',
  ]),
  enabled: z.boolean().default(true),
  order: z.number().int().default(1),
  content: z.record(z.any()).default({}),
  factRefs: z.array(z.string()).default([]),
});

export const websitePayloadSchema = z.object({
  website: z.object({
    theme: themeSchema.default({}),
    sections: z.array(sectionSchema).min(1, 'Website must contain at least 1 section'),
  }),
});

/**
 * Validates generated website JSON and sanitizes values.
 */
export function validateWebsiteJSON(json) {
  return websitePayloadSchema.parse(json);
}

/**
 * Validates an individual regenerated section.
 */
export function validateSectionJSON(json) {
  return sectionSchema.parse(json);
}

const PROMOTIONAL_CLAIM_PATTERNS = [
  /your\s+premier\b/i,
  /proudly\s+serving\s+the\s+community/i,
  /\bquality\b.*\bexperiences?\b/i,
  /\bquality\s+food\b/i,
  /\bgreat\s+atmosphere\b/i,
  /\bis\s+a\s+dedicated\b/i,
  /\bworld[- ]class\b/i,
  /\bbest[- ]in[- ]class\b/i,
  /\bindustry[- ]leading\b/i,
  /\bunmatched\b/i,
  /\brenowned\b/i,
  /\btrusted\s+by\s+thousands\b/i,
  /confirmed\s*&\s*verified\s*business/i,
  /enjoy\s+quality\s+food\s+and\s+beverages/i,
];

function containsPromotionalClaim(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  return PROMOTIONAL_CLAIM_PATTERNS.some((re) => re.test(text));
}

function sanitizeValueRecursive(val, fallback = '') {
  if (typeof val === 'string') {
    return containsPromotionalClaim(val) ? fallback : val;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizeValueRecursive(item, ''))
      .filter((item) => !(typeof item === 'string' && item === ''));
  }
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = sanitizeValueRecursive(v, '');
    }
    return out;
  }
  return val;
}

/**
 * Server-side content validation for Manual-only generation.
 * Strips/replaces unsupported promotional or inferred marketing claims with
 * neutral factual text or empty editable placeholders before saving.
 */
export function sanitizeManualOnlyWebsite(validated, businessContext = {}) {
  if (!validated?.website?.sections) return validated;

  const name = businessContext.businessName || '';
  const category = businessContext.category || '';
  const location = [businessContext.city, businessContext.state, businessContext.country]
    .filter(Boolean)
    .join(', ');

  const sanitizedSections = validated.website.sections.map((sec) => {
    const content = sanitizeValueRecursive(sec.content || {}, '');

    if (sec.type === 'hero') {
      if (!content.headline && name) content.headline = name;
      if (!content.subheadline && (category || location)) {
        content.subheadline = [category, location ? `in ${location}` : ''].filter(Boolean).join(' ');
      }
    } else if (sec.type === 'about') {
      if (!content.description && !businessContext.description) {
        content.description = '';
      }
    }

    return { ...sec, content };
  });

  return {
    ...validated,
    website: {
      ...validated.website,
      sections: sanitizedSections,
    },
  };
}

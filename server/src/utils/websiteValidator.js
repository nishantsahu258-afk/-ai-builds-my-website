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

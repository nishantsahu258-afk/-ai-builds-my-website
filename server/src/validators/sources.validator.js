import { z } from 'zod';

/**
 * Schema for POST /projects/:id/sources/links
 */
export const addLinkSchema = z.object({
  url: z
    .string({ required_error: 'URL is required' })
    .url('Must be a valid URL')
    .max(2048, 'URL must be at most 2048 characters'),

  type: z
    .enum(['website', 'social', 'google_listing'], {
      errorMap: () => ({
        message: "Type must be one of: 'website', 'social', 'google_listing'",
      }),
    })
    .optional(),
});

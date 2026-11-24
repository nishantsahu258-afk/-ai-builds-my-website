import { z } from 'zod';

/**
 * Schema for POST /projects
 * Creates a new project + business atomically.
 */
export const createProjectSchema = z.object({
  businessName: z
    .string({ required_error: 'Business name is required' })
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must be at most 200 characters')
    .trim(),

  city: z
    .string({ required_error: 'City is required' })
    .min(1, 'City must not be empty')
    .max(100, 'City must be at most 100 characters')
    .trim(),

  state: z
    .string()
    .max(100, 'State must be at most 100 characters')
    .trim()
    .optional(),

  country: z
    .string()
    .max(100, 'Country must be at most 100 characters')
    .trim()
    .default('India'),

  category: z
    .string()
    .max(100, 'Category must be at most 100 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .trim()
    .optional(),

  address: z
    .string()
    .max(500, 'Address must be at most 500 characters')
    .trim()
    .optional(),
});

/**
 * Schema for PATCH /projects/:id
 * All fields optional; allows updating project title/status and business details.
 */
export const updateProjectSchema = createProjectSchema
  .partial()
  .extend({
    title: z
      .string()
      .min(2, 'Title must be at least 2 characters')
      .max(300, 'Title must be at most 300 characters')
      .trim()
      .optional(),

    status: z
      .enum(['draft', 'processing', 'review', 'generated', 'published'], {
        errorMap: () => ({
          message: 'Status must be one of: draft, processing, review, generated, published',
        }),
      })
      .optional(),
  });

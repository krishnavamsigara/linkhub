import { z } from 'zod';

export const createLinkSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title cannot exceed 255 characters'),

  originalUrl: z
    .string()
    .url('Original URL must be a valid URL (including http:// or https://)'),

  shortCode: z
    .string()
    .min(3, 'Custom shortcode must be at least 3 characters')
    .max(50, 'Custom shortcode cannot exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Shortcode can only contain letters, numbers, hyphens, and underscores',
    )
    .nullable()
    .optional(),

  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .nullable()
    .optional(),

  icon: z
    .string()
    .max(100)
    .nullable()
    .optional(),

  isActive: z.boolean().optional(),

  expiresAt: z.string().nullable().optional(),

  expiresInDays: z.number().int().positive().nullable().optional(),

  expiresInHours: z.number().int().positive().nullable().optional(),
});

export const updateLinkSchema = createLinkSchema.partial();

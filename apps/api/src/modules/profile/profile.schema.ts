import { z } from 'zod';

export const updateProfileSchema = z.object({
  bio: z
    .string()
    .max(1000, 'Bio must not exceed 1000 characters')
    .nullable()
    .optional(),

  website: z
    .string()
    .url('Website must be a valid URL')
    .max(255)
    .or(z.literal(''))
    .nullable()
    .optional(),

  location: z
    .string()
    .max(100, 'Location must not exceed 100 characters')
    .nullable()
    .optional(),

  displayName: z
    .string()
    .max(100, 'Display name must not exceed 100 characters')
    .nullable()
    .optional(),
});

export type UpdateProfileSchemaInput = z.infer<typeof updateProfileSchema>;

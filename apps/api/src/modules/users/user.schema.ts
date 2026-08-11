import { z } from 'zod';

export const userParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID format'), // Adjust to .cuid() if using CUIDs
});

export const createUserSchema = z.object({
  email: z
    .email({ message: 'Invalid email address' })
    .trim()
    .max(255)
    .transform((value) => value.toLowerCase()),

  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can contain only letters, numbers and underscores',
    )
    .transform((value) => value.toLowerCase()),

  displayName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional(),
});

export const updateUserSchema = z.object({
  email: z
    .email({ message: 'Invalid email address' })
    .trim()
    .max(255)
    .transform((value) => value.toLowerCase())
    .optional(),

  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can contain only letters, numbers and underscores',
    )
    .transform((value) => value.toLowerCase())
    .optional(),

  displayName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .optional(),
});

// Infer types directly from schemas as the single source of truth
export type UserParams = z.infer<typeof userParamsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

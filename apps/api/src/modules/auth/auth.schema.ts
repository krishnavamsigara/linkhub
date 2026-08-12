import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
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
    .optional(),

  password: z
    .string()
    .min(8)
    .max(128),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1)
    .max(128),
});

import { z } from 'zod';

export const oauthCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const oauthProviderSchema = z.enum(['google', 'github']);

export type OAuthCallbackInputSchema = z.infer<typeof oauthCallbackSchema>;

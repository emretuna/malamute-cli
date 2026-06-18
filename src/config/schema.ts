import { z } from 'zod';

export const ConfigSchema = z.object({
  version: z.literal(1),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  providers: z
    .object({
      'claude-code': z
        .object({
          command: z.string().default('claude'),
          timeoutMs: z.number().int().positive().default(60_000),
        })
        .default({}),
    })
    .default({}),
  events: z
    .object({
      'pre-commit': z.object({ enabled: z.boolean().default(true), agentPrompt: z.string() }).optional(),
      'post-commit': z.object({ enabled: z.boolean().default(false) }).optional(),
      'pre-push': z.object({ enabled: z.boolean().default(false) }).optional(),
      'post-merge': z.object({ enabled: z.boolean().default(false) }).optional(),
    })
    .default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type PreCommitEventConfig = z.infer<typeof ConfigSchema.shape.events>['pre-commit'];

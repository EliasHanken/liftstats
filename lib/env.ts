import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CRON_SECRET: z.string().min(16),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  CRON_SECRET: process.env.CRON_SECRET,
});

export type Env = z.infer<typeof schema>;

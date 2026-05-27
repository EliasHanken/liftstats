import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var __db: NeonHttpDatabase<typeof schema> | undefined;
}

function makeClient() {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export const db: NeonHttpDatabase<typeof schema> =
  globalThis.__db ?? (globalThis.__db = makeClient());

export { schema };

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '@/lib/env';

// We use node-postgres (pg) rather than the neon-http driver so the same client
// works with any Postgres host — Railway, Neon (TCP mode), Supabase, self-hosted.
// On Vercel Fluid Compute, instances are reused across concurrent requests, so
// a small per-instance Pool keeps connection count manageable.
declare global {
  // eslint-disable-next-line no-var
  var __db: NodePgDatabase<typeof schema> | undefined;
  // eslint-disable-next-line no-var
  var __pool: Pool | undefined;
}

function makeClient() {
  const pool =
    globalThis.__pool ??
    (globalThis.__pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
    }));
  return drizzle(pool, { schema });
}

export const db: NodePgDatabase<typeof schema> =
  globalThis.__db ?? (globalThis.__db = makeClient());

export { schema };

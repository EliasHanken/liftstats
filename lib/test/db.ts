import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import fs from 'node:fs/promises';
import path from 'node:path';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const client = new PGlite({ extensions: { pg_trgm } });
  const db = drizzle(client, { schema });

  const migrationsDir = path.resolve('lib/db/migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      await client.exec(statement);
    }
  }

  return {
    db,
    client,
    async close() {
      await client.close();
    },
  };
}

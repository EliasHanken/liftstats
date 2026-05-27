import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import fs from 'node:fs/promises';
import path from 'node:path';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // Apply migrations in order, executing the raw SQL files.
  const migrationsDir = path.resolve('lib/db/migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    // Drizzle uses statement-breakpoints; split on them and execute each piece.
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const statement of statements) {
      try {
        await client.exec(statement);
      } catch (err) {
        // pglite may not support pg_trgm; if so, skip the trgm migration silently.
        if (statement.includes('pg_trgm')) continue;
        throw err;
      }
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

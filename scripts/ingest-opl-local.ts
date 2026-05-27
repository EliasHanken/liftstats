// Usage:
//   npm run ingest:opl:local
// Requires DATABASE_URL in env. Hits the real OPL CSV. Use sparingly — bandwidth + time.

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { runOplIngest } from '../lib/ingest/opl/runner';
import { defaultFetchCsv } from '../lib/ingest/opl/fetcher';
import * as schema from '../lib/db/schema';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client, { schema });

  console.log('Starting OPL ingest...');
  const result = await runOplIngest({
    db,
    fetchCsv: defaultFetchCsv,
    onProgress: (rows) => process.stdout.write(`\r  ${rows.toLocaleString()} rows processed`),
  });
  process.stdout.write('\n');
  console.log('Done:', result);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });

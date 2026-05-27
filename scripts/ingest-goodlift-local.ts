import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { runGoodliftIngest } from '../lib/ingest/goodlift/runner';
import { GoodliftFetcher } from '../lib/ingest/goodlift/fetcher';
import * as schema from '../lib/db/schema';

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client, { schema });

  console.log('Starting GoodLift ingest...');
  const fetcher = new GoodliftFetcher();
  const result = await runGoodliftIngest({ db, fetcher, years: YEARS, skipDone: true });
  console.log('Done:', result);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });

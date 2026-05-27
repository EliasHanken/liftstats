import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { runGoodliftIngest, type GoodliftDeps } from '@/lib/ingest/goodlift/runner';
import { lifter, meet, entry, attempt } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

async function fixtureDeps(): Promise<GoodliftDeps['fetcher']> {
  const listing = await fs.readFile(
    path.resolve('tests/ingest/goodlift/fixtures/competitions-2024.html'), 'utf8',
  );
  const detail = await fs.readFile(
    path.resolve('tests/ingest/goodlift/fixtures/onecompetition-dtl-1046.html'), 'utf8',
  );
  return {
    fetchCompetitionsListing: async (_year: number) => listing,
    fetchCompetitionDetail: async (_cid: number) => detail,
  };
}

describe('runGoodliftIngest', () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
    // Seed a lifter and an OPL meet that match cid=947 in the listing fixture.
    // The listing fixture (competitions-2024.html) contains cid=947:
    //   name:  "IPF World Men's Classic Open Powerlifting Championships"
    //   date:  "2024-06-15"  (year from ?year=2024 URL param, correctly passed through)
    //   fed:   "International Powerlifting Federation" → IPF
    // The detail fixture (onecompetition-dtl-1046.html) contains Ivan Campano Diaz
    // at -59kg, place 1 with a total of 637.5 kg.
    const [l] = await t.db.insert(lifter).values({
      slug: 'campano-diaz-ivan', name: 'Ivan Campano Diaz', sex: 'M', country: 'ESP',
    }).returning();
    const [m] = await t.db.insert(meet).values({
      source: 'opl',
      sourceMeetId: 'opl-cid-947',
      federation: 'IPF',
      date: '2024-06-15',
      name: 'World Classic Powerlifting Championships',
      country: 'Lithuania',
    }).returning();
    await t.db.insert(entry).values({
      lifterId: l.id, meetId: m.id, equipment: 'Raw', weightClassKg: '-59',
      place: 1, totalKg: '637.5',
    });
  });
  afterAll(async () => { await t.close(); });

  it('ingests fixture meets, inserting attempts for matched entries', async () => {
    const fetcher = await fixtureDeps();
    const result = await runGoodliftIngest({
      db: t.db,
      fetcher,
      years: [2024],
    });

    expect(result.meetsConsidered).toBeGreaterThan(0);
    expect(result.meetsMatched).toBeGreaterThan(0);
    expect(result.attemptsInserted).toBeGreaterThan(0);

    // Specific assertion: Ivan at -59 place 1 should have 9 attempts.
    const ivan = (await t.db.select().from(lifter).where(eq(lifter.slug, 'campano-diaz-ivan')))[0];
    const ivanEntry = (await t.db.select().from(entry).where(eq(entry.lifterId, ivan.id)))[0];
    const attempts = await t.db.select().from(attempt).where(eq(attempt.entryId, ivanEntry.id));
    expect(attempts).toHaveLength(9);
  });
});

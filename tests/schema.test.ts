import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { lifter, meet, entry, attempt, ingestRun, goodliftTargets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('schema migrations + inserts', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('can insert and read a lifter', async () => {
    await t.db.insert(lifter).values({
      slug: 'john-haack',
      name: 'John Haack',
      sex: 'M',
      country: 'USA',
    });
    const rows = await t.db.select().from(lifter).where(eq(lifter.slug, 'john-haack'));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('John Haack');
  });

  it('can insert a meet + entry + attempt linked correctly', async () => {
    const [m] = await t.db.insert(meet).values({
      source: 'goodlift',
      sourceMeetId: 'sbd-pro-2024',
      federation: 'IPF',
      date: '2024-09-01',
      name: 'SBD Pro 2024',
      country: 'USA',
      hasAttempts: true,
    }).returning();

    const [l] = await t.db.insert(lifter).values({
      slug: 'jesus-olivares',
      name: 'Jesus Olivares',
      sex: 'M',
      country: 'USA',
    }).returning();

    const [e] = await t.db.insert(entry).values({
      lifterId: l.id,
      meetId: m.id,
      equipment: 'Raw',
      weightClassKg: '120',
      bodyweightKg: '160.0',
      bestSqKg: '450',
      bestBpKg: '270',
      bestDlKg: '420',
      totalKg: '1140',
      glPoints: '127.5',
    }).returning();

    await t.db.insert(attempt).values([
      { entryId: e.id, lift: 'SQ', attemptNo: 1, weightKg: '430', result: 'good' },
      { entryId: e.id, lift: 'SQ', attemptNo: 2, weightKg: '450', result: 'good' },
      { entryId: e.id, lift: 'SQ', attemptNo: 3, weightKg: '465', result: 'no_lift' },
    ]);

    const attempts = await t.db.select().from(attempt).where(eq(attempt.entryId, e.id));
    expect(attempts).toHaveLength(3);
    expect(attempts.filter((a) => a.result === 'good')).toHaveLength(2);
  });

  it('records an ingest run', async () => {
    const [run] = await t.db.insert(ingestRun).values({
      source: 'opl',
      status: 'ok',
      rowsAdded: 1234,
      rowsUpdated: 56,
    }).returning();
    expect(run.id).toBeGreaterThan(0);
    expect(run.status).toBe('ok');
  });

  it('records a goodlift target', async () => {
    const [tgt] = await t.db.insert(goodliftTargets).values({
      goodliftUrl: 'https://goodlift.info/results.php?c_id=123',
      note: 'NSF Norgesmesterskap 2024',
    }).returning();
    expect(tgt.lastStatus).toBe('pending');
  });
});

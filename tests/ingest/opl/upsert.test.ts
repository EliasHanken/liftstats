import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { upsertLifters, upsertMeets, upsertEntries } from '@/lib/ingest/opl/upsert';
import type { NormalizedRow } from '@/lib/ingest/opl/types';
import { lifter, meet, entry, attempt } from '@/lib/db/schema';

function makeRow(overrides: Partial<NormalizedRow['lifter']> = {}): NormalizedRow {
  const lifterPart = { name: 'John Haack', slug: 'john-haack', sex: 'M' as const, country: 'USA', ...overrides };
  return {
    lifter: lifterPart,
    meet: {
      sourceMeetId: 'aaaa1111aaaa1111',
      federation: 'WRPF',
      date: '2024-09-01',
      name: 'WRPF Showdown',
      country: 'USA',
      town: 'Las Vegas',
    },
    entry: {
      equipment: 'Raw',
      weightClassKg: '90',
      bodyweightKg: '89.8',
      age: '32.5',
      ageClass: 'Open',
      division: 'Open',
      bestSqKg: '377.5',
      bestBpKg: '272.5',
      bestDlKg: '400.0',
      totalKg: '1050.0',
      place: 1,
      glPoints: '124.86',
      wilks: null,
      dots: null,
      tested: true,
      attempts: [],
    },
  };
}

describe('upsert helpers', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('upsertLifters inserts new and returns slug→id map', async () => {
    const rows = [makeRow(), makeRow({ name: 'Jesus Olivares', slug: 'jesus-olivares' })];
    const ids = await upsertLifters(t.db, rows);
    expect(ids.size).toBe(2);
    expect(ids.get('john-haack')!).toBeGreaterThan(0);
    expect(ids.get('jesus-olivares')!).toBeGreaterThan(0);
    const all = await t.db.select().from(lifter);
    expect(all).toHaveLength(2);
  });

  it('upsertLifters is idempotent — running twice does not duplicate', async () => {
    const rows = [makeRow()];
    await upsertLifters(t.db, rows);
    await upsertLifters(t.db, rows);
    const all = await t.db.select().from(lifter);
    expect(all).toHaveLength(2); // 2 from previous test still here; no new dupes
  });

  it('upsertMeets inserts and dedupes by (source, source_meet_id)', async () => {
    const rows = [
      makeRow(),
      makeRow({ name: 'Other', slug: 'other-m' }), // same meet, different lifter
    ];
    const ids = await upsertMeets(t.db, rows);
    expect(ids.size).toBe(1);
    const all = await t.db.select().from(meet);
    expect(all.filter((m) => m.sourceMeetId === 'aaaa1111aaaa1111')).toHaveLength(1);
  });

  it('upsertEntries links lifter+meet correctly and dedupes by (lifter, meet, eq, class)', async () => {
    const rows = [makeRow()];
    const lifterIds = await upsertLifters(t.db, rows);
    const meetIds = await upsertMeets(t.db, rows);
    const inserted1 = await upsertEntries(t.db, rows, lifterIds, meetIds);
    expect(inserted1).toBe(1);
    // run again — same entries, no duplicates
    const inserted2 = await upsertEntries(t.db, rows, lifterIds, meetIds);
    expect(inserted2).toBe(0);
    const all = await t.db.select().from(entry);
    expect(all).toHaveLength(1);
  });

  it('round-trips tested boolean through upsertEntries', async () => {
    const rows = [makeRow({ name: 'Test Tested', slug: 'test-tested' })];
    const lifterIds = await upsertLifters(t.db, rows);
    const meetIds = await upsertMeets(t.db, rows);
    await upsertEntries(t.db, rows, lifterIds, meetIds);
    const all = await t.db.select().from(entry);
    expect(all.some((e) => e.tested === true)).toBe(true);
  });

  it('upsertAttemptsFromOpl bulk-inserts attempts for many entries', async () => {
    const { upsertAttemptsFromOpl } = await import('@/lib/ingest/opl/upsert');
    const rows = [makeRow(), makeRow({ name: 'B', slug: 'b-m' })];
    const lifterIds = await upsertLifters(t.db, rows);
    const meetIds = await upsertMeets(t.db, rows);
    await upsertEntries(t.db, rows, lifterIds, meetIds);

    const allEntries = await t.db.select().from(entry);
    expect(allEntries.length).toBeGreaterThanOrEqual(2);
    const e1 = allEntries[allEntries.length - 2];
    const e2 = allEntries[allEntries.length - 1];

    const batch = [
      {
        entryId: e1.id,
        attempts: [
          { lift: 'SQ' as const, attemptNo: 1 as const, weightKg: 100, result: 'good' as const },
          { lift: 'SQ' as const, attemptNo: 2 as const, weightKg: 110, result: 'no_lift' as const },
        ],
      },
      {
        entryId: e2.id,
        attempts: [
          { lift: 'DL' as const, attemptNo: 1 as const, weightKg: 250, result: 'good' as const },
        ],
      },
    ];
    const n = await upsertAttemptsFromOpl(t.db, batch);
    expect(n).toBe(3);

    const fromDb = await t.db.select().from(attempt);
    expect(fromDb.length).toBeGreaterThanOrEqual(3);
  });
});

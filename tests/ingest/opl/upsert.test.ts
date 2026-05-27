import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { upsertLifters, upsertMeets, upsertEntries } from '@/lib/ingest/opl/upsert';
import type { NormalizedRow } from '@/lib/ingest/opl/types';
import { lifter, meet, entry } from '@/lib/db/schema';

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
});

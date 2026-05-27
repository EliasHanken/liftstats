import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getCountryAttemptSuccess } from '@/lib/db/queries/attempts';
import { lifter, meet, entry, attempt } from '@/lib/db/schema';

describe('getCountryAttemptSuccess', () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
    const [l1] = await t.db.insert(lifter).values({ slug: 'n1-m', name: 'N1', sex: 'M', country: 'NOR' }).returning();
    const [l2] = await t.db.insert(lifter).values({ slug: 'n2-f', name: 'N2', sex: 'F', country: 'NOR' }).returning();
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'a', federation: 'NSF', date: '2024-05-01',
      name: 'Test', hasAttempts: true,
    }).returning();
    const [e1] = await t.db.insert(entry).values({
      lifterId: l1.id, meetId: m.id, equipment: 'Raw', weightClassKg: '83', place: 1,
    }).returning();
    const [e2] = await t.db.insert(entry).values({
      lifterId: l2.id, meetId: m.id, equipment: 'Raw', weightClassKg: '63', place: 1,
    }).returning();
    // N1: 3/3 SQ, 2/3 BP, 1/3 DL
    await t.db.insert(attempt).values([
      { entryId: e1.id, lift: 'SQ', attemptNo: 1, weightKg: '200', result: 'good' },
      { entryId: e1.id, lift: 'SQ', attemptNo: 2, weightKg: '210', result: 'good' },
      { entryId: e1.id, lift: 'SQ', attemptNo: 3, weightKg: '215', result: 'good' },
      { entryId: e1.id, lift: 'BP', attemptNo: 1, weightKg: '140', result: 'good' },
      { entryId: e1.id, lift: 'BP', attemptNo: 2, weightKg: '145', result: 'good' },
      { entryId: e1.id, lift: 'BP', attemptNo: 3, weightKg: '150', result: 'no_lift' },
      { entryId: e1.id, lift: 'DL', attemptNo: 1, weightKg: '230', result: 'good' },
      { entryId: e1.id, lift: 'DL', attemptNo: 2, weightKg: '245', result: 'no_lift' },
      { entryId: e1.id, lift: 'DL', attemptNo: 3, weightKg: '260', result: 'no_lift' },
    ]);
    // N2: 2/3 SQ, 3/3 BP, 3/3 DL
    await t.db.insert(attempt).values([
      { entryId: e2.id, lift: 'SQ', attemptNo: 1, weightKg: '120', result: 'good' },
      { entryId: e2.id, lift: 'SQ', attemptNo: 2, weightKg: '130', result: 'good' },
      { entryId: e2.id, lift: 'SQ', attemptNo: 3, weightKg: '140', result: 'no_lift' },
      { entryId: e2.id, lift: 'BP', attemptNo: 1, weightKg: '70',  result: 'good' },
      { entryId: e2.id, lift: 'BP', attemptNo: 2, weightKg: '75',  result: 'good' },
      { entryId: e2.id, lift: 'BP', attemptNo: 3, weightKg: '78',  result: 'good' },
      { entryId: e2.id, lift: 'DL', attemptNo: 1, weightKg: '170', result: 'good' },
      { entryId: e2.id, lift: 'DL', attemptNo: 2, weightKg: '180', result: 'good' },
      { entryId: e2.id, lift: 'DL', attemptNo: 3, weightKg: '190', result: 'good' },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('aggregates per-lift attempt success across a country', async () => {
    const r = await getCountryAttemptSuccess(t.db, 'NOR');
    expect(r.lifters).toBe(2);
    expect(r.SQ.good).toBe(5);  expect(r.SQ.total).toBe(6);
    expect(r.BP.good).toBe(5);  expect(r.BP.total).toBe(6);
    expect(r.DL.good).toBe(4);  expect(r.DL.total).toBe(6);
  });

  it('returns zeros for a country with no attempt data', async () => {
    const r = await getCountryAttemptSuccess(t.db, 'JPN');
    expect(r.lifters).toBe(0);
    expect(r.SQ.total).toBe(0);
  });
});

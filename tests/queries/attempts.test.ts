import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getAttemptSuccessForLifter } from '@/lib/db/queries/attempts';
import { lifter, meet, entry, attempt } from '@/lib/db/schema';

describe('getAttemptSuccessForLifter', () => {
  let t: TestDb;
  let lifterId: number;
  beforeAll(async () => {
    t = await createTestDb();
    const [l] = await t.db.insert(lifter).values({ slug: 'x', name: 'X', sex: 'M' }).returning();
    lifterId = l.id;
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'm1', federation: 'IPF',
      date: '2024-01-01', name: 'T', hasAttempts: true,
    }).returning();
    const [e1] = await t.db.insert(entry).values({
      lifterId: l.id, meetId: m.id, equipment: 'Raw', weightClassKg: '83', place: 1,
    }).returning();
    await t.db.insert(attempt).values([
      { entryId: e1.id, lift: 'SQ', attemptNo: 1, weightKg: '100', result: 'good' },
      { entryId: e1.id, lift: 'SQ', attemptNo: 2, weightKg: '110', result: 'good' },
      { entryId: e1.id, lift: 'SQ', attemptNo: 3, weightKg: '120', result: 'no_lift' },
      { entryId: e1.id, lift: 'BP', attemptNo: 1, weightKg: '70',  result: 'good' },
      { entryId: e1.id, lift: 'BP', attemptNo: 2, weightKg: '75',  result: 'no_lift' },
      { entryId: e1.id, lift: 'BP', attemptNo: 3, weightKg: '78',  result: 'good' },
      { entryId: e1.id, lift: 'DL', attemptNo: 1, weightKg: '180', result: 'good' },
      { entryId: e1.id, lift: 'DL', attemptNo: 2, weightKg: '190', result: 'good' },
      { entryId: e1.id, lift: 'DL', attemptNo: 3, weightKg: '200', result: 'good' },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('reports per-lift, per-attempt-number success rates', async () => {
    const r = await getAttemptSuccessForLifter(t.db, lifterId);
    expect(r.meetCount).toBe(1);
    expect(r.SQ).toMatchObject({ a1: { good: 1, total: 1 }, a2: { good: 1, total: 1 }, a3: { good: 0, total: 1 } });
    expect(r.BP).toMatchObject({ a1: { good: 1, total: 1 }, a2: { good: 0, total: 1 }, a3: { good: 1, total: 1 } });
    expect(r.DL).toMatchObject({ a1: { good: 1, total: 1 }, a2: { good: 1, total: 1 }, a3: { good: 1, total: 1 } });
  });

  it('returns zero-state when the lifter has no attempts on file', async () => {
    const [l2] = await t.db.insert(lifter).values({ slug: 'no-attempts', name: 'NA', sex: 'F' }).returning();
    const r = await getAttemptSuccessForLifter(t.db, l2.id);
    expect(r.meetCount).toBe(0);
    expect(r.SQ.a1.total).toBe(0);
  });
});

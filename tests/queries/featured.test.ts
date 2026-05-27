import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getFeaturedLifters } from '@/lib/db/queries/featured';
import { lifter, meet, entry } from '@/lib/db/schema';

describe('getFeaturedLifters', () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
    const lifters = await t.db.insert(lifter).values([
      { slug: 'a-m', name: 'A High GL', sex: 'M', country: 'USA' },
      { slug: 'b-m', name: 'B Mid GL', sex: 'M', country: 'USA' },
      { slug: 'c-f', name: 'C High GL F', sex: 'F', country: 'NOR' },
      { slug: 'd-m', name: 'D Low GL', sex: 'M', country: 'USA' },
    ]).returning();
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'feat-test', federation: 'IPF',
      date: '2024-10-01', name: 'Test',
    }).returning();
    await t.db.insert(entry).values([
      { lifterId: lifters[0].id, meetId: m.id, equipment: 'Raw',    weightClassKg: '90', glPoints: '125.0', totalKg: '1000' },
      { lifterId: lifters[1].id, meetId: m.id, equipment: 'Raw',    weightClassKg: '83', glPoints: '110.0', totalKg: '900' },
      { lifterId: lifters[2].id, meetId: m.id, equipment: 'Single', weightClassKg: '76', glPoints: '130.0', totalKg: '700' },
      { lifterId: lifters[3].id, meetId: m.id, equipment: 'Raw',    weightClassKg: '93', glPoints: '90.0',  totalKg: '700' },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('returns lifters ordered by best GL descending', async () => {
    const r = await getFeaturedLifters(t.db, { limit: 4 });
    expect(r).toHaveLength(4);
    expect(r[0].slug).toBe('c-f');     // 130
    expect(r[1].slug).toBe('a-m');     // 125
    expect(r[2].slug).toBe('b-m');     // 110
    expect(r[3].slug).toBe('d-m');     // 90
  });

  it('respects the limit', async () => {
    const r = await getFeaturedLifters(t.db, { limit: 2 });
    expect(r).toHaveLength(2);
    expect(r[0].slug).toBe('c-f');
    expect(r[1].slug).toBe('a-m');
  });

  it('returns slug, name, sex, country, bestGl, equipment', async () => {
    const r = await getFeaturedLifters(t.db, { limit: 1 });
    expect(r[0]).toMatchObject({
      slug: 'c-f',
      name: 'C High GL F',
      sex: 'F',
      country: 'NOR',
    });
    expect(Number(r[0].bestGl)).toBeCloseTo(130, 1);
    expect(r[0].equipment).toBe('Single');
  });
});

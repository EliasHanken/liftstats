import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getLeaderboard } from '@/lib/db/queries/rankings';
import { lifter, meet, entry } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('getLeaderboard', () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
    const lifters = await t.db.insert(lifter).values([
      { slug: 'a-m', name: 'Strong A', sex: 'M', country: 'USA' },
      { slug: 'b-f', name: 'Strong B', sex: 'F', country: 'NOR' },
      { slug: 'c-m', name: 'Strong C', sex: 'M', country: 'GBR' },
      { slug: 'd-m', name: 'Strong D', sex: 'M', country: 'USA' },
    ]).returning();
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'lb-test', federation: 'IPF',
      date: '2024-10-01', name: 'TestMeet',
    }).returning();
    await t.db.insert(entry).values([
      { lifterId: lifters[0].id, meetId: m.id, equipment: 'Raw',    weightClassKg: '93',  totalKg: '800', glPoints: '130.0', tested: true,  bestSqKg: '300' },
      { lifterId: lifters[1].id, meetId: m.id, equipment: 'Raw',    weightClassKg: '63',  totalKg: '500', glPoints: '125.0', tested: false, bestSqKg: '180' },
      { lifterId: lifters[2].id, meetId: m.id, equipment: 'Single', weightClassKg: '105', totalKg: '900', glPoints: '120.0', tested: true,  bestSqKg: '330' },
      { lifterId: lifters[3].id, meetId: m.id, equipment: 'Raw',    weightClassKg: '105', totalKg: '750', glPoints: '110.0', tested: false, bestSqKg: '280' },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('returns top lifters by GL by default', async () => {
    const r = await getLeaderboard(t.db, { limit: 10 });
    expect(r.length).toBe(4);
    expect(r[0].slug).toBe('a-m');     // 130
    expect(r[1].slug).toBe('b-f');     // 125
    expect(r[2].slug).toBe('c-m');     // 120
    expect(r[3].slug).toBe('d-m');     // 110
  });

  it('can sort by total instead of GL', async () => {
    const r = await getLeaderboard(t.db, { lift: 'total', limit: 10 });
    expect(r[0].slug).toBe('c-m');     // 900
    expect(r[1].slug).toBe('a-m');     // 800
    expect(r[2].slug).toBe('d-m');     // 750
    expect(r[3].slug).toBe('b-f');     // 500
  });

  it('filters by sex', async () => {
    const r = await getLeaderboard(t.db, { sex: 'F', limit: 10 });
    expect(r.length).toBe(1);
    expect(r[0].slug).toBe('b-f');
  });

  it('filters by equipment', async () => {
    const r = await getLeaderboard(t.db, { equipment: 'Raw', limit: 10 });
    expect(r.map((x) => x.slug)).toEqual(['a-m', 'b-f', 'd-m']);
  });

  it('filters by drug-tested', async () => {
    const r = await getLeaderboard(t.db, { tested: true, limit: 10 });
    expect(r.map((x) => x.slug).sort()).toEqual(['a-m', 'c-m']);
  });

  it('filters by country', async () => {
    const r = await getLeaderboard(t.db, { country: 'USA', limit: 10 });
    expect(r.map((x) => x.slug).sort()).toEqual(['a-m', 'd-m']);
  });

  it('filters by weight class', async () => {
    const r = await getLeaderboard(t.db, { weightClassKg: '105', limit: 10 });
    expect(r.map((x) => x.slug).sort()).toEqual(['c-m', 'd-m']);
  });

  it('respects limit', async () => {
    const r = await getLeaderboard(t.db, { limit: 2 });
    expect(r).toHaveLength(2);
  });

  it('returns one row per lifter (their best entry under the filter)', async () => {
    // Add a second entry for lifter A with a lower GL — A should still appear once
    // and with their best (130) GL.
    const [aRow] = await t.db.select().from(lifter).where(eq(lifter.slug, 'a-m'));
    const [m2] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'lb-test-2', federation: 'IPF',
      date: '2025-05-01', name: 'TestMeet2',
    }).returning();
    await t.db.insert(entry).values({
      lifterId: aRow.id, meetId: m2.id, equipment: 'Raw', weightClassKg: '93',
      totalKg: '820', glPoints: '128.0', tested: true, bestSqKg: '310',
    });
    const r = await getLeaderboard(t.db, { limit: 10 });
    const aCount = r.filter((x) => x.slug === 'a-m').length;
    expect(aCount).toBe(1);
    const a = r.find((x) => x.slug === 'a-m')!;
    expect(Number(a.glPoints)).toBe(130);
  });

  it('filters by division', async () => {
    const { lifter, meet, entry } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    const [a] = await t.db.select().from(lifter).where(eq(lifter.slug, 'a-m'));
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'lb-jr', federation: 'IPF',
      date: '2024-12-01', name: 'JrMeet',
    }).returning();
    await t.db.insert(entry).values({
      lifterId: a.id, meetId: m.id, equipment: 'Raw', weightClassKg: '93',
      totalKg: '850', glPoints: '120.0', tested: true, division: 'Open',
    });
    await t.db.insert(entry).values({
      lifterId: a.id, meetId: m.id, equipment: 'Single', weightClassKg: '93',
      totalKg: '750', glPoints: '105.0', tested: true, division: 'Junior',
    });
    const all = await getLeaderboard(t.db, { limit: 50 });
    // With division='Open', only Open-tagged entries should appear.
    // Lifters b-f, c-m, d-m have no division tag (NULL), so they should be excluded.
    const opn = await getLeaderboard(t.db, { division: 'Open', limit: 50 });
    // a-m has an Open entry so should appear
    expect(opn.some((r) => r.slug === 'a-m')).toBe(true);
    // b-f, c-m, d-m have no division tag so should NOT appear under 'Open'
    expect(opn.some((r) => r.slug === 'b-f')).toBe(false);
    expect(opn.some((r) => r.slug === 'c-m')).toBe(false);
    // Junior filter: a-m's Single entry is tagged Junior
    const jr  = await getLeaderboard(t.db, { division: 'Junior', limit: 50 });
    expect(jr.some((r) => r.slug === 'a-m')).toBe(true);
    // Junior filter only returns the one a-m entry tagged Junior,
    // while the default returns a-m alongside everyone else.
    expect(jr.length).toBeLessThanOrEqual(all.length);
  });
});

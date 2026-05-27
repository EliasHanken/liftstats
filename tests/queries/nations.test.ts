import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { getCountryList, getCountryStats } from '@/lib/db/queries/nations';
import { lifter, meet, entry } from '@/lib/db/schema';

describe('nations queries', () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
    const ls = await t.db.insert(lifter).values([
      { slug: 'n1-m', name: 'N1', sex: 'M', country: 'NOR' },
      { slug: 'n2-m', name: 'N2', sex: 'M', country: 'NOR' },
      { slug: 'n3-m', name: 'N3', sex: 'M', country: 'NOR' },
      { slug: 'n4-f', name: 'N4', sex: 'F', country: 'NOR' },
      { slug: 'u1-m', name: 'U1', sex: 'M', country: 'USA' },
      { slug: 'u2-f', name: 'U2', sex: 'F', country: 'USA' },
      { slug: 'u3-m', name: 'U3', sex: 'M', country: 'USA' },
    ]).returning();

    const [recent, old] = await t.db.insert(meet).values([
      { source: 'opl', sourceMeetId: 'recent', federation: 'IPF', date: '2025-06-01', name: 'Recent' },
      { source: 'opl', sourceMeetId: 'old',    federation: 'IPF', date: '2018-01-01', name: 'Old' },
    ]).returning();

    await t.db.insert(entry).values([
      // Norwegians — all active
      { lifterId: ls[0].id, meetId: recent.id, equipment: 'Raw',    weightClassKg: '83',  glPoints: '100' },
      { lifterId: ls[1].id, meetId: recent.id, equipment: 'Single', weightClassKg: '83',  glPoints: '110' },
      { lifterId: ls[2].id, meetId: recent.id, equipment: 'Raw',    weightClassKg: '83',  glPoints: '105' },
      // N2 also has Raw (competes in both)
      { lifterId: ls[1].id, meetId: recent.id, equipment: 'Raw',    weightClassKg: '83',  glPoints: '95' },
      { lifterId: ls[3].id, meetId: recent.id, equipment: 'Raw',    weightClassKg: '63',  glPoints: '120' },
      // USA U1 + U2 active, U3 inactive
      { lifterId: ls[4].id, meetId: recent.id, equipment: 'Raw',    weightClassKg: '93',  glPoints: '108' },
      { lifterId: ls[5].id, meetId: recent.id, equipment: 'Raw',    weightClassKg: '76',  glPoints: '115' },
      { lifterId: ls[6].id, meetId: old.id,    equipment: 'Raw',    weightClassKg: '93',  glPoints: '90' },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('getCountryList returns countries ordered by active-lifter count', async () => {
    const r = await getCountryList(t.db, { activeSince: '2023-01-01', limit: 5 });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].country).toBe('NOR');
    expect(r[0].lifters).toBe(4);
    const usa = r.find((c) => c.country === 'USA');
    expect(usa?.lifters).toBe(2);
  });

  it('getCountryStats reports totals correctly', async () => {
    const s = await getCountryStats(t.db, 'NOR', { activeSince: '2023-01-01' });
    expect(s.totalLifters).toBe(4);
    expect(s.rawLifters).toBe(4);  // N1, N2, N3, N4
  });

  it('getCountryStats: eq + both correct', async () => {
    const s = await getCountryStats(t.db, 'NOR', { activeSince: '2023-01-01' });
    expect(s.eqLifters).toBe(1);   // N2 only
    expect(s.bothLifters).toBe(1); // N2 only
    expect(s.men).toBe(3);
    expect(s.women).toBe(1);
  });

  it('getCountryStats returns zeroes for a country with no active lifters', async () => {
    const s = await getCountryStats(t.db, 'JPN', { activeSince: '2023-01-01' });
    expect(s.totalLifters).toBe(0);
    expect(s.rawLifters).toBe(0);
    expect(s.eqLifters).toBe(0);
  });

  describe('getWeightClassDistribution', () => {
    it('returns a count per (sex, equipment, weight_class) cell', async () => {
      const { getWeightClassDistribution } = await import('@/lib/db/queries/nations');
      const cells = await getWeightClassDistribution(t.db, 'NOR', { activeSince: '2023-01-01' });
      expect(cells.length).toBeGreaterThan(0);
      const m83Raw = cells.find((c) => c.sex === 'M' && c.equipment === 'Raw' && c.weightClassKg === '83');
      expect(m83Raw?.lifters).toBe(3);
    });
  });

  describe('getEqVsRawDeltaData', () => {
    it('returns one row per lifter who has both raw and equipped totals', async () => {
      const { getEqVsRawDeltaData } = await import('@/lib/db/queries/nations');
      const r = await getEqVsRawDeltaData(t.db, 'NOR', { activeSince: '2023-01-01' });
      expect(r.length).toBe(1);
      expect(r[0].slug).toBe('n2-m');
      expect(Number(r[0].rawGl)).toBe(95);
      expect(Number(r[0].eqGl)).toBe(110);
    });
  });

  describe('getTopByDiscipline', () => {
    it('returns top raw and top eq lifters per country, one row per lifter', async () => {
      const { getTopByDiscipline } = await import('@/lib/db/queries/nations');
      const r = await getTopByDiscipline(t.db, 'NOR', { activeSince: '2023-01-01', limit: 10 });
      expect(r.raw.length).toBeGreaterThan(0);
      expect(r.eq.length).toBeGreaterThan(0);
      expect(r.raw[0].slug).toBe('n4-f');
      expect(Number(r.raw[0].bestGl)).toBe(120);
      expect(r.eq[0].slug).toBe('n2-m');
      expect(Number(r.eq[0].bestGl)).toBe(110);
    });

    it('respects limit', async () => {
      const { getTopByDiscipline } = await import('@/lib/db/queries/nations');
      const r = await getTopByDiscipline(t.db, 'NOR', { activeSince: '2023-01-01', limit: 2 });
      expect(r.raw.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getGlDistribution', () => {
    it('returns histogram bins with the four (sex × equipment) count fields', async () => {
      const { getGlDistribution } = await import('@/lib/db/queries/nations');
      const d = await getGlDistribution(t.db, 'NOR', { activeSince: '2023-01-01' });
      expect(d.bins.length).toBeGreaterThan(0);
      expect(d.bins[0]).toHaveProperty('low');
      expect(d.bins[0]).toHaveProperty('high');
      expect(d.bins[0]).toHaveProperty('mRaw');
      expect(d.bins[0]).toHaveProperty('mEq');
      expect(d.bins[0]).toHaveProperty('fRaw');
      expect(d.bins[0]).toHaveProperty('fEq');
    });

    it('total bin counts equal the number of qualifying NOR entries', async () => {
      const { getGlDistribution } = await import('@/lib/db/queries/nations');
      const d = await getGlDistribution(t.db, 'NOR', { activeSince: '2023-01-01' });
      const totalCounted = d.bins.reduce(
        (sum, b) => sum + b.mRaw + b.mEq + b.fRaw + b.fEq, 0,
      );
      expect(totalCounted).toBe(5);
    });
  });

  it('getEqVsRawDeltaData respects an explicit limit', async () => {
    const { getEqVsRawDeltaData } = await import('@/lib/db/queries/nations');
    const r = await getEqVsRawDeltaData(t.db, 'NOR', { activeSince: '2023-01-01', limit: 200 });
    expect(r.length).toBeLessThanOrEqual(200);
  });

  it('nation queries accept an ageClass filter', async () => {
    const { eq } = await import('drizzle-orm');
    const { getCountryStats } = await import('@/lib/db/queries/nations');
    const [n1] = await t.db.select().from(lifter).where(eq(lifter.slug, 'n1-m'));
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'jr-meet', federation: 'IPF',
      date: '2025-06-01', name: 'Jr Meet',
    }).returning();
    await t.db.insert(entry).values({
      lifterId: n1.id, meetId: m.id, equipment: 'Raw', weightClassKg: '83',
      glPoints: '100', ageClass: 'Junior',
    });
    const all = await getCountryStats(t.db, 'NOR', { activeSince: '2023-01-01' });
    const jr  = await getCountryStats(t.db, 'NOR', { activeSince: '2023-01-01', ageClass: 'Junior' });
    expect(all.totalLifters).toBeGreaterThan(jr.totalLifters);
    expect(jr.totalLifters).toBe(1);
  });
});

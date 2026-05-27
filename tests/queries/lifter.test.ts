import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import {
  getLifterBySlug,
  getLifterMeets,
  getLifterAggregates,
  getLifterRivals,
} from '@/lib/db/queries/lifter';
import { lifter, meet, entry } from '@/lib/db/schema';

describe('lifter queries', () => {
  let t: TestDb;
  let jesusId: number;

  beforeAll(async () => {
    t = await createTestDb();
    const [jesus, john, rival] = await t.db.insert(lifter).values([
      { slug: 'jesus-olivares', name: 'Jesus Olivares', sex: 'M', country: 'USA' },
      { slug: 'john-haack', name: 'John Haack', sex: 'M', country: 'USA' },
      { slug: 'rival-shw-m', name: 'Rival SHW', sex: 'M', country: 'USA' },
    ]).returning();
    jesusId = jesus.id;

    const [worlds, usapl] = await t.db.insert(meet).values([
      { source: 'opl', sourceMeetId: 'ipf-worlds-2024', federation: 'IPF',
        date: '2024-10-01', name: 'IPF Worlds 2024', country: 'USA' },
      { source: 'opl', sourceMeetId: 'usapl-2024', federation: 'USAPL',
        date: '2024-06-15', name: 'USAPL Open', country: 'USA' },
    ]).returning();

    await t.db.insert(entry).values([
      // Jesus Raw at USAPL
      { lifterId: jesus.id, meetId: usapl.id, equipment: 'Raw', weightClassKg: '120+',
        bestSqKg: '440', bestBpKg: '290', bestDlKg: '415', totalKg: '1145',
        place: 1, glPoints: '127.50', flightSize: 3 },
      // Jesus Single-ply at Worlds
      { lifterId: jesus.id, meetId: worlds.id, equipment: 'Single', weightClassKg: '120+',
        bestSqKg: '470', bestBpKg: '330', bestDlKg: '430', totalKg: '1230',
        place: 1, glPoints: '135.10', flightSize: 5 },
      // Rival at Worlds, same eq+class+sex, near Jesus's GL
      { lifterId: rival.id, meetId: worlds.id, equipment: 'Single', weightClassKg: '120+',
        bestSqKg: '460', bestBpKg: '320', bestDlKg: '420', totalKg: '1200',
        place: 2, glPoints: '133.80', flightSize: 5 },
    ]);
  });
  afterAll(async () => { await t.close(); });

  it('getLifterBySlug returns the lifter or null', async () => {
    const l = await getLifterBySlug(t.db, 'jesus-olivares');
    expect(l).toMatchObject({ name: 'Jesus Olivares', sex: 'M', country: 'USA' });
    const none = await getLifterBySlug(t.db, 'does-not-exist');
    expect(none).toBeNull();
  });

  it('getLifterMeets returns entries with meet details, newest first', async () => {
    const meets = await getLifterMeets(t.db, jesusId);
    expect(meets).toHaveLength(2);
    expect(meets[0].date).toBe('2024-10-01');
    expect(meets[0].meetName).toBe('IPF Worlds 2024');
    expect(meets[0].equipment).toBe('Single');
    expect(meets[0].totalKg).toBe('1230');
    expect(meets[0].glPoints).toBe('135.10');
    expect(meets[0].flightSize).toBe(5);
    expect(meets[1].date).toBe('2024-06-15');
  });

  it('getLifterAggregates returns best GL per discipline + counts', async () => {
    const agg = await getLifterAggregates(t.db, jesusId);
    expect(agg.totalMeets).toBe(2);
    expect(Number(agg.bestRawGl)).toBeCloseTo(127.5, 1);
    expect(Number(agg.bestEqGl)).toBeCloseTo(135.1, 1);
    expect(agg.hasBothDisciplines).toBe(true);
  });

  it('getLifterAggregates: hasBothDisciplines is false when only one', async () => {
    const johnAgg = await getLifterAggregates(t.db, (await getLifterBySlug(t.db, 'john-haack'))!.id);
    expect(johnAgg.hasBothDisciplines).toBe(false);
  });

  it('getLifterRivals returns lifters in the same eq+class+sex with closest GL', async () => {
    const rivals = await getLifterRivals(t.db, jesusId, { limit: 5 });
    expect(rivals.length).toBeGreaterThan(0);
    expect(rivals[0].slug).toBe('rival-shw-m');
    expect(Number(rivals[0].bestGl)).toBeCloseTo(133.8, 1);
  });
});

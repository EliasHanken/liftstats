import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { recomputeFlightSizes } from '@/lib/ingest/opl/flight';
import { lifter, meet, entry } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('recomputeFlightSizes', () => {
  let t: TestDb;
  beforeAll(async () => { t = await createTestDb(); });
  afterAll(async () => { await t.close(); });

  it('sets flight_size to count of (meet, equipment, class, sex) peers', async () => {
    // 3 lifters, all at one meet, same equipment+class, all male => flight_size=3
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'flight-test', federation: 'IPF',
      date: '2024-05-01', name: 'FlightTest',
    }).returning();
    const lifters = await t.db.insert(lifter).values([
      { slug: 'a-m', name: 'A', sex: 'M' },
      { slug: 'b-m', name: 'B', sex: 'M' },
      { slug: 'c-m', name: 'C', sex: 'M' },
      { slug: 'd-f', name: 'D', sex: 'F' }, // different sex → flight of 1
    ]).returning();
    await t.db.insert(entry).values([
      { lifterId: lifters[0].id, meetId: m.id, equipment: 'Raw', weightClassKg: '83' },
      { lifterId: lifters[1].id, meetId: m.id, equipment: 'Raw', weightClassKg: '83' },
      { lifterId: lifters[2].id, meetId: m.id, equipment: 'Raw', weightClassKg: '83' },
      { lifterId: lifters[3].id, meetId: m.id, equipment: 'Raw', weightClassKg: '83' },
    ]);

    await recomputeFlightSizes(t.db);

    const aEntry = await t.db.select().from(entry).where(eq(entry.lifterId, lifters[0].id));
    expect(aEntry[0].flightSize).toBe(3);
    const dEntry = await t.db.select().from(entry).where(eq(entry.lifterId, lifters[3].id));
    expect(dEntry[0].flightSize).toBe(1);
  });
});

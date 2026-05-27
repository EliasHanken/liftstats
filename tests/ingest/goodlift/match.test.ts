import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { findMeetByListing, findEntryForLifter } from '@/lib/ingest/goodlift/match';
import { lifter, meet, entry } from '@/lib/db/schema';

describe('GoodLift matchers', () => {
  let t: TestDb;
  let worldClassicMeetId: number;

  beforeAll(async () => {
    t = await createTestDb();
    const [l] = await t.db.insert(lifter).values({
      slug: 'campano-diaz-ivan', name: 'Ivan Campano Diaz', sex: 'M', country: 'ESP',
    }).returning();
    const [m] = await t.db.insert(meet).values({
      source: 'opl',
      sourceMeetId: 'opl-cid-x',
      federation: 'IPF',
      date: '2024-09-09',
      // OPL's name form: no IPF prefix, no gender.
      name: 'World Open Classic Powerlifting Championships',
      country: 'USA',
    }).returning();
    worldClassicMeetId = m.id;
    await t.db.insert(entry).values({
      lifterId: l.id, meetId: m.id, equipment: 'Raw', weightClassKg: '59',
      place: 2, totalKg: '637.5', glPoints: '105.65',
    });
  });
  afterAll(async () => { await t.close(); });

  it('matches when GoodLift name has IPF prefix and gender qualifier', async () => {
    const found = await findMeetByListing(t.db, {
      cid: 1046,
      federation: 'International Powerlifting Federation',
      name: "IPF World Men's Classic Open Powerlifting Championships",
      date: '2024-09-09',
      country: null, town: null,
    });
    expect(found?.id).toBe(worldClassicMeetId);
  });

  it('matches when word order differs', async () => {
    const found = await findMeetByListing(t.db, {
      cid: 1046,
      federation: 'International Powerlifting Federation',
      name: 'World Classic Open Powerlifting Championships',  // "Classic Open" not "Open Classic"
      date: '2024-09-09',
      country: null, town: null,
    });
    expect(found?.id).toBe(worldClassicMeetId);
  });

  it('matches within a 3-day date window', async () => {
    const found = await findMeetByListing(t.db, {
      cid: 1046,
      federation: 'International Powerlifting Federation',
      name: 'World Open Classic Powerlifting Championships',
      date: '2024-09-10',  // 1 day after OPL's record
      country: null, town: null,
    });
    expect(found?.id).toBe(worldClassicMeetId);
  });

  it('returns null when names are unrelated', async () => {
    const found = await findMeetByListing(t.db, {
      cid: 9999,
      federation: 'International Powerlifting Federation',
      name: 'World Junior Equipped Powerlifting Championships',
      date: '2024-09-09',
      country: null, town: null,
    });
    expect(found).toBeNull();
  });

  it('returns null when federation is not whitelisted', async () => {
    const found = await findMeetByListing(t.db, {
      cid: 9999,
      federation: 'Asian Powerlifting Federation',
      name: 'Some Random Meet',
      date: '2023-01-01',
      country: null, town: null,
    });
    expect(found).toBeNull();
  });

  it('findEntryForLifter matches by (meet_id, weight_class, place)', async () => {
    const found = await findEntryForLifter(t.db, worldClassicMeetId, {
      weightClassKg: '-59',
      place: 2,
    });
    expect(found?.id).toBeGreaterThan(0);
  });

  it('findEntryForLifter normalizes "-59" and "59" to match either', async () => {
    const a = await findEntryForLifter(t.db, worldClassicMeetId, { weightClassKg: '-59', place: 2 });
    const b = await findEntryForLifter(t.db, worldClassicMeetId, { weightClassKg: '59', place: 2 });
    expect(a?.id).toBe(b?.id);
  });

  it('findEntryForLifter returns null when place does not match', async () => {
    const found = await findEntryForLifter(t.db, worldClassicMeetId, {
      weightClassKg: '-59',
      place: 99,
    });
    expect(found).toBeNull();
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, type TestDb } from '@/lib/test/db';
import { upsertAttempts, markMeetHasAttempts } from '@/lib/ingest/goodlift/upsert';
import { lifter, meet, entry, attempt } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ParsedAttempt } from '@/lib/ingest/goodlift/types';

const NINE: ParsedAttempt[] = [
  { lift: 'SQ', attemptNo: 1, weightKg: 200, result: 'good' },
  { lift: 'SQ', attemptNo: 2, weightKg: 210, result: 'good' },
  { lift: 'SQ', attemptNo: 3, weightKg: 215, result: 'good' },
  { lift: 'BP', attemptNo: 1, weightKg: 137.5, result: 'good' },
  { lift: 'BP', attemptNo: 2, weightKg: 142.5, result: 'good' },
  { lift: 'BP', attemptNo: 3, weightKg: 147.5, result: 'good' },
  { lift: 'DL', attemptNo: 1, weightKg: 247.5, result: 'good' },
  { lift: 'DL', attemptNo: 2, weightKg: 265, result: 'good' },
  { lift: 'DL', attemptNo: 3, weightKg: 275, result: 'no_lift' },
];

describe('upsert attempts', () => {
  let t: TestDb;
  let entryId: number;
  let meetId: number;

  beforeAll(async () => {
    t = await createTestDb();
    const [l] = await t.db.insert(lifter).values({ slug: 'x', name: 'X', sex: 'M' }).returning();
    const [m] = await t.db.insert(meet).values({
      source: 'opl', sourceMeetId: 'opl-test', federation: 'IPF',
      date: '2024-09-09', name: 'Test',
    }).returning();
    meetId = m.id;
    const [e] = await t.db.insert(entry).values({
      lifterId: l.id, meetId: m.id, equipment: 'Raw', weightClassKg: '59', place: 1,
    }).returning();
    entryId = e.id;
  });
  afterAll(async () => { await t.close(); });

  it('inserts 9 attempts for an entry', async () => {
    const n = await upsertAttempts(t.db, entryId, NINE);
    expect(n).toBe(9);
    const rows = await t.db.select().from(attempt).where(eq(attempt.entryId, entryId));
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.result === 'good')).toHaveLength(8);
    expect(rows.filter((r) => r.result === 'no_lift')).toHaveLength(1);
  });

  it('re-running replaces existing attempts (no duplicates)', async () => {
    await upsertAttempts(t.db, entryId, NINE);
    await upsertAttempts(t.db, entryId, NINE);
    const rows = await t.db.select().from(attempt).where(eq(attempt.entryId, entryId));
    expect(rows).toHaveLength(9);
  });

  it('markMeetHasAttempts flips meet.has_attempts to true', async () => {
    await markMeetHasAttempts(t.db, meetId);
    const m = await t.db.select().from(meet).where(eq(meet.id, meetId));
    expect(m[0].hasAttempts).toBe(true);
  });
});

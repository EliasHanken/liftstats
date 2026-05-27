import { eq, sql } from 'drizzle-orm';
import { attempt, meet } from '@/lib/db/schema';
import type { ParsedAttempt } from './types';

type AnyDb = any;

export async function upsertAttempts(
  db: AnyDb,
  entryId: number,
  attempts: ParsedAttempt[],
): Promise<number> {
  if (attempts.length === 0) return 0;

  const values = attempts.map((a) => ({
    entryId,
    lift: a.lift,
    attemptNo: a.attemptNo,
    weightKg: a.weightKg.toString(),
    result: a.result,
  }));

  await db
    .insert(attempt)
    .values(values)
    .onConflictDoUpdate({
      target: [attempt.entryId, attempt.lift, attempt.attemptNo],
      set: {
        weightKg: sql`excluded.weight_kg`,
        result: sql`excluded.result`,
      },
    });

  return attempts.length;
}

export async function markMeetHasAttempts(db: AnyDb, meetId: number): Promise<void> {
  await db.update(meet).set({ hasAttempts: true }).where(eq(meet.id, meetId));
}

import { sql } from 'drizzle-orm';

type AnyDb = any;

export type LiftAttempts = {
  a1: { good: number; total: number };
  a2: { good: number; total: number };
  a3: { good: number; total: number };
};

export type AttemptSuccess = {
  meetCount: number;
  SQ: LiftAttempts;
  BP: LiftAttempts;
  DL: LiftAttempts;
};

function emptyLift(): LiftAttempts {
  return {
    a1: { good: 0, total: 0 },
    a2: { good: 0, total: 0 },
    a3: { good: 0, total: 0 },
  };
}

export async function getAttemptSuccessForLifter(
  db: AnyDb,
  lifterId: number,
): Promise<AttemptSuccess> {
  const result = await db.execute(sql`
    WITH lifter_attempts AS (
      SELECT a.lift, a.attempt_no, a.result, e.meet_id
      FROM attempt a
      JOIN entry e ON e.id = a.entry_id
      WHERE e.lifter_id = ${lifterId}
    )
    SELECT
      lift,
      attempt_no,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE result = 'good')::int AS good,
      (SELECT COUNT(DISTINCT meet_id)::int FROM lifter_attempts) AS meet_count
    FROM lifter_attempts
    GROUP BY lift, attempt_no
  `);
  const rows = (result as any).rows ?? result;

  const out: AttemptSuccess = {
    meetCount: 0,
    SQ: emptyLift(),
    BP: emptyLift(),
    DL: emptyLift(),
  };
  for (const row of rows) {
    out.meetCount = row.meet_count;
    const lift = out[row.lift as 'SQ' | 'BP' | 'DL'];
    const slot = (`a${row.attempt_no}` as 'a1' | 'a2' | 'a3');
    lift[slot] = { good: row.good, total: row.total };
  }
  return out;
}

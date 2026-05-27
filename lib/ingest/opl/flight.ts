import { sql } from 'drizzle-orm';

type AnyDb = {
  execute: (q: any) => Promise<any>;
};

// Recompute flight_size for every entry based on its (meet, equipment, weight_class, sex) peer group.
// sex is denormalized through a join to lifter at compute time.
export async function recomputeFlightSizes(db: AnyDb): Promise<void> {
  await db.execute(sql`
    WITH peer_counts AS (
      SELECT e.id, COUNT(*) OVER (
        PARTITION BY e.meet_id, e.equipment, e.weight_class_kg, l.sex
      ) AS cnt
      FROM entry e
      JOIN lifter l ON l.id = e.lifter_id
    )
    UPDATE entry
    SET flight_size = peer_counts.cnt
    FROM peer_counts
    WHERE entry.id = peer_counts.id
  `);
}

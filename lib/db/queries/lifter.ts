import { desc, eq, sql } from 'drizzle-orm';
import { lifter, meet, entry } from '@/lib/db/schema';

type AnyDb = any;

export type LifterRow = {
  id: number;
  slug: string;
  name: string;
  sex: 'M' | 'F' | 'Mx';
  country: string | null;
  primaryFed: string | null;
  birthYear: number | null;
};

export async function getLifterBySlug(db: AnyDb, slug: string): Promise<LifterRow | null> {
  const rows = await db
    .select()
    .from(lifter)
    .where(eq(lifter.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export type MeetRow = {
  entryId: number;
  meetId: number;
  date: string;
  meetName: string;
  federation: string;
  country: string | null;
  town: string | null;
  equipment: 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';
  weightClassKg: string;
  bodyweightKg: string | null;
  bestSqKg: string | null;
  bestBpKg: string | null;
  bestDlKg: string | null;
  totalKg: string | null;
  place: number | null;
  glPoints: string | null;
  flightSize: number | null;
  hasAttempts: boolean;
};

export async function getLifterMeets(db: AnyDb, lifterId: number): Promise<MeetRow[]> {
  const rows = await db
    .select({
      entryId: entry.id,
      meetId: meet.id,
      date: meet.date,
      meetName: meet.name,
      federation: meet.federation,
      country: meet.country,
      town: meet.town,
      hasAttempts: meet.hasAttempts,
      equipment: entry.equipment,
      weightClassKg: entry.weightClassKg,
      bodyweightKg: entry.bodyweightKg,
      bestSqKg: entry.bestSqKg,
      bestBpKg: entry.bestBpKg,
      bestDlKg: entry.bestDlKg,
      totalKg: entry.totalKg,
      place: entry.place,
      glPoints: entry.glPoints,
      flightSize: entry.flightSize,
    })
    .from(entry)
    .innerJoin(meet, eq(meet.id, entry.meetId))
    .where(eq(entry.lifterId, lifterId))
    .orderBy(desc(meet.date));
  return rows;
}

export type LifterAggregates = {
  totalMeets: number;
  bestRawGl: string | null;
  bestEqGl: string | null;
  hasBothDisciplines: boolean;
  bestTotal: string | null;
  bestSq: string | null;
  bestBp: string | null;
  bestDl: string | null;
};

export async function getLifterAggregates(db: AnyDb, lifterId: number): Promise<LifterAggregates> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total_meets,
      MAX(CASE WHEN equipment = 'Raw' THEN gl_points END) AS best_raw_gl,
      MAX(CASE WHEN equipment IN ('Single', 'Multi', 'Wraps', 'Unlimited') THEN gl_points END) AS best_eq_gl,
      MAX(total_kg) AS best_total,
      MAX(best_sq_kg) AS best_sq,
      MAX(best_bp_kg) AS best_bp,
      MAX(best_dl_kg) AS best_dl,
      BOOL_OR(equipment = 'Raw') AND BOOL_OR(equipment <> 'Raw') AS has_both
    FROM entry
    WHERE lifter_id = ${lifterId}
  `);
  const row = ((result as any).rows ?? result)[0];
  return {
    totalMeets: Number(row.total_meets ?? 0),
    bestRawGl: row.best_raw_gl,
    bestEqGl: row.best_eq_gl,
    hasBothDisciplines: row.has_both === true || row.has_both === 't',
    bestTotal: row.best_total,
    bestSq: row.best_sq,
    bestBp: row.best_bp,
    bestDl: row.best_dl,
  };
}

export type RivalRow = {
  slug: string;
  name: string;
  bestGl: string;
  equipment: 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';
  weightClassKg: string;
};

export async function getLifterRivals(
  db: AnyDb,
  lifterId: number,
  { limit = 5 }: { limit?: number } = {},
): Promise<RivalRow[]> {
  // Find this lifter's strongest entry, then find other lifters who competed
  // in the same (equipment, weight_class, sex) with the closest GL points.
  const result = await db.execute(sql`
    WITH me AS (
      SELECT e.equipment, e.weight_class_kg, l.sex, e.gl_points
      FROM entry e
      JOIN lifter l ON l.id = e.lifter_id
      WHERE e.lifter_id = ${lifterId} AND e.gl_points IS NOT NULL
      ORDER BY e.gl_points DESC NULLS LAST
      LIMIT 1
    ),
    rivals AS (
      SELECT
        l.slug,
        l.name,
        e.equipment,
        e.weight_class_kg,
        MAX(e.gl_points) AS best_gl
      FROM entry e
      JOIN lifter l ON l.id = e.lifter_id
      CROSS JOIN me
      WHERE e.equipment = me.equipment
        AND e.weight_class_kg = me.weight_class_kg
        AND l.sex = me.sex
        AND e.lifter_id <> ${lifterId}
        AND e.gl_points IS NOT NULL
      GROUP BY l.slug, l.name, e.equipment, e.weight_class_kg
    )
    SELECT rivals.slug, rivals.name, rivals.best_gl AS "bestGl",
           rivals.equipment, rivals.weight_class_kg AS "weightClassKg"
    FROM rivals
    CROSS JOIN me
    ORDER BY ABS(rivals.best_gl - me.gl_points) ASC
    LIMIT ${limit}
  `);
  return ((result as any).rows ?? result) as RivalRow[];
}

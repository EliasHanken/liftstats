import { sql } from 'drizzle-orm';

type AnyDb = any;

export type FeaturedLifter = {
  slug: string;
  name: string;
  sex: 'M' | 'F' | 'Mx';
  country: string | null;
  bestGl: string;
  equipment: 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';
};

export type FeaturedArgs = { limit?: number };

export async function getFeaturedLifters(
  db: AnyDb,
  { limit = 6 }: FeaturedArgs = {},
): Promise<FeaturedLifter[]> {
  // One row per lifter: their single best (gl_points, equipment) tuple.
  // DISTINCT ON gives us the top entry per lifter; outer ORDER ranks them globally.
  const result = await db.execute(sql`
    SELECT slug, name, sex, country, "bestGl", equipment FROM (
      SELECT DISTINCT ON (l.id)
        l.slug, l.name, l.sex, l.country,
        e.gl_points AS "bestGl",
        e.equipment
      FROM lifter l
      JOIN entry e ON e.lifter_id = l.id
      WHERE e.gl_points IS NOT NULL
      ORDER BY l.id, e.gl_points DESC
    ) ranked
    ORDER BY "bestGl"::numeric DESC
    LIMIT ${limit}
  `);
  const rows = (result as any).rows ?? result;
  return rows as FeaturedLifter[];
}

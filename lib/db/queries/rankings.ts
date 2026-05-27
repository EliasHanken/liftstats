import { sql } from 'drizzle-orm';

type AnyDb = any;

export type LeaderboardLift = 'sq' | 'bp' | 'dl' | 'total' | 'gl';
export type LeaderboardSex = 'M' | 'F' | 'Mx';
export type LeaderboardEquipment = 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';

export type LeaderboardFilters = {
  lift?: LeaderboardLift;
  sex?: LeaderboardSex;
  equipment?: LeaderboardEquipment;
  weightClassKg?: string;
  ageClass?: string;
  federation?: string;
  country?: string;
  tested?: boolean;
  sinceYear?: number;
  division?: string;
  limit?: number;
};

export type LeaderboardRow = {
  slug: string;
  name: string;
  sex: LeaderboardSex;
  country: string | null;
  equipment: LeaderboardEquipment;
  weightClassKg: string;
  bodyweightKg: string | null;
  bestSqKg: string | null;
  bestBpKg: string | null;
  bestDlKg: string | null;
  totalKg: string | null;
  glPoints: string | null;
  tested: boolean | null;
  meetDate: string;
  meetName: string;
  federation: string;
};

const LIFT_COL: Record<LeaderboardLift, string> = {
  sq: 'best_sq_kg',
  bp: 'best_bp_kg',
  dl: 'best_dl_kg',
  total: 'total_kg',
  gl: 'gl_points',
};

const LIFT_ALIAS: Record<LeaderboardLift, string> = {
  sq: 'bestSqKg',
  bp: 'bestBpKg',
  dl: 'bestDlKg',
  total: 'totalKg',
  gl: 'glPoints',
};

export async function getLeaderboard(
  db: AnyDb,
  filters: LeaderboardFilters = {},
): Promise<LeaderboardRow[]> {
  const { lift = 'gl', limit = 100 } = filters;
  const sortCol = LIFT_COL[lift];
  const sortAlias = LIFT_ALIAS[lift];
  if (!sortCol) throw new Error(`Invalid lift filter: ${lift}`);

  const where: any[] = [sql`${sql.raw(sortCol)} IS NOT NULL`];
  if (filters.sex)             where.push(sql`l.sex = ${filters.sex}`);
  if (filters.equipment)       where.push(sql`e.equipment = ${filters.equipment}`);
  if (filters.weightClassKg)   where.push(sql`e.weight_class_kg = ${filters.weightClassKg}`);
  if (filters.ageClass)        where.push(sql`e.age_class = ${filters.ageClass}`);
  if (filters.federation)      where.push(sql`m.federation = ${filters.federation}`);
  if (filters.country)         where.push(sql`l.country = ${filters.country}`);
  if (filters.tested !== undefined) where.push(sql`e.tested = ${filters.tested}`);
  if (filters.sinceYear)       where.push(sql`m.date >= ${`${filters.sinceYear}-01-01`}`);
  if (filters.division)        where.push(sql`e.division = ${filters.division}`);

  const whereSql = sql.join(where, sql` AND `);

  const result = await db.execute(sql`
    SELECT slug, name, sex, country, equipment, "weightClassKg", "bodyweightKg",
           "bestSqKg", "bestBpKg", "bestDlKg", "totalKg", "glPoints", tested,
           "meetDate", "meetName", federation FROM (
      SELECT DISTINCT ON (l.id)
        l.slug, l.name, l.sex, l.country,
        e.equipment,
        e.weight_class_kg AS "weightClassKg",
        e.bodyweight_kg   AS "bodyweightKg",
        e.best_sq_kg      AS "bestSqKg",
        e.best_bp_kg      AS "bestBpKg",
        e.best_dl_kg      AS "bestDlKg",
        e.total_kg        AS "totalKg",
        e.gl_points       AS "glPoints",
        e.tested,
        m.date            AS "meetDate",
        m.name            AS "meetName",
        m.federation
      FROM entry e
      JOIN lifter l ON l.id = e.lifter_id
      JOIN meet   m ON m.id = e.meet_id
      WHERE ${whereSql}
      ORDER BY l.id, ${sql.raw(sortCol)} DESC NULLS LAST
    ) ranked
    ORDER BY ${sql.raw(`"${sortAlias}"`)}::numeric DESC NULLS LAST
    LIMIT ${limit}
  `);

  const rows = (result as any).rows ?? result;
  return rows as LeaderboardRow[];
}

import { sql } from 'drizzle-orm';

type AnyDb = any;

export type ActiveOpts = { activeSince?: string; ageClass?: string; division?: string };

export type CountryListRow = { country: string; lifters: number };

export async function getCountryList(
  db: AnyDb,
  { activeSince, limit = 40 }: ActiveOpts & { limit?: number } = {},
): Promise<CountryListRow[]> {
  const dateFilter = activeSince ? sql`AND m.date >= ${activeSince}` : sql``;
  const result = await db.execute(sql`
    SELECT l.country AS country, COUNT(DISTINCT l.id)::int AS lifters
    FROM lifter l
    JOIN entry e ON e.lifter_id = l.id
    JOIN meet  m ON m.id = e.meet_id
    WHERE l.country IS NOT NULL ${dateFilter}
    GROUP BY l.country
    ORDER BY lifters DESC
    LIMIT ${limit}
  `);
  return ((result as any).rows ?? result) as CountryListRow[];
}

export type CountryStats = {
  totalLifters: number;
  rawLifters: number;
  eqLifters: number;
  bothLifters: number;
  men: number;
  women: number;
};

export async function getCountryStats(
  db: AnyDb,
  country: string,
  { activeSince, ageClass, division }: ActiveOpts = {},
): Promise<CountryStats> {
  const dateFilter = activeSince ? sql`AND m.date >= ${activeSince}` : sql``;
  const ageFilter = ageClass ? sql`AND e.age_class = ${ageClass}` : sql``;
  const divisionFilter = division ? sql`AND e.division = ${division}` : sql``;
  const result = await db.execute(sql`
    WITH active AS (
      SELECT
        l.id, l.sex,
        BOOL_OR(e.equipment = 'Raw') AS has_raw,
        BOOL_OR(e.equipment IN ('Single','Multi','Wraps','Unlimited')) AS has_eq
      FROM lifter l
      JOIN entry e ON e.lifter_id = l.id
      JOIN meet  m ON m.id = e.meet_id
      WHERE l.country = ${country} ${dateFilter}
        ${ageFilter}
        ${divisionFilter}
      GROUP BY l.id, l.sex
    )
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE has_raw)::int AS raw_lifters,
      COUNT(*) FILTER (WHERE has_eq)::int AS eq_lifters,
      COUNT(*) FILTER (WHERE has_raw AND has_eq)::int AS both_lifters,
      COUNT(*) FILTER (WHERE sex = 'M')::int AS men,
      COUNT(*) FILTER (WHERE sex = 'F')::int AS women
    FROM active
  `);
  const row = ((result as any).rows ?? result)[0] ?? {};
  return {
    totalLifters: row.total ?? 0,
    rawLifters:   row.raw_lifters ?? 0,
    eqLifters:    row.eq_lifters ?? 0,
    bothLifters:  row.both_lifters ?? 0,
    men:          row.men ?? 0,
    women:        row.women ?? 0,
  };
}

export type GlBin = {
  low: number;
  high: number;
  mRaw: number;
  mEq: number;
  fRaw: number;
  fEq: number;
};

export type GlDistribution = { bins: GlBin[] };

export async function getGlDistribution(
  db: AnyDb,
  country: string,
  { activeSince, ageClass, division }: ActiveOpts = {},
): Promise<GlDistribution> {
  const dateFilter = activeSince ? sql`AND m.date >= ${activeSince}` : sql``;
  const ageFilter = ageClass ? sql`AND e.age_class = ${ageClass}` : sql``;
  const divisionFilter = division ? sql`AND e.division = ${division}` : sql``;
  const result = await db.execute(sql`
    WITH binned AS (
      SELECT
        l.sex,
        CASE WHEN e.equipment = 'Raw' THEN 'raw' ELSE 'eq' END AS eq_class,
        FLOOR(e.gl_points::numeric / 10) * 10 AS bin_low
      FROM lifter l
      JOIN entry e ON e.lifter_id = l.id
      JOIN meet  m ON m.id = e.meet_id
      WHERE l.country = ${country}
        AND e.gl_points IS NOT NULL
        ${dateFilter}
        ${ageFilter}
        ${divisionFilter}
    )
    SELECT bin_low::int AS low, sex, eq_class, COUNT(*)::int AS n
    FROM binned
    GROUP BY bin_low, sex, eq_class
    ORDER BY bin_low
  `);
  const rows = (result as any).rows ?? result;
  const bins: GlBin[] = [];
  for (let low = 0; low < 200; low += 10) {
    bins.push({ low, high: low + 10, mRaw: 0, mEq: 0, fRaw: 0, fEq: 0 });
  }
  const idx = (low: number) => Math.floor(low / 10);
  for (const r of rows) {
    const i = idx(r.low);
    if (i < 0 || i >= bins.length) continue;
    const isM = r.sex === 'M';
    const isRaw = r.eq_class === 'raw';
    if (isM && isRaw)       bins[i].mRaw += r.n;
    else if (isM && !isRaw) bins[i].mEq  += r.n;
    else if (!isM && isRaw) bins[i].fRaw += r.n;
    else                    bins[i].fEq  += r.n;
  }
  return { bins };
}

export type TopRow = {
  slug: string;
  name: string;
  sex: 'M' | 'F' | 'Mx';
  bestGl: string;
  equipment: 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';
  weightClassKg: string;
};

export type TopByDiscipline = { raw: TopRow[]; eq: TopRow[] };

export async function getTopByDiscipline(
  db: AnyDb,
  country: string,
  { activeSince, ageClass, division, limit = 10 }: ActiveOpts & { limit?: number } = {},
): Promise<TopByDiscipline> {
  const dateFilter = activeSince ? sql`AND m.date >= ${activeSince}` : sql``;
  const ageFilter = ageClass ? sql`AND e.age_class = ${ageClass}` : sql``;
  const divisionFilter = division ? sql`AND e.division = ${division}` : sql``;
  const raw = await db.execute(sql`
    SELECT slug, name, sex, "bestGl", equipment, "weightClassKg" FROM (
      SELECT DISTINCT ON (l.id)
        l.slug, l.name, l.sex,
        e.gl_points AS "bestGl",
        e.equipment,
        e.weight_class_kg AS "weightClassKg"
      FROM lifter l
      JOIN entry e ON e.lifter_id = l.id
      JOIN meet  m ON m.id = e.meet_id
      WHERE l.country = ${country}
        AND e.equipment = 'Raw'
        AND e.gl_points IS NOT NULL
        ${dateFilter}
        ${ageFilter}
        ${divisionFilter}
      ORDER BY l.id, e.gl_points DESC
    ) ranked
    ORDER BY "bestGl"::numeric DESC
    LIMIT ${limit}
  `);
  const eq = await db.execute(sql`
    SELECT slug, name, sex, "bestGl", equipment, "weightClassKg" FROM (
      SELECT DISTINCT ON (l.id)
        l.slug, l.name, l.sex,
        e.gl_points AS "bestGl",
        e.equipment,
        e.weight_class_kg AS "weightClassKg"
      FROM lifter l
      JOIN entry e ON e.lifter_id = l.id
      JOIN meet  m ON m.id = e.meet_id
      WHERE l.country = ${country}
        AND e.equipment IN ('Single','Multi','Wraps','Unlimited')
        AND e.gl_points IS NOT NULL
        ${dateFilter}
        ${ageFilter}
        ${divisionFilter}
      ORDER BY l.id, e.gl_points DESC
    ) ranked
    ORDER BY "bestGl"::numeric DESC
    LIMIT ${limit}
  `);
  return {
    raw: ((raw as any).rows ?? raw) as TopRow[],
    eq:  ((eq  as any).rows ?? eq)  as TopRow[],
  };
}

export type HeatmapCell = {
  sex: 'M' | 'F' | 'Mx';
  equipment: 'Raw' | 'Wraps' | 'Single' | 'Multi' | 'Unlimited';
  weightClassKg: string;
  lifters: number;
};

export async function getWeightClassDistribution(
  db: AnyDb,
  country: string,
  { activeSince, ageClass, division }: ActiveOpts = {},
): Promise<HeatmapCell[]> {
  const dateFilter = activeSince ? sql`AND m.date >= ${activeSince}` : sql``;
  const ageFilter = ageClass ? sql`AND e.age_class = ${ageClass}` : sql``;
  const divisionFilter = division ? sql`AND e.division = ${division}` : sql``;
  const result = await db.execute(sql`
    SELECT l.sex, e.equipment, e.weight_class_kg AS "weightClassKg",
           COUNT(DISTINCT l.id)::int AS lifters
    FROM lifter l
    JOIN entry e ON e.lifter_id = l.id
    JOIN meet  m ON m.id = e.meet_id
    WHERE l.country = ${country}
      ${dateFilter}
      ${ageFilter}
      ${divisionFilter}
    GROUP BY l.sex, e.equipment, e.weight_class_kg
    ORDER BY lifters DESC
  `);
  return ((result as any).rows ?? result) as HeatmapCell[];
}

export type EqRawDeltaRow = {
  slug: string;
  name: string;
  sex: 'M' | 'F' | 'Mx';
  rawGl: string;
  eqGl: string;
};

export async function getEqVsRawDeltaData(
  db: AnyDb,
  country: string,
  { activeSince, ageClass, division, limit = 200 }: ActiveOpts & { limit?: number } = {},
): Promise<EqRawDeltaRow[]> {
  const dateFilter = activeSince ? sql`AND m.date >= ${activeSince}` : sql``;
  const ageFilter = ageClass ? sql`AND e.age_class = ${ageClass}` : sql``;
  const divisionFilter = division ? sql`AND e.division = ${division}` : sql``;
  const result = await db.execute(sql`
    SELECT
      l.slug, l.name, l.sex,
      MAX(CASE WHEN e.equipment = 'Raw' THEN e.gl_points::numeric END) AS "rawGl",
      MAX(CASE WHEN e.equipment IN ('Single','Multi','Wraps','Unlimited') THEN e.gl_points::numeric END) AS "eqGl"
    FROM lifter l
    JOIN entry e ON e.lifter_id = l.id
    JOIN meet  m ON m.id = e.meet_id
    WHERE l.country = ${country}
      AND e.gl_points IS NOT NULL
      ${dateFilter}
      ${ageFilter}
      ${divisionFilter}
    GROUP BY l.slug, l.name, l.sex
    HAVING
      MAX(CASE WHEN e.equipment = 'Raw' THEN 1 ELSE 0 END) = 1
      AND MAX(CASE WHEN e.equipment IN ('Single','Multi','Wraps','Unlimited') THEN 1 ELSE 0 END) = 1
    ORDER BY MAX(e.gl_points::numeric) DESC
    LIMIT ${limit}
  `);
  return ((result as any).rows ?? result) as EqRawDeltaRow[];
}

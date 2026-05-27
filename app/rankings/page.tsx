import { db } from '@/lib/db';
import { getLeaderboard, type LeaderboardFilters, type LeaderboardLift, type LeaderboardSex, type LeaderboardEquipment } from '@/lib/db/queries/rankings';
import { RankingsFilters } from '@/components/rankings/RankingsFilters';
import { RankingsTable } from '@/components/rankings/RankingsTable';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Search = { searchParams: Promise<Record<string, string | undefined>> };

const ALLOWED_LIFTS: Set<LeaderboardLift> = new Set(['sq', 'bp', 'dl', 'total', 'gl']);
const ALLOWED_SEX: Set<LeaderboardSex> = new Set(['M', 'F', 'Mx']);
const ALLOWED_EQ: Set<LeaderboardEquipment> = new Set(['Raw', 'Wraps', 'Single', 'Multi', 'Unlimited']);

function parseFilters(sp: Record<string, string | undefined>): LeaderboardFilters {
  const out: LeaderboardFilters = { limit: 100 };
  const lift = sp.lift as LeaderboardLift | undefined;
  if (lift && ALLOWED_LIFTS.has(lift)) out.lift = lift;
  else out.lift = 'gl';
  const sex = sp.sex as LeaderboardSex | undefined;
  if (sex && ALLOWED_SEX.has(sex)) out.sex = sex;
  const eq = sp.eq as LeaderboardEquipment | undefined;
  if (eq && ALLOWED_EQ.has(eq)) out.equipment = eq;
  else if (sp.eq === undefined) out.equipment = 'Raw';
  if (sp.class) out.weightClassKg = sp.class;
  if (sp.age) out.ageClass = sp.age;
  if (sp.fed) out.federation = sp.fed;
  if (sp.country) out.country = sp.country;
  if (sp.division) out.division = sp.division;
  if (sp.tested === 'true') out.tested = true;
  else if (sp.tested === 'false') out.tested = false;
  if (sp.since && /^\d{4}$/.test(sp.since)) out.sinceYear = parseInt(sp.since, 10);
  return out;
}

async function loadDropdownData() {
  const wc = await db.execute(sql`
    SELECT weight_class_kg AS w, COUNT(*) AS n
    FROM entry WHERE weight_class_kg IS NOT NULL
    GROUP BY weight_class_kg ORDER BY n DESC LIMIT 20
  `);
  const { getFederationsForFilter } = await import('@/lib/db/queries/federations');
  const federations = await getFederationsForFilter(db, { limit: 30 });
  const ctry = await db.execute(sql`
    SELECT country AS c, COUNT(*) AS n
    FROM lifter WHERE country IS NOT NULL
    GROUP BY country ORDER BY n DESC LIMIT 40
  `);
  return {
    weightClasses: ((wc as any).rows ?? wc).map((r: any) => r.w).filter(Boolean),
    federations,
    countries:     ((ctry as any).rows ?? ctry).map((r: any) => r.c).filter(Boolean),
  };
}

export default async function RankingsPage({ searchParams }: Search) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [rows, dropdowns] = await Promise.all([
    getLeaderboard(db, filters),
    loadDropdownData(),
  ]);
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2">Rankings</h1>
        <p className="text-zinc-500 text-sm mb-8">Top lifters globally. Filter by sex, equipment, weight class, federation, country, drug-tested, year.</p>
        <RankingsFilters weightClasses={dropdowns.weightClasses} federations={dropdowns.federations} countries={dropdowns.countries} />
        <RankingsTable rows={rows} sortLift={filters.lift ?? 'gl'} />
      </div>
    </main>
  );
}

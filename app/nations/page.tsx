import { db } from '@/lib/db';
import {
  getCountryList, getCountryStats, getGlDistribution,
  getTopByDiscipline, getWeightClassDistribution, getEqVsRawDeltaData,
} from '@/lib/db/queries/nations';
import { getCountryAttemptSuccess } from '@/lib/db/queries/attempts';
import { CountryPicker } from '@/components/nations/CountryPicker';
import { PopulationSummary } from '@/components/nations/PopulationSummary';
import { GlDistributionChart } from '@/components/nations/GlDistributionChart';
import { CountryAttemptCard } from '@/components/nations/CountryAttemptCard';
import { TopByDiscipline } from '@/components/nations/TopByDiscipline';
import { WeightClassHeatmap } from '@/components/nations/WeightClassHeatmap';
import { EqVsRawDeltaScatter } from '@/components/nations/EqVsRawDeltaScatter';

export const dynamic = 'force-dynamic';

// Countries with more than this many active lifters skip the most expensive
// widgets (full GL distribution + dual-discipline scatter) because the
// aggregations exhaust Railway's free-tier shared memory. USA (~95k) is the
// only routine offender today; the limit gives us a safe margin.
const HEAVY_QUERY_THRESHOLD = 30_000;

function defaultSince(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

type Search = { searchParams: Promise<Record<string, string | undefined>> };

type CountryView = {
  country: string;
  stats: Awaited<ReturnType<typeof getCountryStats>>;
  top: Awaited<ReturnType<typeof getTopByDiscipline>>;
  heatmap: Awaited<ReturnType<typeof getWeightClassDistribution>>;
  attempt: Awaited<ReturnType<typeof getCountryAttemptSuccess>>;
  // Heavy widgets are nullable — omitted for very large countries.
  dist: Awaited<ReturnType<typeof getGlDistribution>> | null;
  delta: Awaited<ReturnType<typeof getEqVsRawDeltaData>> | null;
  trimmed: boolean;
};

async function loadCountryView(country: string, activeSince: string, ageClass?: string): Promise<CountryView> {
  const opts = { activeSince, ageClass };

  // Cheap first: get the size. We need this anyway, and it tells us whether
  // to skip the heavy widgets.
  const stats = await getCountryStats(db, country, opts);
  const heavy = stats.totalLifters > HEAVY_QUERY_THRESHOLD;

  const [top, heatmap, attempt, dist, delta] = await Promise.all([
    getTopByDiscipline(db, country, { ...opts, limit: 10 }),
    getWeightClassDistribution(db, country, opts),
    getCountryAttemptSuccess(db, country),
    heavy ? Promise.resolve(null) : getGlDistribution(db, country, opts),
    heavy ? Promise.resolve(null) : getEqVsRawDeltaData(db, country, { ...opts, limit: 200 }),
  ]);

  return { country, stats, top, heatmap, attempt, dist, delta, trimmed: heavy };
}

function CountrySection({ data }: { data: CountryView }) {
  return (
    <>
      <PopulationSummary country={data.country} stats={data.stats} />
      {data.trimmed && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-8 text-sm text-zinc-400">
          <strong className="text-zinc-200">{data.country}</strong> has {data.stats.totalLifters.toLocaleString()} active lifters —
          GL distribution and eq-vs-raw scatter are omitted to keep the page fast. Drill into smaller scopes (a federation or
          age class) for the full view.
        </div>
      )}
      {data.dist && <GlDistributionChart bins={data.dist.bins} />}
      <CountryAttemptCard data={data.attempt} />
      <TopByDiscipline data={data.top} />
      <WeightClassHeatmap cells={data.heatmap} />
      {data.delta && <EqVsRawDeltaScatter rows={data.delta} />}
    </>
  );
}

export default async function NationsPage({ searchParams }: Search) {
  const sp = await searchParams;
  const country = sp.country ?? '';
  const country2 = sp.country2 ?? '';
  const ageClass = sp.age && sp.age.length > 0 ? sp.age : undefined;
  const activeSince = (sp.since && /^\d{4}-\d{2}-\d{2}$/.test(sp.since)) ? sp.since : defaultSince();

  const countries = await getCountryList(db, { activeSince, limit: 60 });

  const primary  = country  ? await loadCountryView(country,  activeSince, ageClass) : null;
  const secondary = country2 && country2 !== country
    ? await loadCountryView(country2, activeSince, ageClass)
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-2">Nations</h1>
        <p className="text-zinc-500 text-sm mb-8">
          Country-level analytics. Active = at least one entry since {activeSince}.
        </p>
        <CountryPicker countries={countries} />

        {!primary && (
          <p className="text-zinc-500 text-sm">Pick a country above to begin.</p>
        )}

        {primary && !secondary && <CountrySection data={primary} />}

        {primary && secondary && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-50">{primary.country}</h2>
              <CountrySection data={primary} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-50">{secondary.country}</h2>
              <CountrySection data={secondary} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

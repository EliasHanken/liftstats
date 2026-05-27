import { db } from '@/lib/db';
import {
  getCountryList, getCountryStats, getGlDistribution,
  getTopByDiscipline, getWeightClassDistribution, getEqVsRawDeltaData,
} from '@/lib/db/queries/nations';
import { CountryPicker } from '@/components/nations/CountryPicker';
import { PopulationSummary } from '@/components/nations/PopulationSummary';
import { GlDistributionChart } from '@/components/nations/GlDistributionChart';
import { TopByDiscipline } from '@/components/nations/TopByDiscipline';
import { WeightClassHeatmap } from '@/components/nations/WeightClassHeatmap';
import { EqVsRawDeltaScatter } from '@/components/nations/EqVsRawDeltaScatter';

export const dynamic = 'force-dynamic';

function defaultSince(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

type Search = { searchParams: Promise<Record<string, string | undefined>> };

async function loadCountryView(country: string, activeSince: string) {
  const [stats, dist, top, heatmap, delta] = await Promise.all([
    getCountryStats(db, country, { activeSince }),
    getGlDistribution(db, country, { activeSince }),
    getTopByDiscipline(db, country, { activeSince, limit: 10 }),
    getWeightClassDistribution(db, country, { activeSince }),
    getEqVsRawDeltaData(db, country, { activeSince }),
  ]);
  return { country, stats, dist, top, heatmap, delta };
}

function CountrySection({ data }: { data: Awaited<ReturnType<typeof loadCountryView>> }) {
  return (
    <>
      <PopulationSummary country={data.country} stats={data.stats} />
      <GlDistributionChart bins={data.dist.bins} />
      <TopByDiscipline data={data.top} />
      <WeightClassHeatmap cells={data.heatmap} />
      <EqVsRawDeltaScatter rows={data.delta} />
    </>
  );
}

export default async function NationsPage({ searchParams }: Search) {
  const sp = await searchParams;
  const country = sp.country ?? '';
  const country2 = sp.country2 ?? '';
  const activeSince = (sp.since && /^\d{4}-\d{2}-\d{2}$/.test(sp.since)) ? sp.since : defaultSince();

  const countries = await getCountryList(db, { activeSince, limit: 60 });

  const primary  = country  ? await loadCountryView(country,  activeSince) : null;
  const secondary = country2 && country2 !== country
    ? await loadCountryView(country2, activeSince)
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

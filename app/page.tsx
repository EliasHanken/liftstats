import { db, schema } from '@/lib/db';
import { count, desc } from 'drizzle-orm';
import { getFeaturedLifters } from '@/lib/db/queries/featured';
import { SearchBox } from '@/components/search/SearchBox';

export const dynamic = 'force-static';
export const revalidate = 3600;

async function loadStats() {
  const [[liftersCount], [meetsCount], [entriesCount], lastRun, featured] = await Promise.all([
    db.select({ count: count() }).from(schema.lifter),
    db.select({ count: count() }).from(schema.meet),
    db.select({ count: count() }).from(schema.entry),
    db.select().from(schema.ingestRun).orderBy(desc(schema.ingestRun.startedAt)).limit(1),
    getFeaturedLifters(db, { limit: 6 }),
  ]);
  return {
    lifters: liftersCount.count,
    meets: meetsCount.count,
    entries: entriesCount.count,
    lastUpdated: lastRun[0]?.finishedAt ?? null,
    featured,
  };
}

export default async function HomePage() {
  const stats = await loadStats();
  const fmt = (n: number) => n.toLocaleString();

  // Strip extra fields the SearchBox doesn't need on its featured prop.
  const featured = stats.featured.map((f) => ({
    slug: f.slug,
    name: f.name,
    sex: f.sex,
    country: f.country,
    primaryFed: null,
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight mb-4">Liftstats</h1>
        <p className="text-zinc-400 text-lg mb-10">
          Powerlifting stats for every lifter in the OpenPowerlifting dataset.
          Equipped vs raw, attempt success, competitiveness — done right.
        </p>

        <div className="mb-12">
          <SearchBox
            placeholder="Search any lifter — name, surname, anything"
            featured={featured}
            size="lg"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <Stat label="Lifters" value={fmt(stats.lifters)} />
          <Stat label="Meets" value={fmt(stats.meets)} />
          <Stat label="Entries" value={fmt(stats.entries)} />
        </div>

        {stats.lastUpdated && (
          <p className="text-xs text-zinc-600">
            Last updated {new Date(stats.lastUpdated).toLocaleDateString()}.
          </p>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-zinc-50">{value}</div>
    </div>
  );
}

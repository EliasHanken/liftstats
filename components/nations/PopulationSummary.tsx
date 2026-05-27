import type { CountryStats } from '@/lib/db/queries/nations';

type Props = { country: string; stats: CountryStats };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
      <div className="text-xs uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-zinc-50">{value}</div>
    </div>
  );
}

export function PopulationSummary({ country, stats }: Props) {
  const fmt = (n: number) => n.toLocaleString();
  if (stats.totalLifters === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8 text-zinc-500 text-sm">
        No active lifters in <span className="text-zinc-300">{country}</span> for the selected window.
      </div>
    );
  }
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{country} · active lifters</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={fmt(stats.totalLifters)} />
        <Stat label="Raw" value={fmt(stats.rawLifters)} />
        <Stat label="Equipped" value={fmt(stats.eqLifters)} />
        <Stat label="Both" value={fmt(stats.bothLifters)} />
        <Stat label="Men" value={fmt(stats.men)} />
        <Stat label="Women" value={fmt(stats.women)} />
      </div>
    </section>
  );
}

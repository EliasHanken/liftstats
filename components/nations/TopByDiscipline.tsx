import Link from 'next/link';
import type { TopByDiscipline as TopByDisciplineData, TopRow } from '@/lib/db/queries/nations';

type Props = { data: TopByDisciplineData };

function fmtGl(s: string): string {
  return Number(s).toFixed(2);
}

function Column({ title, rows }: { title: string; rows: TopRow[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <h3 className="text-xs uppercase tracking-widest text-zinc-500 px-6 pt-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-zinc-500 text-sm px-6 py-4">No lifters under this filter.</p>
      ) : (
        <ol>
          {rows.map((r, i) => (
            <li key={r.slug} className="flex items-baseline gap-3 px-6 py-2 border-b border-zinc-900 last:border-0">
              <span className="text-zinc-500 text-xs tabular-nums w-6">{i + 1}</span>
              <Link href={`/lifter/${r.slug}`} className="text-zinc-100 hover:text-cyan-400 flex-1">
                {r.name}
              </Link>
              <span className="text-xs text-zinc-500">{r.sex} · {r.weightClassKg}</span>
              <span className="text-zinc-50 font-semibold tabular-nums">{fmtGl(r.bestGl)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TopByDiscipline({ data }: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Top by discipline</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Column title="Top Raw" rows={data.raw} />
        <Column title="Top Equipped" rows={data.eq} />
      </div>
    </section>
  );
}

import Link from 'next/link';
import type { RivalRow } from '@/lib/db/queries/lifter';

type Props = { rivals: RivalRow[]; myBestGl: string | null };

export function RivalsPanel({ rivals, myBestGl }: Props) {
  if (rivals.length === 0) return null;
  const me = myBestGl !== null ? Number(myBestGl) : null;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Closest rivals</h2>
      <ul className="space-y-2">
        {rivals.map((r) => {
          const rivalGl = Number(r.bestGl);
          const diff = me !== null ? rivalGl - me : null;
          return (
            <li key={r.slug} className="flex items-baseline gap-4 py-2 border-b border-zinc-900 last:border-0">
              <Link href={`/lifter/${r.slug}`} className="text-zinc-100 hover:text-cyan-400 flex-1">
                {r.name}
              </Link>
              <span className="text-xs text-zinc-500">{r.equipment} · {r.weightClassKg}</span>
              <span className="text-zinc-50 font-semibold tabular-nums">{rivalGl.toFixed(2)}</span>
              {diff !== null && (
                <span className={`text-xs tabular-nums ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

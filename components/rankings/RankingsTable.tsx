import Link from 'next/link';
import type { LeaderboardRow, LeaderboardLift } from '@/lib/db/queries/rankings';

type Props = {
  rows: LeaderboardRow[];
  sortLift: LeaderboardLift;
};

function fmt(s: string | null): string {
  if (s === null) return '—';
  return Number(s).toFixed(1);
}

function fmtGl(s: string | null): string {
  if (s === null) return '—';
  return Number(s).toFixed(2);
}

const LIFT_COL_LABEL: Record<LeaderboardLift, string> = {
  sq: 'Squat',
  bp: 'Bench',
  dl: 'Deadlift',
  total: 'Total',
  gl: 'GL Points',
};

export function RankingsTable({ rows, sortLift }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-zinc-500 text-sm">
        No lifters match those filters.
      </div>
    );
  }
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-3">#</th>
              <th className="text-left px-3 py-3">Lifter</th>
              <th className="text-left px-3 py-3">Country</th>
              <th className="text-left px-3 py-3">Eq</th>
              <th className="text-left px-3 py-3">Class</th>
              <th className="text-center px-3 py-3">Tested</th>
              <th className={`text-right px-3 py-3 ${sortLift === 'sq' ? 'text-cyan-400' : ''}`}>SQ</th>
              <th className={`text-right px-3 py-3 ${sortLift === 'bp' ? 'text-cyan-400' : ''}`}>BP</th>
              <th className={`text-right px-3 py-3 ${sortLift === 'dl' ? 'text-cyan-400' : ''}`}>DL</th>
              <th className={`text-right px-3 py-3 ${sortLift === 'total' ? 'text-cyan-400' : ''}`}>Total</th>
              <th className={`text-right px-3 py-3 ${sortLift === 'gl' ? 'text-cyan-400' : ''}`}>GL</th>
              <th className="text-right px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-800/30">
                <td className="px-6 py-3 text-zinc-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/lifter/${r.slug}`} className="text-zinc-50 hover:text-cyan-400">
                    {r.name}
                  </Link>
                  <span className="text-xs text-zinc-500 ml-2">{r.sex}</span>
                </td>
                <td className="px-3 py-3 text-zinc-400">{r.country ?? '—'}</td>
                <td className="px-3 py-3 text-zinc-400">{r.equipment}</td>
                <td className="px-3 py-3 text-zinc-400 tabular-nums">{r.weightClassKg}</td>
                <td className="px-3 py-3 text-center text-zinc-400">
                  {r.tested === true ? '✓' : r.tested === false ? '—' : '?'}
                </td>
                <td className={`px-3 py-3 text-right tabular-nums ${sortLift === 'sq' ? 'text-zinc-50 font-semibold' : 'text-zinc-300'}`}>{fmt(r.bestSqKg)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${sortLift === 'bp' ? 'text-zinc-50 font-semibold' : 'text-zinc-300'}`}>{fmt(r.bestBpKg)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${sortLift === 'dl' ? 'text-zinc-50 font-semibold' : 'text-zinc-300'}`}>{fmt(r.bestDlKg)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${sortLift === 'total' ? 'text-zinc-50 font-semibold' : 'text-zinc-300'}`}>{fmt(r.totalKg)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${sortLift === 'gl' ? 'text-zinc-50 font-semibold' : 'text-zinc-300'}`}>{fmtGl(r.glPoints)}</td>
                <td className="px-6 py-3 text-right text-zinc-500 tabular-nums">{r.meetDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 text-xs text-zinc-600 border-t border-zinc-800">
        Sorted by {LIFT_COL_LABEL[sortLift]} · top {rows.length}
      </div>
    </section>
  );
}

import type { MeetRow } from '@/lib/db/queries/lifter';

type Props = { meets: MeetRow[] };

function fmt(s: string | null) {
  if (s === null || s === '') return '—';
  return Number(s).toFixed(1);
}

function fmtGl(s: string | null) {
  if (s === null || s === '') return '—';
  return Number(s).toFixed(2);
}

function fmtPlace(p: number | null, flight: number | null) {
  if (p === null) return '—';
  if (flight === null) return String(p);
  return `${p} / ${flight}`;
}

export function MeetsTable({ meets }: Props) {
  if (meets.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8 text-zinc-500 text-sm">
        No meets recorded.
      </div>
    );
  }
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 px-6 pt-6">Meets</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-3">Date</th>
              <th className="text-left px-3 py-3">Meet</th>
              <th className="text-left px-3 py-3">Eq</th>
              <th className="text-left px-3 py-3">Class</th>
              <th className="text-right px-3 py-3">SQ</th>
              <th className="text-right px-3 py-3">BP</th>
              <th className="text-right px-3 py-3">DL</th>
              <th className="text-right px-3 py-3">Total</th>
              <th className="text-right px-3 py-3">GL</th>
              <th className="text-right px-6 py-3">Place</th>
            </tr>
          </thead>
          <tbody>
            {meets.map((m) => (
              <tr key={m.entryId} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-800/30">
                <td className="px-6 py-3 text-zinc-400 tabular-nums">{m.date}</td>
                <td className="px-3 py-3 text-zinc-100">{m.meetName}</td>
                <td className="px-3 py-3 text-zinc-400">{m.equipment}</td>
                <td className="px-3 py-3 text-zinc-400 tabular-nums">{m.weightClassKg}</td>
                <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">{fmt(m.bestSqKg)}</td>
                <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">{fmt(m.bestBpKg)}</td>
                <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">{fmt(m.bestDlKg)}</td>
                <td className="px-3 py-3 text-right text-zinc-50 font-semibold tabular-nums">{fmt(m.totalKg)}</td>
                <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">{fmtGl(m.glPoints)}</td>
                <td className="px-6 py-3 text-right text-zinc-400 tabular-nums">{fmtPlace(m.place, m.flightSize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

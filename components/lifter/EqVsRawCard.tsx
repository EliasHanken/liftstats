import type { LifterAggregates, MeetRow } from '@/lib/db/queries/lifter';

type Props = {
  agg: LifterAggregates;
  meets: MeetRow[];
};

const EQ_EQUIPMENTS = new Set(['Single', 'Multi', 'Wraps', 'Unlimited']);

function bestNumeric(values: (string | null)[]): number | null {
  const nums = values.filter((v): v is string => v !== null).map(Number).filter(Number.isFinite);
  return nums.length === 0 ? null : Math.max(...nums);
}

function fmt(n: number | null, suffix = ' kg') {
  return n === null ? '—' : `${n.toFixed(1)}${suffix}`;
}

export function EqVsRawCard({ agg, meets }: Props) {
  if (!agg.hasBothDisciplines) return null;

  const raw = meets.filter((m) => m.equipment === 'Raw');
  const eq = meets.filter((m) => EQ_EQUIPMENTS.has(m.equipment));

  const stats = (rows: MeetRow[]) => ({
    sq: bestNumeric(rows.map((r) => r.bestSqKg)),
    bp: bestNumeric(rows.map((r) => r.bestBpKg)),
    dl: bestNumeric(rows.map((r) => r.bestDlKg)),
    total: bestNumeric(rows.map((r) => r.totalKg)),
    gl: bestNumeric(rows.map((r) => r.glPoints)),
  });

  const r = stats(raw);
  const e = stats(eq);

  const Row = ({ label, rv, ev }: { label: string; rv: number | null; ev: number | null }) => {
    const diff = rv !== null && ev !== null ? ev - rv : null;
    return (
      <div className="grid grid-cols-3 items-center py-2 border-b border-zinc-900 last:border-0">
        <div className="text-zinc-50 tabular-nums">{fmt(rv)}</div>
        <div className="text-xs uppercase tracking-wider text-zinc-500 text-center">{label}</div>
        <div className="text-right">
          <span className="text-zinc-50 tabular-nums">{fmt(ev)}</span>
          {diff !== null && (
            <span className={`ml-2 text-xs ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <div className="grid grid-cols-3 mb-4 text-xs uppercase tracking-widest">
        <div className="text-zinc-400">Raw</div>
        <div className="text-zinc-500 text-center">·</div>
        <div className="text-zinc-400 text-right">Equipped</div>
      </div>
      <Row label="Squat" rv={r.sq} ev={e.sq} />
      <Row label="Bench" rv={r.bp} ev={e.bp} />
      <Row label="Deadlift" rv={r.dl} ev={e.dl} />
      <Row label="Total" rv={r.total} ev={e.total} />
      <Row label="GL" rv={r.gl} ev={e.gl} />
    </section>
  );
}

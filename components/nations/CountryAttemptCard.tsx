import type { CountryAttemptSuccess, LiftSuccess } from '@/lib/db/queries/attempts';

type Props = { data: CountryAttemptSuccess };

function pct(s: LiftSuccess): string {
  if (s.total === 0) return '—';
  return `${Math.round((s.good / s.total) * 100)}%`;
}

function Row({ label, s }: { label: string; s: LiftSuccess }) {
  return (
    <div className="grid grid-cols-3 items-baseline py-2 border-b border-zinc-900 last:border-0">
      <div className="text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="text-zinc-50 tabular-nums">{pct(s)}</div>
      <div className="text-right text-xs text-zinc-500 tabular-nums">{s.good} / {s.total}</div>
    </div>
  );
}

export function CountryAttemptCard({ data }: Props) {
  if (data.lifters === 0) return null;
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
        Attempt success
        <span className="ml-3 text-zinc-600 normal-case font-normal">
          {data.lifters} lifter{data.lifters === 1 ? '' : 's'} with attempt data
        </span>
      </h2>
      <Row label="Squat"    s={data.SQ} />
      <Row label="Bench"    s={data.BP} />
      <Row label="Deadlift" s={data.DL} />
    </section>
  );
}

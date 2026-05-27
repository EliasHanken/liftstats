import type { MeetRow } from '@/lib/db/queries/lifter';
import type { AttemptSuccess, LiftAttempts } from '@/lib/db/queries/attempts';

type Props = { meets: MeetRow[]; success: AttemptSuccess };

const LIFT_LABEL: Record<'SQ' | 'BP' | 'DL', string> = {
  SQ: 'Squat',
  BP: 'Bench',
  DL: 'Deadlift',
};

function pct(la: LiftAttempts['a1']): string {
  if (la.total === 0) return '—';
  return `${Math.round((la.good / la.total) * 100)}%`;
}

function LiftRow({ label, lift }: { label: string; lift: LiftAttempts }) {
  const total = lift.a1.total + lift.a2.total + lift.a3.total;
  return (
    <div className="grid grid-cols-5 items-baseline py-2 border-b border-zinc-900 last:border-0">
      <div className="text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <Cell la={lift.a1} />
      <Cell la={lift.a2} />
      <Cell la={lift.a3} />
      <div className="text-right text-xs text-zinc-500 tabular-nums">{total}</div>
    </div>
  );
}

function Cell({ la }: { la: LiftAttempts['a1'] }) {
  if (la.total === 0) return <div className="text-zinc-600 tabular-nums">—</div>;
  return (
    <div className="text-zinc-50 tabular-nums">
      {pct(la)}
      <span className="text-zinc-500 text-xs ml-1">{la.good}/{la.total}</span>
    </div>
  );
}

export function AttemptSuccessCard({ meets, success }: Props) {
  if (meets.length === 0) return null;

  if (success.meetCount === 0) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Attempt success</h2>
        <p className="text-sm text-zinc-400 mb-3">
          Attempt-level data (1st/2nd/3rd success rates) is sourced from{' '}
          <a className="text-cyan-400 hover:text-cyan-300" href="https://goodlift.info" target="_blank" rel="noopener">GoodLift</a>.
          We currently cover:
        </p>
        <ul className="text-sm text-zinc-400 list-disc pl-5 mb-3 space-y-1">
          <li>IPF World Championships (Open, Junior, Sub-Junior, Masters)</li>
          <li>European Powerlifting Federation Championships</li>
          <li>NSF (Norwegian) federation meets</li>
        </ul>
        <p className="text-sm text-zinc-500">
          This lifter hasn&apos;t competed at any of those — yet. Find lifters with attempt data via the{' '}
          <a className="text-cyan-400 hover:text-cyan-300" href="/rankings?fed=IPF">IPF rankings</a> or{' '}
          <a className="text-cyan-400 hover:text-cyan-300" href="/rankings?fed=NSF">NSF rankings</a>.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
        Attempt success
        <span className="ml-3 text-zinc-600 normal-case font-normal">
          across {success.meetCount} meet{success.meetCount === 1 ? '' : 's'}
        </span>
      </h2>
      <div className="grid grid-cols-5 mb-2 text-xs uppercase tracking-widest text-zinc-500">
        <div></div>
        <div>1st</div>
        <div>2nd</div>
        <div>3rd</div>
        <div className="text-right">Tot</div>
      </div>
      <LiftRow label={LIFT_LABEL.SQ} lift={success.SQ} />
      <LiftRow label={LIFT_LABEL.BP} lift={success.BP} />
      <LiftRow label={LIFT_LABEL.DL} lift={success.DL} />
      <p className="text-xs text-zinc-600 mt-3">
        Based only on meets with detailed attempt data ({success.meetCount} of {meets.length}).
      </p>
    </section>
  );
}

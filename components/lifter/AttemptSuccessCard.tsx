import type { MeetRow } from '@/lib/db/queries/lifter';

type Props = { meets: MeetRow[] };

export function AttemptSuccessCard({ meets }: Props) {
  const withAttempts = meets.filter((m) => m.hasAttempts);
  if (meets.length === 0) return null;

  if (withAttempts.length === 0) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Attempt success</h2>
        <p className="text-sm text-zinc-400">
          Attempt-level data is only available for IPF Worlds, Europeans, Junior versions, and Norwegian
          federation (NSF) meets. This lifter doesn&apos;t have any of those in our records yet.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Attempt success</h2>
      <p className="text-sm text-zinc-400">
        Detailed attempt data available for {withAttempts.length} of {meets.length} meets. Full breakdown
        coming in a later release.
      </p>
    </section>
  );
}

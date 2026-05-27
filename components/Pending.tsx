'use client';

type Props = { pending: boolean };

export function Pending({ pending }: Props) {
  if (!pending) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-end pr-4 pointer-events-none bg-zinc-950/40 backdrop-blur-[1px] rounded-md">
      <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>
    </div>
  );
}

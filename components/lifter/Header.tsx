import type { LifterRow, LifterAggregates } from '@/lib/db/queries/lifter';

type Props = {
  lifter: LifterRow;
  agg: LifterAggregates;
};

const SEX_LABEL: Record<LifterRow['sex'], string> = { M: 'Men', F: 'Women', Mx: 'Mx' };

function formatGl(s: string | null) {
  if (s === null) return '—';
  return Number(s).toFixed(2);
}

export function LifterHeader({ lifter, agg }: Props) {
  return (
    <header className="border-b border-zinc-800 pb-8 mb-8">
      <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
        {SEX_LABEL[lifter.sex]}
        {lifter.country ? ` · ${lifter.country}` : ''}
        {lifter.primaryFed ? ` · ${lifter.primaryFed}` : ''}
      </div>
      <h1 className="text-4xl md:text-5xl font-semibold text-zinc-50 mb-4">{lifter.name}</h1>
      <div className="flex flex-wrap gap-3 text-sm">
        {agg.bestRawGl !== null && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2">
            <div className="text-zinc-500 text-xs">Best Raw GL</div>
            <div className="text-zinc-50 text-lg font-semibold tabular-nums">{formatGl(agg.bestRawGl)}</div>
          </div>
        )}
        {agg.bestEqGl !== null && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2">
            <div className="text-zinc-500 text-xs">Best Equipped GL</div>
            <div className="text-zinc-50 text-lg font-semibold tabular-nums">{formatGl(agg.bestEqGl)}</div>
          </div>
        )}
        <div className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2">
          <div className="text-zinc-500 text-xs">Meets</div>
          <div className="text-zinc-50 text-lg font-semibold tabular-nums">{agg.totalMeets}</div>
        </div>
      </div>
    </header>
  );
}

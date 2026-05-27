import type { HeatmapCell } from '@/lib/db/queries/nations';

type Props = { cells: HeatmapCell[] };

const MEN_CLASSES   = ['53', '59', '66', '74', '83', '93', '105', '120', '120+'];
const WOMEN_CLASSES = ['43', '47', '52', '57', '63', '69', '76', '84', '84+'];
const EQUIPMENTS = ['Raw', 'Single', 'Multi', 'Wraps', 'Unlimited'] as const;

function normalizeClass(s: string): string {
  return s.replace(/^-/, '');
}

function cellCount(cells: HeatmapCell[], sex: 'M' | 'F', equipment: typeof EQUIPMENTS[number], cls: string): number {
  return cells
    .filter((c) => c.sex === sex && c.equipment === equipment && normalizeClass(c.weightClassKg) === cls)
    .reduce((sum, c) => sum + c.lifters, 0);
}

function intensity(count: number, max: number): string {
  if (count === 0) return 'bg-zinc-950 text-zinc-700';
  const r = count / max;
  if (r > 0.66) return 'bg-cyan-600/80 text-zinc-50';
  if (r > 0.33) return 'bg-cyan-700/60 text-zinc-100';
  if (r > 0.10) return 'bg-cyan-800/40 text-zinc-200';
  return 'bg-zinc-900 text-zinc-300';
}

function Grid({ title, sex, classes, cells }: { title: string; sex: 'M' | 'F'; classes: string[]; cells: HeatmapCell[] }) {
  const matrix: Record<string, Record<string, number>> = {};
  let max = 0;
  for (const eq of EQUIPMENTS) {
    matrix[eq] = {};
    for (const c of classes) {
      const n = cellCount(cells, sex, eq, c);
      matrix[eq][c] = n;
      if (n > max) max = n;
    }
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <h3 className="text-xs uppercase tracking-widest text-zinc-500 px-6 pt-4 mb-2">{title}</h3>
      <div className="overflow-x-auto px-6 pb-4">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="text-left text-zinc-500 pr-3 py-1">Eq \ Class</th>
              {classes.map((c) => (
                <th key={c} className="text-center text-zinc-500 px-2 py-1 tabular-nums">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EQUIPMENTS.map((eq) => (
              <tr key={eq}>
                <td className="text-zinc-400 pr-3 py-1">{eq}</td>
                {classes.map((c) => {
                  const n = matrix[eq][c];
                  return (
                    <td key={c} className={`px-2 py-1 text-center tabular-nums ${intensity(n, max)}`}>
                      {n === 0 ? '' : n}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WeightClassHeatmap({ cells }: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Weight class participation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Grid title="Men"   sex="M" classes={MEN_CLASSES}   cells={cells} />
        <Grid title="Women" sex="F" classes={WOMEN_CLASSES} cells={cells} />
      </div>
    </section>
  );
}

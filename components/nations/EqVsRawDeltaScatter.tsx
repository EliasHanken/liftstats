'use client';

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import type { EqRawDeltaRow } from '@/lib/db/queries/nations';

type Props = { rows: EqRawDeltaRow[] };

export function EqVsRawDeltaScatter({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8 text-zinc-500 text-sm">
        No lifters with both raw and equipped totals in this window.
      </div>
    );
  }
  const men   = rows.filter((r) => r.sex === 'M').map((r) => ({ x: Number(r.rawGl), y: Number(r.eqGl), name: r.name }));
  const women = rows.filter((r) => r.sex === 'F').map((r) => ({ x: Number(r.rawGl), y: Number(r.eqGl), name: r.name }));
  const all = [...men, ...women];
  const min = Math.min(50, ...all.map((p) => Math.min(p.x, p.y))) - 5;
  const max = Math.max(150, ...all.map((p) => Math.max(p.x, p.y))) + 5;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Equipped vs Raw GL</h2>
      <p className="text-xs text-zinc-600 mb-4">
        Points above the diagonal: lifter scored higher in equipped. Below: higher in raw.
      </p>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Raw GL" stroke="#71717a" fontSize={11} domain={[min, max]} />
            <YAxis type="number" dataKey="y" name="Equipped GL" stroke="#71717a" fontSize={11} domain={[min, max]} />
            <ZAxis range={[40, 40]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 6 }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#fafafa' }}
            />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 11 }} />
            <ReferenceLine segment={[{ x: min, y: min }, { x: max, y: max }]} stroke="#52525b" strokeDasharray="4 4" />
            <Scatter name="Men"   data={men}   fill="#22d3ee" />
            <Scatter name="Women" data={women} fill="#f472b6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

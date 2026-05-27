'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { GlBin } from '@/lib/db/queries/nations';

type Props = { bins: GlBin[] };

export function GlDistributionChart({ bins }: Props) {
  const firstNonZero = bins.findIndex((b) => b.mRaw + b.mEq + b.fRaw + b.fEq > 0);
  const lastNonZero  = bins.map((b, i) => ({ i, total: b.mRaw + b.mEq + b.fRaw + b.fEq }))
                           .reverse().find((x) => x.total > 0)?.i ?? -1;
  const data = firstNonZero === -1
    ? []
    : bins.slice(firstNonZero, lastNonZero + 1).map((b) => ({
        bin: `${b.low}-${b.high}`,
        mRaw: b.mRaw, mEq: b.mEq, fRaw: b.fRaw, fEq: b.fEq,
      }));

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8 text-zinc-500 text-sm">
        No GL data for this country.
      </div>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">GL distribution</h2>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="bin" stroke="#71717a" fontSize={11} />
            <YAxis stroke="#71717a" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 6 }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#fafafa' }}
            />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 11 }} />
            <Bar dataKey="mRaw" name="Men Raw"      stackId="m" fill="#22d3ee" />
            <Bar dataKey="mEq"  name="Men Equipped" stackId="m" fill="#a78bfa" />
            <Bar dataKey="fRaw" name="Women Raw"    stackId="f" fill="#f472b6" />
            <Bar dataKey="fEq"  name="Women Eq"     stackId="f" fill="#fb923c" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

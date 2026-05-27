'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { MeetRow } from '@/lib/db/queries/lifter';

type Props = { meets: MeetRow[] };

const EQ_EQUIPMENTS = new Set(['Single', 'Multi', 'Wraps', 'Unlimited']);

export function GlProgressionChart({ meets }: Props) {
  const data = meets
    .filter((m) => m.glPoints !== null)
    .map((m) => ({
      date: m.date,
      raw: m.equipment === 'Raw' ? Number(m.glPoints) : null,
      eq: EQ_EQUIPMENTS.has(m.equipment) ? Number(m.glPoints) : null,
      meet: m.meetName,
      place: m.place,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8 text-zinc-500 text-sm">
        No GL data recorded for this lifter.
      </div>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">GL Points over time</h2>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
            <YAxis stroke="#71717a" fontSize={11} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 6 }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#fafafa' }}
              formatter={(value: number) => value?.toFixed(2)}
            />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 11 }} />
            <Line type="monotone" dataKey="raw" name="Raw" stroke="#22d3ee" strokeWidth={2}
              dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="eq" name="Equipped" stroke="#a78bfa" strokeWidth={2}
              dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

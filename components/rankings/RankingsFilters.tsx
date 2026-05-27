'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Pending } from '@/components/Pending';

type Option = { value: string; label: string };

type Props = {
  weightClasses: string[];
  federations: string[];
  countries: string[];
};

const LIFTS: Option[] = [
  { value: 'gl',    label: 'GL Points' },
  { value: 'total', label: 'Total' },
  { value: 'sq',    label: 'Squat' },
  { value: 'bp',    label: 'Bench' },
  { value: 'dl',    label: 'Deadlift' },
];
const SEXES: Option[] = [
  { value: '',  label: 'Any sex' },
  { value: 'M', label: 'Men' },
  { value: 'F', label: 'Women' },
  { value: 'Mx',label: 'Mx' },
];
const EQUIPMENT: Option[] = [
  { value: '',          label: 'Any equipment' },
  { value: 'Raw',       label: 'Raw' },
  { value: 'Wraps',     label: 'Wraps' },
  { value: 'Single',    label: 'Single-ply' },
  { value: 'Multi',     label: 'Multi-ply' },
  { value: 'Unlimited', label: 'Unlimited' },
];
const TESTED: Option[] = [
  { value: '',      label: 'Any (tested or not)' },
  { value: 'true',  label: 'Drug-tested only' },
  { value: 'false', label: 'Untested' },
];
const DIVISIONS: Option[] = [
  { value: '',            label: 'Any division' },
  { value: 'Open',        label: 'Open' },
  { value: 'Sub-Juniors', label: 'Sub-Juniors' },
  { value: 'Juniors',     label: 'Juniors' },
  { value: 'Masters 1',   label: 'Masters 1' },
  { value: 'Masters 2',   label: 'Masters 2' },
  { value: 'Masters 3',   label: 'Masters 3' },
  { value: 'Masters 4',   label: 'Masters 4' },
];

export function RankingsFilters({ weightClasses, federations, countries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === '') next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function val(key: string, fallback = ''): string {
    return params.get(key) ?? fallback;
  }

  const selectCls =
    'bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500';

  return (
    <div className="relative">
      <Pending pending={isPending} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <Select label="Sort by"      value={val('lift', 'gl')}  onChange={(v) => update('lift', v === 'gl' ? '' : v)}    options={LIFTS}     cls={selectCls} />
      <Select label="Sex"          value={val('sex')}         onChange={(v) => update('sex', v)}                       options={SEXES}     cls={selectCls} />
      <Select label="Equipment"    value={val('eq', 'Raw')}   onChange={(v) => update('eq', v === 'Raw' ? '' : v)}     options={EQUIPMENT} cls={selectCls} />
      <Select label="Tested"       value={val('tested')}      onChange={(v) => update('tested', v)}                    options={TESTED}    cls={selectCls} />

      <Select label="Weight class" value={val('class')}       onChange={(v) => update('class', v)}                     options={[{ value: '', label: 'Any' }, ...weightClasses.map((w) => ({ value: w, label: w + ' kg' }))]}     cls={selectCls} />
      <Select label="Federation"   value={val('fed')}         onChange={(v) => update('fed', v)}                       options={[{ value: '', label: 'Any' }, ...federations.map((f) => ({ value: f, label: f }))]}                cls={selectCls} />
      <Select label="Country"      value={val('country')}     onChange={(v) => update('country', v)}                   options={[{ value: '', label: 'Any' }, ...countries.map((c) => ({ value: c, label: c }))]}                  cls={selectCls} />
      <Select label="Since year"   value={val('since')}       onChange={(v) => update('since', v)}                     options={[{ value: '', label: 'All time' }, ...[2020, 2018, 2015, 2010, 2000].map((y) => ({ value: String(y), label: `${y}+` }))]} cls={selectCls} />
      <Select label="Division"     value={val('division')}    onChange={(v) => update('division', v)}                  options={DIVISIONS}  cls={selectCls} />
      </div>
    </div>
  );
}

function Select({
  label, value, onChange, options, cls,
}: {
  label: string; value: string; onChange: (v: string) => void; options: Option[]; cls: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
      <select className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

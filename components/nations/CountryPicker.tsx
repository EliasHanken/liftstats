'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Pending } from '@/components/Pending';

type Props = { countries: { country: string; lifters: number }[] };

export function CountryPicker({ countries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: 'country' | 'country2' | 'age', value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === '') next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  const primary = params.get('country') ?? '';
  const secondary = params.get('country2') ?? '';

  const opts = [{ value: '', label: 'Pick a country…' }].concat(
    countries.map((c) => ({ value: c.country, label: `${c.country} · ${c.lifters.toLocaleString()} active` })),
  );

  const selectCls =
    'bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500';

  return (
    <div className="relative">
      <Pending pending={isPending} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Country</span>
          <select className={selectCls} value={primary} onChange={(e) => update('country', e.target.value)}>
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Compare with (optional)</span>
          <select className={selectCls} value={secondary} onChange={(e) => update('country2', e.target.value)}>
            <option value="">(none)</option>
            {countries
              .filter((c) => c.country !== primary)
              .map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country} · {c.lifters.toLocaleString()} active
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Age class</span>
          <select
            className={selectCls}
            value={params.get('age') ?? ''}
            onChange={(e) => update('age', e.target.value)}
          >
            <option value="">All ages</option>
            <option value="Sub-Junior">Sub-Junior</option>
            <option value="Junior">Junior</option>
            <option value="Open">Open</option>
            <option value="Masters 1">Masters 1</option>
            <option value="Masters 2">Masters 2</option>
            <option value="Masters 3">Masters 3</option>
            <option value="Masters 4">Masters 4</option>
          </select>
        </label>
      </div>
    </div>
  );
}

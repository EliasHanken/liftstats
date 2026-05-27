'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type Props = { countries: { country: string; lifters: number }[] };

export function CountryPicker({ countries }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: 'country' | 'country2', value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === '') next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  const primary = params.get('country') ?? '';
  const secondary = params.get('country2') ?? '';

  const opts = [{ value: '', label: 'Pick a country…' }].concat(
    countries.map((c) => ({ value: c.country, label: `${c.country} · ${c.lifters.toLocaleString()} active` })),
  );

  const selectCls =
    'bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
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
    </div>
  );
}

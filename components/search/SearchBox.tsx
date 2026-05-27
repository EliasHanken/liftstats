'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Hit = {
  slug: string;
  name: string;
  sex: 'M' | 'F' | 'Mx';
  country: string | null;
  primaryFed: string | null;
};

type Props = {
  initialQuery?: string;
  placeholder?: string;
  /** When the input is empty, render these as the suggestion list. */
  featured?: Hit[];
  /** Visual size variant. */
  size?: 'md' | 'lg';
};

export function SearchBox({ initialQuery = '', placeholder = 'Search lifters', featured = [], size = 'md' }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Debounced fetch when q changes.
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data: { hits: Hit[] } = await res.json();
        setHits(data.hits);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const showFeatured = q.trim().length === 0 && featured.length > 0;
  const list: Hit[] = showFeatured ? featured : hits;

  function commit(target?: Hit) {
    if (target) {
      router.push(`/lifter/${target.slug}`);
    } else if (q.trim().length > 0) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIdx((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(activeIdx >= 0 ? list[activeIdx] : undefined);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIdx(-1);
    }
  }

  const inputCls = size === 'lg'
    ? 'px-5 py-4 text-lg'
    : 'px-4 py-3 text-base';

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={isOpen && list.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIdx >= 0 ? `${listboxId}-${activeIdx}` : undefined}
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setIsOpen(true); setActiveIdx(-1); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 ${inputCls}`}
      />

      {isOpen && list.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl shadow-black/50"
        >
          {showFeatured && (
            <li className="px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
              Featured lifters
            </li>
          )}
          {list.map((h, i) => (
            <li
              key={h.slug}
              id={`${listboxId}-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); commit(h); }}
              className={`flex items-baseline gap-3 px-4 py-2.5 cursor-pointer ${
                i === activeIdx ? 'bg-zinc-800' : ''
              }`}
            >
              <span className="text-zinc-100 flex-1">{h.name}</span>
              <span className="text-xs text-zinc-500">
                {h.sex}{h.country ? ` · ${h.country}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {loading && q.trim().length > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">…</div>
      )}
    </div>
  );
}

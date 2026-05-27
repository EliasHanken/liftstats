import Link from 'next/link';
import { db } from '@/lib/db';
import { searchLifters, searchLiftersRelaxed, type SearchHit } from '@/lib/db/queries/search';
import { SearchBox } from '@/components/search/SearchBox';

export const dynamic = 'force-dynamic';

type Search = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Search) {
  const { q = '' } = await searchParams;
  const trimmed = q.trim();

  let hits: SearchHit[] = [];
  let didYouMean: SearchHit[] = [];

  if (trimmed.length > 0) {
    hits = await searchLifters(db, { q: trimmed, limit: 30 });
    if (hits.length === 0) {
      didYouMean = await searchLiftersRelaxed(db, { q: trimmed, limit: 5 });
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-6">Search lifters</h1>
        <div className="mb-8">
          <SearchBox initialQuery={q} placeholder="Lifter name (e.g. John Haack, Jesus Olivares)" />
        </div>

        {trimmed.length === 0 && (
          <p className="text-zinc-500 text-sm">Type a name above to search.</p>
        )}

        {trimmed.length > 0 && hits.length === 0 && didYouMean.length === 0 && (
          <p className="text-zinc-500 text-sm">No lifters match &ldquo;{q}&rdquo;.</p>
        )}

        {trimmed.length > 0 && hits.length === 0 && didYouMean.length > 0 && (
          <div className="text-zinc-500 text-sm mb-4">
            No exact matches for &ldquo;{q}&rdquo;. Did you mean:
          </div>
        )}

        <ul className="space-y-1">
          {(hits.length > 0 ? hits : didYouMean).map((h) => (
            <li key={h.slug}>
              <Link
                href={`/lifter/${h.slug}`}
                className="flex items-baseline gap-3 px-4 py-3 -mx-4 rounded-lg hover:bg-zinc-900"
              >
                <span className="text-zinc-50 flex-1">{h.name}</span>
                <span className="text-xs text-zinc-500">
                  {h.sex} {h.country ? `· ${h.country}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { db } from '@/lib/db';
import { searchLifters, type SearchHit } from '@/lib/db/queries/search';

export const dynamic = 'force-dynamic';

type Search = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Search) {
  const { q = '' } = await searchParams;
  const hits: SearchHit[] = q.trim().length === 0
    ? []
    : await searchLifters(db, { q, limit: 30 });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-6">Search lifters</h1>
        <form className="mb-8" action="/search">
          <input
            type="text"
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Lifter name (e.g. John Haack, Jesus Olivares)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
          />
        </form>

        {q.trim().length === 0 && (
          <p className="text-zinc-500 text-sm">Type a name above to search.</p>
        )}

        {q.trim().length > 0 && hits.length === 0 && (
          <p className="text-zinc-500 text-sm">No lifters match &ldquo;{q}&rdquo;.</p>
        )}

        <ul className="space-y-1">
          {hits.map((h) => (
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

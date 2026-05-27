import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchLifters } from '@/lib/db/queries/search';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length === 0) {
    return NextResponse.json({ hits: [] });
  }

  const hits = await searchLifters(db, { q, limit: 8 });
  // Strip the similarity score from the public response — the client doesn't need it.
  const trimmed = hits.map(({ slug, name, sex, country, primaryFed }) => ({
    slug, name, sex, country, primaryFed,
  }));

  return NextResponse.json(
    { hits: trimmed },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}

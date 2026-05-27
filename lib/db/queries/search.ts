import { sql } from 'drizzle-orm';

type AnyDb = any;

export type SearchHit = {
  slug: string;
  name: string;
  sex: 'M' | 'F' | 'Mx';
  country: string | null;
  primaryFed: string | null;
  similarity: number;
};

export type SearchArgs = {
  q: string;
  limit?: number;
};

export async function searchLifters(
  db: AnyDb,
  { q, limit = 20 }: SearchArgs,
): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (trimmed.length === 0) return [];

  // Use word_similarity so partial tokens (e.g. "haack", "olivers") match
  // individual words in multi-word names like "Jesus Olivares". The operator
  // <% uses word_similarity(query, name) > threshold.
  // Lower threshold for short queries so single-letter prefixes still match.
  const threshold = trimmed.length <= 4 ? 0.2 : 0.3;

  const rows = await db.execute(sql`
    SELECT slug, name, sex, country, primary_fed AS "primaryFed",
           word_similarity(${trimmed}, name) AS similarity
    FROM lifter
    WHERE word_similarity(${trimmed}, name) > ${threshold}
       OR name ILIKE ${'%' + trimmed + '%'}
    ORDER BY similarity DESC, name ASC
    LIMIT ${limit}
  `);

  // drizzle-orm/pglite returns { rows: [...] }; node-postgres returns the same.
  const list = (rows as any).rows ?? rows;
  return list as SearchHit[];
}

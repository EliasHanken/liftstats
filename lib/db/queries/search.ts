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

  // Strategy depends on whether the query is a single token or full-name-ish:
  //
  // - Single word (e.g. "haack", "olivers"): use word_similarity(query, name).
  //   This is asymmetric — it finds the best partial extent of the query inside
  //   the name. Great for surname-only searches against "Jesus Olivares" etc.
  //
  // - Multi-word (e.g. "John Hack", "John Haack"): use full-string similarity().
  //   word_similarity is misleading here because the "Jo" prefix in "John" can
  //   match the whole word "Jo" in unrelated names like "Ally Jo", outranking the
  //   actual target. similarity() compares the full trigram sets of both strings
  //   so "John Hack" properly dominates "John Haack" (~0.73) over "Ally Jo" (~0.07).
  //
  // ILIKE substring fallback catches the case where similarity is just under
  // threshold but the query is literally a substring of the name.
  const isMultiWord = /\s/.test(trimmed);
  const threshold = isMultiWord ? 0.2 : (trimmed.length <= 4 ? 0.2 : 0.3);

  const rows = await db.execute(sql`
    SELECT slug, name, sex, country, primary_fed AS "primaryFed",
           ${isMultiWord
             ? sql`similarity(name, ${trimmed})`
             : sql`word_similarity(${trimmed}, name)`} AS similarity
    FROM lifter
    WHERE ${isMultiWord
      ? sql`similarity(name, ${trimmed}) > ${threshold}`
      : sql`word_similarity(${trimmed}, name) > ${threshold}`}
       OR name ILIKE ${'%' + trimmed + '%'}
    ORDER BY similarity DESC, name ASC
    LIMIT ${limit}
  `);

  const list = (rows as any).rows ?? rows;
  return list as SearchHit[];
}

// Like searchLifters but with a much lower similarity threshold. Used as a
// "did you mean" fallback when the strict search returns zero results.
export async function searchLiftersRelaxed(
  db: AnyDb,
  { q, limit = 5 }: SearchArgs,
): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (trimmed.length === 0) return [];

  const rows = await db.execute(sql`
    SELECT slug, name, sex, country, primary_fed AS "primaryFed",
           word_similarity(${trimmed}, name) AS similarity
    FROM lifter
    WHERE word_similarity(${trimmed}, name) > 0.1
    ORDER BY similarity DESC, name ASC
    LIMIT ${limit}
  `);
  const list = (rows as any).rows ?? rows;
  return list as SearchHit[];
}

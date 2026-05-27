import { sql } from 'drizzle-orm';

type AnyDb = any;

const PINNED = ['IPF', 'EPF', 'NSF', 'IPL', 'WPC'];

export async function getFederationsForFilter(
  db: AnyDb,
  { limit = 30 }: { limit?: number } = {},
): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT federation AS f, COUNT(*) AS n
    FROM meet
    WHERE federation IS NOT NULL AND federation <> ''
    GROUP BY federation
    ORDER BY n DESC
  `);
  const rows = (result as any).rows ?? result;
  const allFeds: string[] = rows.map((r: any) => r.f);
  const present = new Set(allFeds);

  const pinned = PINNED.filter((f) => present.has(f));
  const rest = allFeds.filter((f) => !PINNED.includes(f));

  return [...pinned, ...rest].slice(0, limit);
}

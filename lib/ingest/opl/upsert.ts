import { sql } from 'drizzle-orm';
import { lifter, meet, entry } from '@/lib/db/schema';
import type { NormalizedRow } from './types';

// Drizzle's PgDatabase types are heavily generic; matching them precisely here
// doesn't add safety because the schema is already typed at the call site
// (lifter/meet/entry imports). `any` keeps the helpers usable with both
// neon-http (prod) and pglite (tests) without fighting type variance.
type AnyDb = any;

export async function upsertLifters(
  db: AnyDb,
  rows: NormalizedRow[],
): Promise<Map<string, number>> {
  const uniq = new Map<string, NormalizedRow['lifter']>();
  for (const r of rows) uniq.set(r.lifter.slug, r.lifter);
  const values = [...uniq.values()];
  if (values.length === 0) return new Map();

  const inserted = await db
    .insert(lifter)
    .values(values.map((l) => ({
      slug: l.slug,
      name: l.name,
      sex: l.sex,
      country: l.country,
    })))
    .onConflictDoUpdate({
      target: lifter.slug,
      set: {
        name: sql`excluded.name`,
        country: sql`excluded.country`,
      },
    })
    .returning({ id: lifter.id, slug: lifter.slug });

  const map = new Map<string, number>();
  for (const r of inserted) map.set(r.slug, r.id);
  return map;
}

export async function upsertMeets(
  db: AnyDb,
  rows: NormalizedRow[],
): Promise<Map<string, number>> {
  const uniq = new Map<string, NormalizedRow['meet']>();
  for (const r of rows) uniq.set(r.meet.sourceMeetId, r.meet);
  const values = [...uniq.values()];
  if (values.length === 0) return new Map();

  const inserted = await db
    .insert(meet)
    .values(values.map((m) => ({
      source: 'opl' as const,
      sourceMeetId: m.sourceMeetId,
      federation: m.federation,
      date: m.date,
      name: m.name,
      country: m.country,
      town: m.town,
    })))
    .onConflictDoUpdate({
      target: [meet.source, meet.sourceMeetId],
      set: {
        federation: sql`excluded.federation`,
        date: sql`excluded.date`,
        name: sql`excluded.name`,
        country: sql`excluded.country`,
        town: sql`excluded.town`,
      },
    })
    .returning({ id: meet.id, sourceMeetId: meet.sourceMeetId });

  const map = new Map<string, number>();
  for (const r of inserted) map.set(r.sourceMeetId, r.id);
  return map;
}

export async function upsertEntries(
  db: AnyDb,
  rows: NormalizedRow[],
  lifterIds: Map<string, number>,
  meetIds: Map<string, number>,
): Promise<number> {
  if (rows.length === 0) return 0;
  const values = rows
    .map((r) => {
      const lifterId = lifterIds.get(r.lifter.slug);
      const meetId = meetIds.get(r.meet.sourceMeetId);
      if (lifterId === undefined || meetId === undefined) return null;
      return {
        lifterId,
        meetId,
        equipment: r.entry.equipment,
        weightClassKg: r.entry.weightClassKg,
        bodyweightKg: r.entry.bodyweightKg,
        age: r.entry.age,
        ageClass: r.entry.ageClass,
        division: r.entry.division,
        bestSqKg: r.entry.bestSqKg,
        bestBpKg: r.entry.bestBpKg,
        bestDlKg: r.entry.bestDlKg,
        totalKg: r.entry.totalKg,
        place: r.entry.place,
        glPoints: r.entry.glPoints,
        wilks: r.entry.wilks,
        dots: r.entry.dots,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  if (values.length === 0) return 0;

  const inserted = await db
    .insert(entry)
    .values(values)
    .onConflictDoUpdate({
      target: [entry.lifterId, entry.meetId, entry.equipment, entry.weightClassKg],
      set: {
        bodyweightKg: sql`excluded.bodyweight_kg`,
        bestSqKg: sql`excluded.best_sq_kg`,
        bestBpKg: sql`excluded.best_bp_kg`,
        bestDlKg: sql`excluded.best_dl_kg`,
        totalKg: sql`excluded.total_kg`,
        place: sql`excluded.place`,
        glPoints: sql`excluded.gl_points`,
        wilks: sql`excluded.wilks`,
        dots: sql`excluded.dots`,
      },
    })
    .returning({ id: entry.id, xmax: sql<number>`xmax` });

  // Postgres trick: `xmax = 0` means a freshly inserted row; `xmax != 0` means it was updated.
  // pglite supports xmax too.
  return inserted.filter((r: any) => Number(r.xmax) === 0).length;
}

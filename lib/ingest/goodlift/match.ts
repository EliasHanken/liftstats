import { and, eq, sql } from 'drizzle-orm';
import { meet, entry } from '@/lib/db/schema';
import type { MeetListingRow } from './types';

type AnyDb = any;

const FED_MAP: { test: RegExp; oplCode: string }[] = [
  { test: /International Powerlifting Federation/i, oplCode: 'IPF' },
  { test: /European Powerlifting Federation/i,      oplCode: 'EPF' },
];

function oplFederationFor(goodliftFederation: string): string | null {
  const rule = FED_MAP.find((r) => r.test.test(goodliftFederation));
  return rule?.oplCode ?? null;
}

function normalizeMeetName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/championships?$/, 'championship');
}

export async function findMeetByListing(
  db: AnyDb,
  listing: MeetListingRow,
): Promise<{ id: number } | null> {
  const oplFed = oplFederationFor(listing.federation);
  if (!oplFed) return null;

  const target = normalizeMeetName(listing.name);

  const candidates = await db
    .select({ id: meet.id, name: meet.name, date: meet.date })
    .from(meet)
    .where(and(
      eq(meet.federation, oplFed),
      listing.date ? eq(meet.date, listing.date) : sql`true`,
    ));

  const match = candidates.find(
    (c: { name: string }) => normalizeMeetName(c.name) === target,
  );
  if (match) return { id: match.id };
  return null;
}

function normalizeClass(s: string): string {
  const t = s.replace(/\s/g, '').replace(/kg$/i, '');
  if (t.startsWith('-')) return t.slice(1);
  return t;
}

export async function findEntryForLifter(
  db: AnyDb,
  meetId: number,
  args: { weightClassKg: string; place: number | null },
): Promise<{ id: number } | null> {
  if (args.place === null) return null;
  const targetClass = normalizeClass(args.weightClassKg);

  const rows: { id: number; weightClassKg: string; place: number | null }[] = await db
    .select({ id: entry.id, weightClassKg: entry.weightClassKg, place: entry.place })
    .from(entry)
    .where(eq(entry.meetId, meetId));

  const matches = rows.filter(
    (r) => r.place === args.place && normalizeClass(r.weightClassKg) === targetClass,
  );
  if (matches.length === 0) return null;
  if (matches.length > 1) return null;
  return { id: matches[0].id };
}

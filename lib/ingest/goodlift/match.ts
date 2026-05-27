import { and, eq, gte, lte, sql } from 'drizzle-orm';
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

// Tokenize a meet name into a sorted set of meaningful words. This makes
// matching robust to differences in word order and gender qualifiers:
//   "World Open Equipped Powerlifting Championships"             (OPL)
// →  "championship equipped open powerlifting world"
//
//   "IPF World Men's Equipped Open Powerlifting Championships"    (GoodLift)
// →  "championship equipped open powerlifting world"   (same after dropping IPF + Men's)
//
// Words filtered out as noise:
//   - federation prefixes: IPF, EPF
//   - gender qualifiers: men, women, men's, women's, mens, womens
//   - common connectors: of, the, and, &, /
//   - the trailing 's' on championships is normalized to championship
function normalizeMeetName(s: string): string {
  const NOISE = new Set([
    'ipf', 'epf',
    'men', 'mens', 'women', 'womens',
    'of', 'the', 'and',
    'open',           // GoodLift inconsistently adds/omits "Open"
    'powerlifting',   // GoodLift omits "Powerlifting" in many names
  ]);
  return s
    .toLowerCase()
    // Normalize curly apostrophes to ASCII
    .replace(/['']/g, "'")
    // Drop leading ordinal edition prefixes like "48th", "7th", "1st", "3rd"
    .replace(/^\s*\d+(st|nd|rd|th)\b/, '')
    // "men's" / "women's" → "men" / "women" (then filtered as noise)
    .replace(/\b(men|women)'s\b/g, '$1')
    // Singularize / canonicalize specific terms
    .replace(/championships\b/g, 'championship')
    // sub-junior(s) and subjuniors → single token "subjunior"
    .replace(/sub-?juniors?\b/g, 'subjunior')
    .replace(/juniors\b/g, 'junior')
    // Non-alphanumeric → space, then collapse
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !NOISE.has(tok))
    .sort()
    .join(' ');
}

// Add/subtract `days` days from a YYYY-MM-DD string.
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function findMeetByListing(
  db: AnyDb,
  listing: MeetListingRow,
): Promise<{ id: number } | null> {
  const oplFed = oplFederationFor(listing.federation);
  if (!oplFed) return null;

  const target = normalizeMeetName(listing.name);

  // Pull candidates by federation, narrowed to a ±30-day window around the
  // listing date. The window is wide because OPL and GoodLift can disagree on
  // dates by a couple weeks (different conventions for multi-stage events,
  // OPL bulk-importing on the registration date vs the meet date, etc.).
  // 30 days is still narrow enough that the same-name annual championship in
  // year N doesn't collide with year N±1 (championships are >30 days apart).
  const conds: any[] = [eq(meet.federation, oplFed)];
  if (listing.date) {
    conds.push(gte(meet.date, shiftDate(listing.date, -30)));
    conds.push(lte(meet.date, shiftDate(listing.date, 30)));
  }
  const candidates: { id: number; name: string; date: string }[] = await db
    .select({ id: meet.id, name: meet.name, date: meet.date })
    .from(meet)
    .where(and(...conds));

  // Among candidates within the date window, find ones whose normalized name
  // matches. If multiple match, prefer the one with the smallest date delta.
  const matches = candidates.filter((c) => normalizeMeetName(c.name) === target);
  if (matches.length === 0) return null;
  if (matches.length === 1) return { id: matches[0].id };

  if (listing.date) {
    const targetTime = new Date(listing.date + 'T00:00:00Z').getTime();
    matches.sort((a, b) => {
      const aDate = typeof a.date === 'string' ? a.date : (a.date as unknown as Date).toISOString().slice(0, 10);
      const bDate = typeof b.date === 'string' ? b.date : (b.date as unknown as Date).toISOString().slice(0, 10);
      const da = Math.abs(new Date(aDate + 'T00:00:00Z').getTime() - targetTime);
      const db = Math.abs(new Date(bDate + 'T00:00:00Z').getTime() - targetTime);
      return da - db;
    });
  }
  return { id: matches[0].id };
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

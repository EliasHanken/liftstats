import { parseCompetitionListing } from './parse-listing';
import { parseCompetitionDetail } from './parse-detail';
import { isWhitelisted } from './whitelist';
import { findMeetByListing, findEntryForLifter } from './match';
import { upsertAttempts, markMeetHasAttempts } from './upsert';
import { meet } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type AnyDb = any;

export type GoodliftDeps = {
  db: AnyDb;
  fetcher: {
    fetchCompetitionsListing: (year: number) => Promise<string>;
    fetchCompetitionDetail: (cid: number) => Promise<string>;
  };
  years: number[];
  /** Skip meets we've already ingested. Default true. */
  skipDone?: boolean;
};

export type GoodliftRunResult = {
  meetsConsidered: number;
  meetsMatched: number;
  meetsSkipped: number;
  attemptsInserted: number;
  lifterMatchFailures: number;
};

export async function runGoodliftIngest(deps: GoodliftDeps): Promise<GoodliftRunResult> {
  const { db, fetcher, years, skipDone = true } = deps;
  let meetsConsidered = 0;
  let meetsMatched = 0;
  let meetsSkipped = 0;
  let attemptsInserted = 0;
  let lifterMatchFailures = 0;

  for (const year of years) {
    const listingHtml = await fetcher.fetchCompetitionsListing(year);
    const meets = parseCompetitionListing(listingHtml, year).filter(isWhitelisted);

    for (const listing of meets) {
      meetsConsidered++;
      const matched = await findMeetByListing(db, listing);
      if (!matched) continue;

      if (skipDone) {
        const existing = await db.select({ has: meet.hasAttempts }).from(meet).where(eq(meet.id, matched.id));
        if (existing[0]?.has) { meetsSkipped++; continue; }
      }
      meetsMatched++;

      const equipment: 'Raw' | 'Single' = /classic/i.test(listing.name) ? 'Raw' : 'Single';
      const detailHtml = await fetcher.fetchCompetitionDetail(listing.cid);
      const lifters = parseCompetitionDetail(detailHtml, { equipmentHint: equipment });

      for (const lifter of lifters) {
        const found = await findEntryForLifter(db, matched.id, {
          weightClassKg: lifter.weightClassKg,
          place: lifter.place,
        });
        if (!found) { lifterMatchFailures++; continue; }
        const n = await upsertAttempts(db, found.id, lifter.attempts);
        attemptsInserted += n;
      }

      await markMeetHasAttempts(db, matched.id);
    }
  }

  return { meetsConsidered, meetsMatched, meetsSkipped, attemptsInserted, lifterMatchFailures };
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { ingestRun } from '@/lib/db/schema';
import { runGoodliftIngest } from '@/lib/ingest/goodlift/runner';
import { GoodliftFetcher } from '@/lib/ingest/goodlift/fetcher';
import { eq } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [run] = await db
    .insert(ingestRun)
    .values({ source: 'goodlift', status: 'running' })
    .returning({ id: ingestRun.id });

  try {
    const fetcher = new GoodliftFetcher();
    const result = await runGoodliftIngest({ db, fetcher, years: YEARS, skipDone: true });

    await db.update(ingestRun)
      .set({
        status: 'ok',
        finishedAt: new Date(),
        rowsAdded: result.attemptsInserted,
        rowsUpdated: result.meetsMatched,
      })
      .where(eq(ingestRun.id, run.id));

    revalidateTag('lifters', {});

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    await db.update(ingestRun)
      .set({ status: 'error', finishedAt: new Date(), error: msg })
      .where(eq(ingestRun.id, run.id));
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
